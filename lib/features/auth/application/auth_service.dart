// lib/features/auth/application/auth_service.dart
import 'dart:async';
import 'dart:convert';
import 'dart:developer' as dev;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import 'package:http/http.dart' as http;
import 'package:meta/meta.dart';

import '../domain/auth_failure.dart';
import '../domain/user.dart';
import 'oauth2_service.dart';

GoogleSignIn _buildGoogleSignIn() {
  // Provide fallback values for client IDs to avoid null issues
  const webClientId = String.fromEnvironment(
    'GOOGLE_WEB_CLIENT_ID',
    defaultValue: 'web-client-id-not-set',
  );
  const androidClientId = String.fromEnvironment(
    'GOOGLE_ANDROID_CLIENT_ID',
    defaultValue: 'android-client-id-not-set',
  );
  const desktopClientId = String.fromEnvironment(
    'GOOGLE_DESKTOP_CLIENT_ID',
    defaultValue: 'desktop-client-id-not-set',
  );

  if (kIsWeb) {
    return GoogleSignIn(
      clientId: webClientId,
      scopes: ['email', 'profile', 'openid'],
    );
  }
  switch (defaultTargetPlatform) {
    case TargetPlatform.android:
      return GoogleSignIn(
        clientId: androidClientId,
        serverClientId: webClientId,
        scopes: ['email', 'profile', 'openid'],
      );
    case TargetPlatform.macOS:
    case TargetPlatform.linux:
    case TargetPlatform.windows:
      return GoogleSignIn(
        clientId: desktopClientId,
        serverClientId: webClientId,
        scopes: ['email', 'profile', 'openid'],
      );
    default:
      dev.log('Unsupported platform: $defaultTargetPlatform', name: 'auth');
      throw UnsupportedError('Unsupported platform');
  }
}

@visibleForTesting
GoogleSignIn buildGoogleSignInForTest() => _buildGoogleSignIn();

class AuthService {
  AuthService({
    GoogleSignIn? googleSignIn,
    FlutterSecureStorage? secureStorage,
    LocalAuthentication? localAuth,
    http.Client? httpClient,
    OAuth2Service? oauth2Service,
    String authUrl = _defaultAuthUrl,
  }) : _googleSignIn = googleSignIn ?? _buildGoogleSignIn(),
       _secureStorage = secureStorage ?? const FlutterSecureStorage(),
       _localAuth = localAuth ?? LocalAuthentication(),
       _httpClient = httpClient ?? http.Client(),
       _oauth2Service = oauth2Service ?? OAuth2Service(),
       _authUrl = authUrl;

  final GoogleSignIn _googleSignIn;
  final FlutterSecureStorage _secureStorage;
  final LocalAuthentication _localAuth;
  final http.Client _httpClient;
  final OAuth2Service _oauth2Service;
  final String _authUrl;

  static const _sessionKey = 'sessionToken';
  static const _jwtKey = 'jwt';
  static const _userKey = 'userData';
  static const _defaultAuthUrl = String.fromEnvironment('AUTH_URL');

