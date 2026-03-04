import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:asora/features/auth/application/auth_controller.dart';
import 'package:asora/services/oauth2_service.dart';

/// Minimal fake that avoids platform services
class FakeOAuth2Service implements OAuth2Service {
  final StreamController<AuthState> _ctrl =
      StreamController<AuthState>.broadcast();
  AuthException? signInEmailError;
  Object? signInEmailGenericError;
  AuthException? signInGoogleError;
  Object? signInGoogleGenericError;
  Object? signOutError;
  String? tokenToReturn;
  Object? getAccessTokenError;

  @override
  Stream<AuthState> get authState => _ctrl.stream;

  void emitState(AuthState s) => _ctrl.add(s);

  @override
  Future<void> initialize() async {}

  @override
  Future<AuthResult> signInEmail() async {
    if (signInEmailError != null) throw signInEmailError!;
    if (signInEmailGenericError != null) throw signInEmailGenericError!;
    return AuthResult(
      accessToken: 'tok',
      expiresOn: DateTime.now().add(const Duration(hours: 1)),
    );
  }

  @override
  Future<AuthResult> signInGoogle() async {
    if (signInGoogleError != null) throw signInGoogleError!;
    if (signInGoogleGenericError != null) throw signInGoogleGenericError!;
    return AuthResult(
      accessToken: 'tok',
      expiresOn: DateTime.now().add(const Duration(hours: 1)),
    );
  }

  @override
  Future<void> signOut() async {
    if (signOutError != null) throw signOutError!;
  }

  @override
  Future<String?> getAccessToken({bool forceRefresh = false}) async {
    if (getAccessTokenError != null) throw getAccessTokenError!;
    return tokenToReturn;
  }

  @override
  dynamic noSuchMethod(Invocation inv) => super.noSuchMethod(inv);
}

void main() {
  group('AuthControllerState', () {
    test('default values', () {
      const s = AuthControllerState();
      expect(s.isAuthenticated, isFalse);
      expect(s.isLoading, isFalse);
      expect(s.error, isNull);
    });

    test('copyWith overrides only provided fields', () {
      const s = AuthControllerState(isAuthenticated: true, error: 'e');
      final s2 = s.copyWith(isLoading: true);
      expect(s2.isAuthenticated, isTrue); // preserved
      expect(s2.isLoading, isTrue);
      expect(s2.error, isNull); // error is nullable, copyWith resets it
    });

    test('copyWith clears error by default', () {
      const s = AuthControllerState(error: 'oops');
      final s2 = s.copyWith();
      expect(s2.error, isNull);
    });
  });

  group('AuthController', () {
    late FakeOAuth2Service fakeAuth;
    late AuthController controller;

    setUp(() {
      fakeAuth = FakeOAuth2Service();
      controller = AuthController(fakeAuth);
    });

    test('signInEmail sets loading then succeeds', () async {
      await controller.signInEmail();
      // isLoading stays true until the stream listener receives
      // AuthState.authenticated – we only verify no error here.
      expect(controller.state.error, isNull);
    });

    test('signInEmail sets error on AuthException', () async {
      fakeAuth.signInEmailError = const AuthException(
        AuthError.cancelled,
        'User cancelled',
      );
      await controller.signInEmail();
      expect(controller.state.error, 'Sign-in cancelled');
      expect(controller.state.isLoading, isFalse);
    });

    test('signInEmail sets generic error on unknown exception', () async {
      fakeAuth.signInEmailGenericError = Exception('boom');
      await controller.signInEmail();
      expect(controller.state.error, 'Sign-in failed. Please try again.');
      expect(controller.state.isLoading, isFalse);
    });

    test('signInGoogle sets loading then succeeds', () async {
      await controller.signInGoogle();
      // isLoading is reset via stream listener, not inline.
      expect(controller.state.error, isNull);
    });

    test('signInGoogle sets error on AuthException', () async {
      fakeAuth.signInGoogleError = const AuthException(
        AuthError.network,
        'net',
      );
      await controller.signInGoogle();
      expect(
        controller.state.error,
        'Network error. Please check your connection.',
      );
    });

    test('signInGoogle sets generic error on unknown exception', () async {
      fakeAuth.signInGoogleGenericError = Exception('bang');
      await controller.signInGoogle();
      expect(controller.state.error, 'Sign-in failed. Please try again.');
    });

    test('signOut succeeds without error', () async {
      await controller.signOut();
      expect(controller.state.error, isNull);
    });

    test('signOut sets error on failure', () async {
      fakeAuth.signOutError = Exception('fail');
      await controller.signOut();
      expect(controller.state.error, 'Sign-out failed. Please try again.');
    });

    test('getAccessToken returns token', () async {
      fakeAuth.tokenToReturn = 'abc';
      final token = await controller.getAccessToken();
      expect(token, 'abc');
    });

    test('getAccessToken returns null on error', () async {
      fakeAuth.getAccessTokenError = Exception('fail');
      final token = await controller.getAccessToken();
      expect(token, isNull);
    });

    test('_formatError maps all AuthError values', () async {
      for (final entry in <AuthError, String>{
        AuthError.cancelled: 'Sign-in cancelled',
        AuthError.network: 'Network error. Please check your connection.',
        AuthError.policyNotFound: 'Authentication configuration error',
        AuthError.accountUnavailable: 'Account unavailable',
        AuthError.transient: 'Temporary error. Please try again.',
        AuthError.unknown: 'some message',
      }.entries) {
        fakeAuth.signInEmailError = AuthException(entry.key, 'some message');
        await controller.signInEmail();
        expect(controller.state.error, entry.value);
      }
    });
  });
}
