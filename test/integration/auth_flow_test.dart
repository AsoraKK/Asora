import 'package:asora/features/auth/application/auth_controller.dart';
import 'package:asora/services/oauth2_service.dart';
import 'package:asora/services/service_providers.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _MockStorage extends Mock implements FlutterSecureStorage {}

class _FakeOAuth2Service extends OAuth2Service {
  _FakeOAuth2Service(Dio dio, FlutterSecureStorage storage)
    : super(dio: dio, secureStorage: storage);

  @override
  Future<void> initialize() async {}

  // Avoid real secure storage writes in tests
  @override
  Future<void> cacheToken(AuthResult result) async {
    // no-op for tests
  }

  @override
  Future<AuthResult> signInEmail() async {
    updateState(AuthState.authenticating);
    await Future<void>.delayed(const Duration(milliseconds: 10));
    final res = AuthResult(
      accessToken: 'token',
      refreshToken: 'refresh',
      idToken: 'id',
      expiresOn: DateTime.now().add(const Duration(hours: 1)),
    );
    updateState(AuthState.authenticated);
    return res;
  }

  @override
  Future<void> signOut() async {
    updateState(AuthState.unauthenticated);
  }
}

void main() {
  test('Happy path: sign-in and sign-out transitions', () async {
    final mockDio = _MockDio();
    final mockStorage = _MockStorage();
    final container = ProviderContainer(
      overrides: [
        oauth2ServiceProvider.overrideWithValue(
          _FakeOAuth2Service(mockDio, mockStorage),
        ),
      ],
    );

    addTearDown(container.dispose);

    final controller = container.read(authControllerProvider.notifier);

    // Initially unauthenticated
    expect(container.read(authControllerProvider).isAuthenticated, false);

    // Sign in
    await controller.signInEmail();
    for (var i = 0; i < 50; i++) {
      if (container.read(authControllerProvider).isAuthenticated) break;
      await Future<void>.delayed(const Duration(milliseconds: 50));
    }
    expect(container.read(authControllerProvider).isAuthenticated, true);

    // Sign out
    await controller.signOut();
    for (var i = 0; i < 50; i++) {
      if (!container.read(authControllerProvider).isAuthenticated) break;
      await Future<void>.delayed(const Duration(milliseconds: 50));
    }
    expect(container.read(authControllerProvider).isAuthenticated, false);
  });
}