  /// Email login with comprehensive error handling
  Future<User> loginWithEmail(String email, String password) async {
    if (email.trim().isEmpty) {
      throw AuthFailure.invalidCredentials('Email cannot be empty');
    }
    if (password.trim().isEmpty) {
      throw AuthFailure.invalidCredentials('Password cannot be empty');
    }

    try {
      dev.log(
        'Attempting email login for: ${email.replaceAll(RegExp(r'(?<=.).(?=.*@)'), '*')}',
        name: 'auth',
      );

      final response = await _httpClient.post(
        Uri.parse('$_authUrl/authEmail'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email.trim(), 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;

        // Extract JWT token
        final token = data['token'] as String?;
        if (token == null) {
          throw AuthFailure.serverError('Invalid response: missing token');
        }

        // Extract user data
        final userData = data['user'] as Map<String, dynamic>?;
        if (userData == null) {
          throw AuthFailure.serverError('Invalid response: missing user data');
        }

        // Create User object
        final user = User.fromJson(userData);

        // Store authentication data securely
        await Future.wait([
          _secureStorage.write(key: _jwtKey, value: token),
          _secureStorage.write(key: _userKey, value: jsonEncode(userData)),
        ]);

        dev.log('Email login successful for user: ${user.id}', name: 'auth');
        return user;
      } else if (response.statusCode == 401) {
        final errorData = response.body.isNotEmpty
            ? jsonDecode(response.body) as Map<String, dynamic>
            : <String, dynamic>{};
        final errorMessage =
            errorData['error'] as String? ?? 'Invalid credentials';
        throw AuthFailure.invalidCredentials(errorMessage);
      } else if (response.statusCode >= 500) {
        throw AuthFailure.serverError('Server error: ${response.statusCode}');
      } else {
        final errorData = response.body.isNotEmpty
            ? jsonDecode(response.body) as Map<String, dynamic>
            : <String, dynamic>{};
        final errorMessage = errorData['error'] as String? ?? 'Login failed';
        throw AuthFailure.serverError(errorMessage);
      }
    } on AuthFailure {
      rethrow;
    } catch (e, st) {
      dev.log(
        'Email login failed: $e',
        name: 'auth',
        error: e,
        stackTrace: st,
        level: 1000,
      );
      throw AuthFailure.serverError('Network error: ${e.toString()}');
    }
  }

  /// Get current authenticated user
  Future<User?> getCurrentUser() async {
    try {
      // Check if we have stored user data
      final userDataJson = await _secureStorage.read(key: _userKey);
      final token = await _secureStorage.read(key: _jwtKey);

      if (userDataJson == null || token == null) {
        dev.log('No stored user data found', name: 'auth');
        return null;
      }

      // Parse stored user data
      final userData = jsonDecode(userDataJson) as Map<String, dynamic>;
      final user = User.fromJson(userData);

      // Verify token is still valid by making a request to the backend
      try {
        final response = await _httpClient.get(
          Uri.parse('$_authUrl/getMe'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        );

        if (response.statusCode == 200) {
          // Update stored user data with fresh data from server
          final freshData = jsonDecode(response.body) as Map<String, dynamic>;
          final freshUser = User.fromJson(
            freshData['user'] as Map<String, dynamic>,
          );

          await _secureStorage.write(
            key: _userKey,
            value: jsonEncode(freshUser.toJson()),
          );

          dev.log('Retrieved current user: ${freshUser.id}', name: 'auth');
          return freshUser;
        } else if (response.statusCode == 401) {
          // Token is invalid, clear stored data
          await logout();
          dev.log('Token expired, user logged out', name: 'auth');
          return null;
        } else {
          // Server error, return cached user data
          dev.log(
            'Server error getting current user, using cached data',
            name: 'auth',
          );
          return user;
        }
      } catch (e) {
        // Network error, return cached user data
        dev.log(
          'Network error getting current user, using cached data: $e',
          name: 'auth',
        );
        return user;
      }
    } catch (e, st) {
      dev.log(
        'Error getting current user: $e',
        name: 'auth',
        error: e,
        stackTrace: st,
        level: 1000,
      );
      return null;
    }
  }

  /// Logout user and clear all stored data
  Future<void> logout() async {
    // Ensure none of the individual logout steps can throw synchronously
    // or bubble up errors. We want logout() to be safe to call regardless of
    // storage or platform failures (tests rely on this behaviour).
    Future<void> safeRun(FutureOr<dynamic> Function() fn) async {
      try {
        final res = fn();
        if (res is Future) await res;
      } catch (e, st) {
        dev.log(
          'Ignored logout error: $e',
          name: 'auth',
          error: e,
          stackTrace: st,
        );
      }
    }

    dev.log('Logging out user', name: 'auth');

    await Future.wait([
      safeRun(() => _secureStorage.delete(key: _jwtKey)),
      safeRun(() => _secureStorage.delete(key: _userKey)),
      safeRun(() => _secureStorage.delete(key: _sessionKey)),
      safeRun(() => _googleSignIn.signOut()),
      safeRun(() => _oauth2Service.signOut()),
    ]);

    dev.log('User logged out (best-effort) completed', name: 'auth');
  }

  /// Check if user is currently authenticated
  Future<bool> isAuthenticated() async {
    try {
      final token = await _secureStorage.read(key: _jwtKey);
      return token != null;
    } catch (e) {
      dev.log('Error checking authentication status: $e', name: 'auth');
      return false;
    }
  }

  /// Get stored JWT token
  Future<String?> getJwtToken() async {
    try {
      return await _secureStorage.read(key: _jwtKey);
    } catch (e) {
      dev.log('Error getting JWT token: $e', name: 'auth');
      return null;
    }
  }

  // Existing methods...
  Future<String> signInWithGoogle() async {
    try {
      final account = await _googleSignIn.signIn();
      if (account == null) throw AuthFailure.cancelledByUser();
      final auth = await account.authentication;
      final idToken = auth.idToken;
      assert(idToken != null, 'Google returned a null idToken');
      final sessionToken = await verifyTokenWithBackend(idToken!);
      dev.log('Google sign-in succeeded', name: 'auth');
      return sessionToken;
    } catch (e, st) {
      dev.log(
        'Google sign-in failed: $e',
        name: 'auth',
        error: e,
        stackTrace: st,
        level: 1000,
      );
      throw AuthFailure.serverError(e.toString());
    }
  }

  Future<String> verifyTokenWithBackend(String idToken) async {
    try {
      final response = await _httpClient.post(
        Uri.parse(_authUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'token': idToken}),
      );

      if (response.statusCode != 200) {
        final error = response.body.isNotEmpty
            ? jsonDecode(response.body)['error'] ?? 'Server error'
            : 'Server error';
        throw AuthFailure.serverError(error.toString());
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final token = data['sessionToken'] as String?;
      if (token == null) throw AuthFailure.serverError('Invalid response');
      await _secureStorage.write(key: _sessionKey, value: token);
      return token;
    } catch (e) {
      if (e is AuthFailure) rethrow;
      throw AuthFailure.serverError(e.toString());
    }
  }

  Future<String?> getSessionToken() => _secureStorage.read(key: _sessionKey);

  Future<void> clearSessionToken() => _secureStorage.delete(key: _sessionKey);

  Future<bool> authenticateWithBiometrics() async {
    final canCheck = await _localAuth.canCheckBiometrics;
    if (!canCheck) return false;
    return _localAuth.authenticate(
      localizedReason: 'Please authenticate to continue',
      options: const AuthenticationOptions(biometricOnly: true),
    );
  }

  Future<void> signOut() async {
    await logout(); // Use the comprehensive logout method
  }

  // OAuth2 Authentication Methods

  /// Sign in using OAuth2 PKCE flow
  Future<User> signInWithOAuth2() async {
    try {
      dev.log('Starting OAuth2 sign-in', name: 'auth');

      final user = await _oauth2Service.signInWithOAuth2();

      // Get fresh token from OAuth2Service secure storage
      final token = await _oauth2Service.getAccessToken();
      if (token != null) {
        await _secureStorage.write(key: _jwtKey, value: token);
      }

      // Store user data
      await _secureStorage.write(
        key: _userKey,
        value: jsonEncode(user.toJson()),
      );

      dev.log('OAuth2 sign-in successful: ${user.id}', name: 'auth');
      return user;
    } catch (e, st) {
      dev.log(
        'OAuth2 sign-in failed: $e',
        name: 'auth',
        error: e,
        stackTrace: st,
        level: 1000,
      );
      if (e is AuthFailure) rethrow;
      throw AuthFailure.serverError('OAuth2 sign-in failed: ${e.toString()}');
    }
  }

  /// Refresh OAuth2 access token
  Future<void> refreshOAuth2Token() async {
    try {
      dev.log('Refreshing OAuth2 token', name: 'auth');

      final user = await _oauth2Service.refreshToken();
      if (user == null) {
        throw AuthFailure.invalidCredentials('Token refresh failed');
      }

      // Get fresh token from OAuth2Service
      final token = await _oauth2Service.getAccessToken();
      if (token != null) {
        await _secureStorage.write(key: _jwtKey, value: token);
      }

      // Update stored user data
      await _secureStorage.write(
        key: _userKey,
        value: jsonEncode(user.toJson()),
      );

      dev.log('OAuth2 token refreshed successfully', name: 'auth');
    } catch (e, st) {
      dev.log(
        'OAuth2 token refresh failed: $e',
        name: 'auth',
        error: e,
        stackTrace: st,
        level: 1000,
      );

      // If refresh fails, sign out user
      await logout();

      if (e is AuthFailure) rethrow;
      throw AuthFailure.serverError('Token refresh failed: ${e.toString()}');
    }
  }

  /// Check if current OAuth2 token is valid and refresh if needed
  Future<bool> validateAndRefreshToken() async {
    try {
      final token = await _secureStorage.read(key: _jwtKey);
      if (token == null) return false;

      // Check if token is valid by making a request
      final response = await _httpClient.get(
        Uri.parse('$_authUrl/userinfo'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        return true; // Token is still valid
      } else if (response.statusCode == 401) {
        // Token expired, try to refresh
        try {
          await refreshOAuth2Token();
          return true;
        } catch (e) {
          dev.log('Token refresh failed: $e', name: 'auth');
          return false;
        }
      } else {
        return false;
      }
    } catch (e) {
      dev.log('Token validation failed: $e', name: 'auth');
      return false;
    }
  }
}

final authServiceProvider = Provider<AuthService>((_) => AuthService());
