// lib/features/auth/application/auth_service.dart
import 'dart:convert';
import 'dart:developer' as dev;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import 'package:http/http.dart' as http;

import '../domain/auth_failure.dart';

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

class AuthService {
  AuthService({
    GoogleSignIn? googleSignIn,
    FlutterSecureStorage? secureStorage,
    LocalAuthentication? localAuth,
    http.Client? httpClient,
    String authUrl = _defaultAuthUrl,
  }) : _googleSignIn = googleSignIn ?? _buildGoogleSignIn(),
       _secureStorage = secureStorage ?? const FlutterSecureStorage(),
       _localAuth = localAuth ?? LocalAuthentication(),
       _httpClient = httpClient ?? http.Client(),
       _authUrl = authUrl;

  final GoogleSignIn _googleSignIn;
  final FlutterSecureStorage _secureStorage;
  final LocalAuthentication _localAuth;
  final http.Client _httpClient;
  final String _authUrl;

  static const _sessionKey = 'sessionToken';
  static const _defaultAuthUrl = String.fromEnvironment('AUTH_URL');

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
    await _googleSignIn.signOut();
    await clearSessionToken();
    dev.log('User signed out', name: 'auth');
  }
}

final authServiceProvider = Provider<AuthService>((_) => AuthService());
