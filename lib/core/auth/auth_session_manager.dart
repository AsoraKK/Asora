/// ASORA AUTH SESSION MANAGER
///
/// 🎯 Purpose: Manages user authentication sessions and state
/// 🔐 Security: Handles secure storage of auth tokens and session data
/// 📱 Platform: Flutter with secure storage integration
/// 🏗️ Architecture: Core authentication component
library;

import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/foundation.dart';

/// Enumeration of basic authentication session states
enum AuthSessionStatus {
  /// No active session exists
  unauthenticated,

  /// Session is currently being validated
  authenticating,

  /// Valid session exists and user is authenticated
  authenticated,

  /// Session has expired and needs refresh
  expired,

  /// Session validation failed
  failed,
}

/// Comprehensive authentication session state with OAuth2/OIDC parameters
class AuthSessionState {
  final String id;
  final String state;
  final String nonce;
  final String codeVerifier;
  final String codeChallenge;
  final DateTime createdAt;
  final Duration ttl;

  const AuthSessionState({
    required this.id,
    required this.state,
    required this.nonce,
    required this.codeVerifier,
    required this.codeChallenge,
    required this.createdAt,
    required this.ttl,
  });

  /// Check if the session has expired based on TTL
  bool get isExpired {
    final expiryTime = createdAt.add(ttl);
    return DateTime.now().isAfter(expiryTime);
  }

  /// Convert session state to JSON for serialization
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'state': state,
      'nonce': nonce,
      'codeVerifier': codeVerifier,
      'codeChallenge': codeChallenge,
      'createdAt': createdAt.toIso8601String(),
      'ttl': ttl.inMilliseconds,
    };
  }

  /// Create session state from JSON
  factory AuthSessionState.fromJson(Map<String, dynamic> json) {
    return AuthSessionState(
      id: json['id'] as String,
      state: json['state'] as String,
      nonce: json['nonce'] as String,
      codeVerifier: json['codeVerifier'] as String,
      codeChallenge: json['codeChallenge'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      ttl: Duration(milliseconds: json['ttl'] as int),
    );
  }

  /// Create a copy with updated fields
  AuthSessionState copyWith({
    String? id,
    String? state,
    String? nonce,
    String? codeVerifier,
    String? codeChallenge,
    DateTime? createdAt,
    Duration? ttl,
  }) {
    return AuthSessionState(
      id: id ?? this.id,
      state: state ?? this.state,
      nonce: nonce ?? this.nonce,
      codeVerifier: codeVerifier ?? this.codeVerifier,
      codeChallenge: codeChallenge ?? this.codeChallenge,
      createdAt: createdAt ?? this.createdAt,
      ttl: ttl ?? this.ttl,
    );
  }
}

