// ignore_for_file: public_member_api_docs

// lib/features/auth/application/auth_service.dart
import 'dart:async';
import 'dart:convert';
import 'dart:developer' as dev;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import 'package:http/http.dart' as http;

import 'package:asora/features/auth/domain/auth_failure.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/application/web_auth_service.dart';
import 'package:asora/core/config/web_release_guard.dart';

class AuthService {
  AuthService({
    FlutterSecureStorage? secureStorage,
    LocalAuthentication? localAuth,
    http.Client? httpClient,
    OAuth2Service? oauth2Service,
    String authUrl = _defaultAuthUrl,
  }) : _secureStorage = secureStorage ?? const FlutterSecureStorage(),
       _localAuth = localAuth ?? LocalAuthentication(),
       _httpClient = httpClient ?? http.Client(),
       _oauth2Service = oauth2Service ?? OAuth2Service(),
       _authUrl = isReleaseWebBuild
           ? requirePublicHttpsOrigin('AUTH_URL', authUrl).toString()
           : authUrl;
  final FlutterSecureStorage _secureStorage;
  final LocalAuthentication _localAuth;
  final http.Client _httpClient;
  final OAuth2Service _oauth2Service;
  final String _authUrl;

  static const _jwtKey = 'jwt';
  static const _refreshTokenKey = 'refreshToken';
  static const _userKey = 'userData';
  static const _defaultAuthUrl = String.fromEnvironment('AUTH_URL');

  /// Sign in with the Lythaus MVP email/password endpoint.
  Future<User> loginWithEmail(String email, String password) async {
    if (email.trim().isEmpty) {
      throw AuthFailure.invalidCredentials('Email cannot be empty');
    }
    if (password.trim().isEmpty) {
      throw AuthFailure.invalidCredentials('Password cannot be empty');
    }

    try {
      final response = await _httpClient.post(
        Uri.parse('$_authUrl/auth/email/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email.trim(), 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final accessToken = data['access_token'] as String?;
        final refreshToken = data['refresh_token'] as String?;
        final expiresIn = data['expires_in'] as int? ?? 900;
        final userData = data['user'] as Map<String, dynamic>?;
        if (accessToken == null || refreshToken == null || userData == null) {
          throw AuthFailure.serverError('Sign-in response was incomplete');
        }
        final user = User.fromJson(userData);
        if (kIsWeb) {
          WebAuthService().storeDirectSession(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: expiresIn,
            user: user,
          );
        } else {
          await Future.wait([
            _secureStorage.write(key: _jwtKey, value: accessToken),
            _secureStorage.write(key: _refreshTokenKey, value: refreshToken),
            _secureStorage.write(key: _userKey, value: jsonEncode(userData)),
          ]);
        }
        return user;
      } else if (response.statusCode == 401) {
        throw AuthFailure.invalidCredentials('Email or password is incorrect');
      } else if (response.statusCode == 403) {
        throw AuthFailure.invalidCredentials(
          'Verify your email before signing in',
        );
      } else if (response.statusCode >= 500) {
        throw AuthFailure.serverError(
          'Email sign-in is temporarily unavailable',
        );
      } else {
        throw AuthFailure.invalidCredentials('Email or password is incorrect');
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
      throw AuthFailure.networkError('Unable to reach Lythaus authentication');
    }
  }

  Future<void> registerWithEmail(String email, String password) async {
    await _postEmailOperation('register', {
      'email': email.trim(),
      'password': password,
    });
  }

  Future<void> resendEmailVerification(String email) async {
    await _postEmailOperation('resend', {'email': email.trim()});
  }

  Future<void> requestPasswordReset(String email) async {
    await _postEmailOperation('forgot-password', {'email': email.trim()});
  }

  Future<void> verifyEmailToken(String token) async {
    await _postEmailOperation('verify', {'token': token});
  }

  Future<void> resetEmailPassword(String token, String newPassword) async {
    await _postEmailOperation('reset-password', {
      'token': token,
      'new_password': newPassword,
    });
  }

  Future<void> _postEmailOperation(
    String operation,
    Map<String, String> body,
  ) async {
    try {
      final response = await _httpClient.post(
        Uri.parse('$_authUrl/auth/email/$operation'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthFailure.serverError(
          response.statusCode >= 500
              ? 'Email authentication is temporarily unavailable'
              : 'The request could not be completed',
        );
      }
    } on AuthFailure {
      rethrow;
    } catch (_) {
      throw AuthFailure.networkError('Unable to reach Lythaus authentication');
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
      safeRun(() => _secureStorage.delete(key: _refreshTokenKey)),
      safeRun(() => _secureStorage.delete(key: _userKey)),
      if (kIsWeb) safeRun(() async => WebAuthService().signOut()),
      // Social provider sign-out is handled via the OAuth2 end-session flow.
      // No direct google_sign_in SDK call is used.
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

  /// Sign in with Google through the OAuth2 provider flow.
  ///
  /// This method initiates an OAuth2/OIDC flow with Google as the identity
  /// provider. The user sees "Continue with Google" and receives a token from
  /// the Lythaus auth server.
  ///
  /// Note: Google is not called directly via the google_sign_in SDK. This keeps
  /// the trust boundary inside the auth server and token exchange flow.
  Future<User> signInWithGoogle() async {
    try {
      dev.log('Starting B2C sign-in (Google IdP)', name: 'auth');

      // Use the OAuth2/OIDC flow that routes through the auth server
      // and returns a Lythaus-issued token.
      final user = await signInWithOAuth2(provider: OAuth2Provider.google);

      dev.log('B2C sign-in succeeded (Google IdP): ${user.id}', name: 'auth');
      return user;
    } catch (e, st) {
      dev.log(
        'B2C sign-in failed (Google IdP): $e',
        name: 'auth',
        error: e,
        stackTrace: st,
        level: 1000,
      );
      if (e is AuthFailure) rethrow;
      throw AuthFailure.serverError('B2C sign-in failed: ${e.toString()}');
    }
  }

  Future<User> signInWithApple() async {
    try {
      dev.log('Starting B2C sign-in (Apple IdP)', name: 'auth');
      return await signInWithOAuth2(provider: OAuth2Provider.apple);
    } catch (e, st) {
      dev.log(
        'B2C sign-in failed (Apple IdP): $e',
        name: 'auth',
        error: e,
        stackTrace: st,
        level: 1000,
      );
      if (e is AuthFailure) rethrow;
      throw AuthFailure.serverError(
        'B2C Apple sign-in failed: ${e.toString()}',
      );
    }
  }

  Future<User> signInWithWorld() async {
    try {
      dev.log('Starting B2C sign-in (World IdP)', name: 'auth');
      return await signInWithOAuth2(provider: OAuth2Provider.world);
    } catch (e, st) {
      dev.log(
        'B2C sign-in failed (World IdP): $e',
        name: 'auth',
        error: e,
        stackTrace: st,
        level: 1000,
      );
      if (e is AuthFailure) rethrow;
      throw AuthFailure.serverError(
        'B2C World sign-in failed: ${e.toString()}',
      );
    }
  }

  Future<bool> authenticateWithBiometrics() async {
    if (kIsWeb) return false; // Biometrics not available on web.
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
  Future<User> signInWithOAuth2({
    OAuth2Provider provider = OAuth2Provider.google,
  }) async {
    try {
      dev.log('Starting OAuth2 sign-in', name: 'auth');

      final user = await _oauth2Service.signInWithOAuth2(provider: provider);

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
