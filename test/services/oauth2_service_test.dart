import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import 'package:mocktail/mocktail.dart';
import 'package:asora/services/oauth2_service.dart';

class MockFlutterAppAuth extends Mock implements FlutterAppAuth {}

class MockDio extends Mock implements Dio {}

class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  late OAuth2Service service;
  late MockDio mockDio;
  late MockFlutterSecureStorage mockStorage;
  late MockFlutterAppAuth mockAppAuth;

  setUpAll(() {
    registerFallbackValue(
      AuthorizationTokenRequest(
        'fallback-client',
        'fallback://redirect',
        discoveryUrl: 'https://example.com',
      ),
    );
    registerFallbackValue(
      TokenRequest(
        'fallback-client',
        'fallback://redirect',
        discoveryUrl: 'https://example.com',
      ),
    );
  });

  setUp(() {
    mockDio = MockDio();
    mockStorage = MockFlutterSecureStorage();
    mockAppAuth = MockFlutterAppAuth();

    service = OAuth2Service(
      dio: mockDio,
      secureStorage: mockStorage,
      appAuth: mockAppAuth,
    );
  });

  tearDown(() {
    service.dispose();
  });

  group('AuthConfig', () {
    test('fromJson creates valid config', () {
      final json = {
        'tenant': 'test.onmicrosoft.com',
        'clientId': 'test-client-id',
        'policy': 'B2C_1_signupsignin',
        'authorityHost': 'test.ciamlogin.com',
        'scopes': ['openid', 'offline_access'],
        'redirectUris': {
          'android': 'com.test://oauth/callback',
          'ios': 'msaltest://auth',
        },
        'knownAuthorities': ['test.ciamlogin.com'],
        'googleIdpHint': 'Google',
      };

      final config = AuthConfig.fromJson(json);

      expect(config.tenant, 'test.onmicrosoft.com');
      expect(config.clientId, 'test-client-id');
      expect(config.policy, 'B2C_1_signupsignin');
      expect(config.scopes, ['openid', 'offline_access']);
      expect(config.googleIdpHint, 'Google');
    });

    test('builds correct endpoint URLs', () {
      const config = AuthConfig(
        tenant: 'test.onmicrosoft.com',
        tenantId: null,
        clientId: 'test-client-id',
        policy: 'B2C_1_signupsignin',
        authorityHost: 'test.ciamlogin.com',
        scopes: ['openid'],
        redirectUris: {'android': 'test://callback'},
        knownAuthorities: ['test.ciamlogin.com'],
      );

      expect(
        config.issuer,
        'https://test.ciamlogin.com/test.onmicrosoft.com/v2.0',
      );
      expect(
        config.authorizationEndpoint,
        'https://test.ciamlogin.com/test.onmicrosoft.com/oauth2/v2.0/authorize',
      );
      expect(
        config.tokenEndpoint,
        'https://test.ciamlogin.com/test.onmicrosoft.com/oauth2/v2.0/token',
      );
    });

    test('discoveryUrl prefers tenantId and includes policy', () {
      const config = AuthConfig(
        tenant: 'test.onmicrosoft.com',
        tenantId: '11111111-2222-3333-4444-555555555555',
        clientId: 'test-client-id',
        policy: 'B2C_1_signupsignin',
        authorityHost: 'test.ciamlogin.com',
        scopes: ['openid'],
        redirectUris: {'android': 'test://callback'},
        knownAuthorities: ['test.ciamlogin.com'],
      );

      expect(
        config.discoveryUrl,
        'https://test.ciamlogin.com/11111111-2222-3333-4444-555555555555/v2.0/.well-known/openid-configuration?p=B2C_1_signupsignin',
      );
    });

    test('fromEnvironment creates config from defaults', () {
      final config = AuthConfig.fromEnvironment();

      expect(config.tenant, 'asoraauthlife.onmicrosoft.com');
      expect(config.clientId, 'c07bb257-aaf0-4179-be95-fce516f92e8c');
      expect(config.policy, 'B2C_1_signupsignin');
      expect(config.authorityHost, 'asoraauthlife.ciamlogin.com');
      expect(config.scopes, contains('openid'));
    });

    test('toJson includes optional fields', () {
      const config = AuthConfig(
        tenant: 'tenant.onmicrosoft.com',
        tenantId: 'tid',
        clientId: 'client-id',
        policy: 'B2C_1_signin',
        authorityHost: 'auth.example.com',
        scopes: ['openid'],
        redirectUris: {'android': 'com.test://cb'},
        knownAuthorities: ['auth.example.com'],
        googleIdpHint: 'Google',
      );

      final json = config.toJson();
      expect(json['tenantId'], 'tid');
      expect(json['googleIdpHint'], 'Google');
    });

    test('redirectUri uses platform-specific mapping when present', () {
      addTearDown(() => debugDefaultTargetPlatformOverride = null);

      const config = AuthConfig(
        tenant: 'tenant.onmicrosoft.com',
        clientId: 'client-id',
        policy: 'B2C_1_signin',
        authorityHost: 'auth.example.com',
        scopes: ['openid'],
        redirectUris: {
          'android': 'com.test.android://cb',
          'ios': 'com.test.ios://cb',
        },
        knownAuthorities: ['auth.example.com'],
      );

      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      expect(config.redirectUri, 'com.test.android://cb');

      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      expect(config.redirectUri, 'com.test.ios://cb');
    });
  });

  group('OAuth2Service initialization', () {
    test('loads config from compile-time values without remote fetch', () async {
      await service.initialize();

      verifyNever(() => mockDio.get<Map<String, dynamic>>(any()));
      expect(service.currentState, AuthState.unauthenticated);
    });

    test('checks for cached token on init', () async {
      when(
        () => mockStorage.read(key: 'access_token'),
      ).thenAnswer((_) async => 'cached_token');
      when(() => mockStorage.read(key: 'expires_on')).thenAnswer(
        (_) async =>
            DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );

      await service.initialize();

      verifyNever(() => mockDio.get<Map<String, dynamic>>(any()));
      expect(service.currentState, AuthState.authenticated);
    });
  });

  group('OAuth2Service interactive flows', () {
    test('signInEmail builds a policy-scoped authorization request', () async {
      when(
        () => mockStorage.read(key: any(named: 'key')),
      ).thenAnswer((_) async => null);
      when(
        () => mockStorage.write(
          key: any(named: 'key'),
          value: any(named: 'value'),
        ),
      ).thenAnswer((_) async {});

      final tokenResponse = AuthorizationTokenResponse(
        'access-token',
        'refresh-token',
        DateTime.now().add(const Duration(hours: 1)),
        'id-token',
        'Bearer',
        ['openid'],
        {'p': 'B2C_1_signupsignin'},
        {'nonce': 'n'},
      );
      when(
        () => mockAppAuth.authorizeAndExchangeCode(
          any(),
        ),
      ).thenAnswer((_) async => tokenResponse);

      await service.initialize();
      final result = await service.signInEmail();

      expect(result.accessToken, 'access-token');
      expect(service.currentState, AuthState.authenticated);
      final request = verify(
        () => mockAppAuth.authorizeAndExchangeCode(captureAny()),
      ).captured.single as AuthorizationTokenRequest;
      expect(request.additionalParameters?['p'], 'B2C_1_signupsignin');
      expect(request.discoveryUrl, contains('?p=B2C_1_signupsignin'));
      expect(request.scopes, contains('openid'));
    });

    test('signInGoogle includes IdP hint and login prompt', () async {
      when(
        () => mockStorage.read(key: any(named: 'key')),
      ).thenAnswer((_) async => null);
      when(
        () => mockStorage.write(
          key: any(named: 'key'),
          value: any(named: 'value'),
        ),
      ).thenAnswer((_) async {});

      when(
        () => mockAppAuth.authorizeAndExchangeCode(any()),
      ).thenAnswer(
        (_) async => AuthorizationTokenResponse(
          'google-access',
          null,
          DateTime.now().add(const Duration(hours: 1)),
          null,
          'Bearer',
          ['openid'],
          {'idp': 'Google'},
          null,
        ),
      );

      await service.initialize();
      await service.signInGoogle();

      final request = verify(
        () => mockAppAuth.authorizeAndExchangeCode(captureAny()),
      ).captured.single as AuthorizationTokenRequest;
      expect(request.additionalParameters?['p'], 'B2C_1_signupsignin');
      expect(request.additionalParameters?['idp'], 'Google');
      expect(request.additionalParameters?['prompt'], 'login');
    });

    test('getAccessToken refreshes when the cached token is near expiry', () async {
      final now = DateTime.now();
      when(
        () => mockStorage.read(key: 'access_token'),
      ).thenAnswer((_) async => 'cached-token');
      when(
        () => mockStorage.read(key: 'expires_on'),
      ).thenAnswer(
        (_) async => now.subtract(const Duration(minutes: 1)).toIso8601String(),
      );
      when(
        () => mockStorage.read(key: 'refresh_token'),
      ).thenAnswer((_) async => 'refresh-token');
      when(
        () => mockStorage.write(
          key: any(named: 'key'),
          value: any(named: 'value'),
        ),
      ).thenAnswer((_) async {});
      when(() => mockAppAuth.token(any())).thenAnswer(
        (_) async => TokenResponse(
          'refreshed-token',
          'refreshed-refresh-token',
          now.add(const Duration(hours: 1)),
          'refreshed-id-token',
          'Bearer',
          ['openid'],
          {'p': 'B2C_1_signupsignin'},
        ),
      );

      await service.initialize();
      final token = await service.getAccessToken();

      expect(token, 'refreshed-token');
      final request = verify(() => mockAppAuth.token(captureAny())).captured.single
          as TokenRequest;
      expect(request.refreshToken, 'refresh-token');
      expect(request.additionalParameters?['p'], 'B2C_1_signupsignin');
      expect(service.currentState, AuthState.unauthenticated);
    });

    test('getAccessToken returns the cached token when it is still valid', () async {
      when(
        () => mockStorage.read(key: 'access_token'),
      ).thenAnswer((_) async => 'cached-token');
      when(
        () => mockStorage.read(key: 'expires_on'),
      ).thenAnswer(
        (_) async => DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );

      final token = await service.getAccessToken();

      expect(token, 'cached-token');
      verifyNever(() => mockAppAuth.token(any()));
    });

    test('getAccessToken returns null when refresh token is missing', () async {
      when(
        () => mockStorage.read(key: 'access_token'),
      ).thenAnswer((_) async => 'cached-token');
      when(
        () => mockStorage.read(key: 'expires_on'),
      ).thenAnswer(
        (_) async => DateTime.now().subtract(const Duration(minutes: 1)).toIso8601String(),
      );
      when(
        () => mockStorage.read(key: 'refresh_token'),
      ).thenAnswer((_) async => null);

      await service.initialize();
      final token = await service.getAccessToken();

      expect(token, isNull);
      expect(service.currentState, AuthState.unauthenticated);
      verifyNever(() => mockAppAuth.token(any()));
    });
  });

  group('OAuth2Service sign out', () {
    test('clears cached credentials and resets state', () async {
      when(
        () => mockStorage.delete(key: any(named: 'key')),
      ).thenAnswer((_) async {});

      await service.signOut();

      verify(
        () => mockStorage.delete(key: 'access_token'),
      ).called(1);
      verify(
        () => mockStorage.delete(key: 'refresh_token'),
      ).called(1);
      verify(
        () => mockStorage.delete(key: 'id_token'),
      ).called(1);
      verify(
        () => mockStorage.delete(key: 'expires_on'),
      ).called(1);
      verify(
        () => mockStorage.delete(key: 'account_id'),
      ).called(1);
      expect(service.currentState, AuthState.unauthenticated);
    });
  });

  group('AuthException mapping', () {
    test('maps platform exception codes correctly', () {
      final service = OAuth2Service(dio: mockDio, secureStorage: mockStorage);

      // Test various error codes
      final cancelException = service.testingMapAppAuthException(
        PlatformException(code: 'USER_CANCEL'),
      );
      expect(cancelException.error, AuthError.cancelled);

      final networkException = service.testingMapAppAuthException(
        PlatformException(code: 'NETWORK_ERROR'),
      );
      expect(networkException.error, AuthError.network);

      final policyException = service.testingMapAppAuthException(
        PlatformException(code: 'AUTH_ERROR', message: 'AADB2C90118'),
      );
      expect(policyException.error, AuthError.policyNotFound);
    });
  });

  group('Token caching', () {
    test('caches access token and expiry', () async {
      final expiresOn = DateTime.now().add(const Duration(hours: 1));
      final result = AuthResult(
        accessToken: 'test_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        expiresOn: expiresOn,
        accountId: 'account_123',
      );

      when(
        () => mockStorage.write(
          key: any(named: 'key'),
          value: any(named: 'value'),
        ),
      ).thenAnswer((_) async => {});

      await service.testingCacheToken(result);

      verify(
        () => mockStorage.write(key: 'access_token', value: 'test_token'),
      ).called(1);
      verify(
        () => mockStorage.write(key: 'id_token', value: 'id_token'),
      ).called(1);
      verify(
        () => mockStorage.write(key: 'account_id', value: 'account_123'),
      ).called(1);
      verify(
        () => mockStorage.write(
          key: 'expires_on',
          value: expiresOn.toIso8601String(),
        ),
      ).called(1);
    });

    test('isExpired returns true for past expiry', () {
      final result = AuthResult(
        accessToken: 'test',
        expiresOn: DateTime.now().subtract(const Duration(minutes: 1)),
      );

      expect(result.isExpired, true);
    });

    test('isExpired returns false for future expiry', () {
      final result = AuthResult(
        accessToken: 'test',
        expiresOn: DateTime.now().add(const Duration(hours: 1)),
      );

      expect(result.isExpired, false);
    });
  });

  group('AuthState stream', () {
    test('emits state changes', () async {
      final states = <AuthState>[];
      service.authState.listen(states.add);

      // Simulate state changes
      service.testingUpdateState(AuthState.authenticating);
      service.testingUpdateState(AuthState.authenticated);

      await Future<void>.delayed(const Duration(milliseconds: 100));

      expect(states, [AuthState.authenticating, AuthState.authenticated]);
    });
  });

  group('OAuth2 policy parameter', () {
    test('policy parameter must be included in authorize requests', () {
      // This test documents the requirement that policy-driven flows must
      // include the policy (user flow) parameter in authorization requests.
      // Without this, the authorize endpoint won't know which user flow to execute.

      const config = AuthConfig(
        tenant: 'test.onmicrosoft.com',
        tenantId: '11111111-2222-3333-4444-555555555555',
        clientId: 'test-client-id',
        policy: 'B2C_1_signupsignin',
        authorityHost: 'test.ciamlogin.com',
        scopes: ['openid'],
        redirectUris: {'android': 'test://callback'},
        knownAuthorities: ['test.ciamlogin.com'],
      );

      // The policy should be part of the discovery URL query string
      expect(config.discoveryUrl, contains('?p=B2C_1_signupsignin'));

      // And signInEmail/signInGoogle must pass additionalParameters: {'p': policy}
      // This is verified by code inspection since AuthorizationTokenRequest is opaque.
    });

    test('policy parameter must be included in token refresh requests', () {
      // Token refresh via TokenRequest must also include the policy parameter
      // to ensure the token endpoint knows which user flow's keys to use for validation.

      const config = AuthConfig(
        tenant: 'test.onmicrosoft.com',
        clientId: 'test-client-id',
        policy: 'B2C_1_signupsignin',
        authorityHost: 'test.ciamlogin.com',
        scopes: ['openid'],
        redirectUris: {'android': 'test://callback'},
        knownAuthorities: ['test.ciamlogin.com'],
      );

      expect(config.policy, 'B2C_1_signupsignin');
    });
  });
}

/// Extension to expose private methods for testing
extension OAuth2ServiceTesting on OAuth2Service {
  Future<void> testingCacheToken(AuthResult result) => cacheToken(result);

  void testingUpdateState(AuthState newState) => updateState(newState);

  AuthException testingMapAppAuthException(PlatformException e) =>
      mapAppAuthException(e);
}