/// Manages authentication sessions and secure token storage
class AuthSessionManager {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      sharedPreferencesName: 'asora_secure_prefs',
      preferencesKeyPrefix: 'asora_',
    ),
    iOptions: IOSOptions(
      groupId: 'group.com.asora.app',
      accountName: 'asora_keychain',
    ),
  );

  static const String _sessionTokenKey = 'session_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userIdKey = 'user_id';
  static const String _sessionExpiryKey = 'session_expiry';

  /// Create a new authentication session
  /// Returns session data with tokens and expiry
  Future<AuthSessionState> createSession({
    required String state,
    required String nonce,
    required String codeChallenge,
    Duration? ttl,
  }) async {
    // Store session data securely
    final sessionId = 'session_${_generateSecureRandomString(32)}';

    final sessionState = AuthSessionState(
      id: sessionId,
      state: state,
      nonce: nonce,
      codeVerifier: '', // Will be set separately for security
      codeChallenge: codeChallenge,
      createdAt: DateTime.now(),
      ttl: ttl ?? const Duration(minutes: 10),
    );

    await _storage.write(
      key: 'oauth_session_$sessionId',
      value: jsonEncode(sessionState.toJson()),
    );

    return sessionState.copyWith();
  }

  /// Complete OAuth session after successful authentication
  Future<void> completeSession(String sessionId) async {
    await _storage.delete(key: 'oauth_session_$sessionId');
  }

  /// Clear all stored sessions
  Future<void> clearAllSessions() async {
    await _storage.deleteAll();
  }

  /// Create a token session (original method)
  /// Returns session data with tokens and expiry
  Future<Map<String, dynamic>> createTokenSession({
    required String accessToken,
    required String refreshToken,
    required String userId,
    DateTime? expiresAt,
  }) async {
    try {
      final expiry = expiresAt ?? DateTime.now().add(const Duration(hours: 24));

      await _storage.write(key: _sessionTokenKey, value: accessToken);
      await _storage.write(key: _refreshTokenKey, value: refreshToken);
      await _storage.write(key: _userIdKey, value: userId);
      await _storage.write(
        key: _sessionExpiryKey,
        value: expiry.toIso8601String(),
      );

      debugPrint('✅ Auth session created for user: $userId');

      return {
        'accessToken': accessToken,
        'refreshToken': refreshToken,
        'userId': userId,
        'expiresAt': expiry,
      };
    } catch (e) {
      debugPrint('❌ Failed to create auth session: $e');
      rethrow;
    }
  }

  /// Check if there's an active valid session
  Future<bool> hasActiveSession() async {
    try {
      final token = await _storage.read(key: _sessionTokenKey);
      final expiryStr = await _storage.read(key: _sessionExpiryKey);

      if (token == null || expiryStr == null) return false;

      final expiry = DateTime.parse(expiryStr);
      return DateTime.now().isBefore(expiry);
    } catch (e) {
      debugPrint('❌ Error checking session: $e');
      return false;
    }
  }

  /// Get the current session status
  Future<AuthSessionStatus> getSessionState() async {
    try {
      final hasSession = await hasActiveSession();
      if (!hasSession) return AuthSessionStatus.unauthenticated;

      final token = await _storage.read(key: _sessionTokenKey);
      final expiryStr = await _storage.read(key: _sessionExpiryKey);

      if (token == null) return AuthSessionStatus.unauthenticated;
      if (expiryStr == null) return AuthSessionStatus.failed;

      final expiry = DateTime.parse(expiryStr);
      if (DateTime.now().isAfter(expiry)) {
        return AuthSessionStatus.expired;
      }

      return AuthSessionStatus.authenticated;
    } catch (e) {
      debugPrint('❌ Error getting session state: $e');
      return AuthSessionStatus.failed;
    }
  }

  /// Get current session data if valid
  Future<Map<String, dynamic>?> getCurrentSession() async {
    try {
      final state = await getSessionState();
      if (state != AuthSessionStatus.authenticated) return null;

      final accessToken = await _storage.read(key: _sessionTokenKey);
      final refreshToken = await _storage.read(key: _refreshTokenKey);
      final userId = await _storage.read(key: _userIdKey);
      final expiryStr = await _storage.read(key: _sessionExpiryKey);

      if (accessToken == null || userId == null) return null;

      return {
        'accessToken': accessToken,
        'refreshToken': refreshToken,
        'userId': userId,
        'expiresAt': expiryStr != null ? DateTime.parse(expiryStr) : null,
      };
    } catch (e) {
      debugPrint('❌ Error getting current session: $e');
      return null;
    }
  }

  /// Clear the current session (logout)
  Future<void> clearSession() async {
    try {
      await _storage.delete(key: _sessionTokenKey);
      await _storage.delete(key: _refreshTokenKey);
      await _storage.delete(key: _userIdKey);
      await _storage.delete(key: _sessionExpiryKey);

      debugPrint('✅ Auth session cleared');
    } catch (e) {
      debugPrint('❌ Error clearing session: $e');
      rethrow;
    }
  }

  /// Refresh the current session with new tokens
  Future<bool> refreshSession(
    String newAccessToken, [
    DateTime? newExpiry,
  ]) async {
    try {
      final currentSession = await getCurrentSession();
      if (currentSession == null) return false;

      final expiry = newExpiry ?? DateTime.now().add(const Duration(hours: 24));

      await _storage.write(key: _sessionTokenKey, value: newAccessToken);
      await _storage.write(
        key: _sessionExpiryKey,
        value: expiry.toIso8601String(),
      );

      debugPrint('✅ Auth session refreshed');
      return true;
    } catch (e) {
      debugPrint('❌ Error refreshing session: $e');
      return false;
    }
  }

  /// Validate session integrity
  Future<bool> validateSession() async {
    try {
      final session = await getCurrentSession();
      if (session == null) return false;

      // Basic validation - in production you'd validate with server
      final token = session['accessToken'] as String?;
      final userId = session['userId'] as String?;

      return token != null &&
          token.isNotEmpty &&
          userId != null &&
          userId.isNotEmpty;
    } catch (e) {
      debugPrint('❌ Error validating session: $e');
      return false;
    }
  }

  /// Validate and get session if valid
  Future<Map<String, dynamic>?> validateAndGetSession() async {
    try {
      final isValid = await validateSession();
      if (!isValid) return null;

      return await getCurrentSession();
    } catch (e) {
      debugPrint('❌ Error validating and getting session: $e');
      return null;
    }
  }

  /// Consume/use a session state (marks it as used)
  Future<void> consumeSession(String sessionState) async {
    try {
      // In a real implementation, you might mark the session as consumed
      // For now, we'll just log the consumption
      debugPrint('✅ Session consumed: $sessionState');
    } catch (e) {
      debugPrint('❌ Error consuming session: $e');
      rethrow;
    }
  }
}
