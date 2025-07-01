// lib/features/auth/application/auth_service.dart
import 'dart:developer' as dev;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

import '../domain/auth_failure.dart';

GoogleSignIn _buildGoogleSignIn() {
  if (kIsWeb) {
    return GoogleSignIn(
      clientId: const String.fromEnvironment('GOOGLE_WEB_CLIENT_ID'),
      scopes: ['email', 'profile', 'openid'],
    );
  }
  switch (defaultTargetPlatform) {
    case TargetPlatform.android:
      return GoogleSignIn(
        clientId: const String.fromEnvironment('GOOGLE_ANDROID_CLIENT_ID'),
        serverClientId: const String.fromEnvironment('GOOGLE_WEB_CLIENT_ID'),
        scopes: ['email', 'profile', 'openid'],
      );
    case TargetPlatform.macOS:
    case TargetPlatform.linux:
    case TargetPlatform.windows:
      return GoogleSignIn(
        clientId: const String.fromEnvironment('GOOGLE_DESKTOP_CLIENT_ID'),
        serverClientId: const String.fromEnvironment('GOOGLE_WEB_CLIENT_ID'),
        scopes: ['email', 'profile', 'openid'],
      );
    default:
      throw UnsupportedError('Unsupported platform');
  }
}

class AuthService {
  AuthService({
    GoogleSignIn? googleSignIn,
    FlutterSecureStorage? secureStorage,
    LocalAuthentication? localAuth,
  })  : _googleSignIn = googleSignIn ?? _buildGoogleSignIn(),
        _secureStorage = secureStorage ?? const FlutterSecureStorage(),
        _localAuth = localAuth ?? LocalAuthentication();

  final GoogleSignIn _googleSignIn;
  final FlutterSecureStorage _secureStorage;
  final LocalAuthentication _localAuth;

  Future<String> signInWithGoogle() async {
    try {
      final account = await _googleSignIn.signIn();
      if (account == null) throw AuthFailure.cancelledByUser();
      final auth = await account.authentication;
      final idToken = auth.idToken;
      assert(idToken != null, 'Google returned a null idToken');
      // TODO: POST idToken to Azure Function
      dev.log('Google sign-in succeeded', name: 'auth');
      return idToken!;
    } catch (e, st) {
      dev.log('Google sign-in failed: $e', name: 'auth', error: e, stackTrace: st, level: 1000);
      throw AuthFailure.serverError(e.toString());
    }
  }

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
    await _secureStorage.deleteAll();
    dev.log('User signed out', name: 'auth');
  }
}

final authServiceProvider = Provider<AuthService>((_) => AuthService());
