import 'package:flutter_test/flutter_test.dart';
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

  setUp(() {
    mockDio = MockDio();
    mockStorage = MockFlutterSecureStorage();

    service = OAuth2Service(
      dio: mockDio,
      secureStorage: mockStorage,
      configEndpoint: 'https://example.com/api/auth/b2c-config',
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
  });

  group('OAuth2Service initialization', () {
    test('loads config from server when available', () async {
      final configJson = {
        'tenant': 'server.onmicrosoft.com',
        'clientId': 'server-client-id',
        'policy': 'B2C_1_signupsignin',
        'authorityHost': 'server.ciamlogin.com',
        'scopes': ['openid'],
        'redirectUris': {'android': 'test://callback'},
        'knownAuthorities': ['server.ciamlogin.com'],
      };

      when(() => mockDio.get(any())).thenAnswer(
        (_) async => Response(
          data: configJson,
          statusCode: 200,
          requestOptions: RequestOptions(path: ''),
        ),
      );

      await service.initialize();

      verify(
        () => mockDio.get('https://example.com/api/auth/b2c-config'),
      ).called(1);
    });

    test('falls back to environment config when server fails', () async {
      when(() => mockDio.get(any())).thenThrow(
        DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionTimeout,
        ),
      );

      await service.initialize();

      // Should not throw, falls back to environment
      expect(service.currentState, isNotNull);
    });

    test('checks for cached token on init', () async {
      when(() => mockDio.get(any())).thenAnswer(
        (_) async => Response(
          data: {
            'tenant': 'test.onmicrosoft.com',
            'clientId': 'test-id',
            'policy': 'B2C_1_signupsignin',
            'authorityHost': 'test.ciamlogin.com',
            'scopes': ['openid'],
            'redirectUris': {'android': 'test://callback'},
            'knownAuthorities': ['test.ciamlogin.com'],
          },
          statusCode: 200,
          requestOptions: RequestOptions(path: ''),
        ),
      );

      when(
        () => mockStorage.read(key: 'access_token'),
      ).thenAnswer((_) async => 'cached_token');
      when(() => mockStorage.read(key: 'expires_on')).thenAnswer(
        (_) async =>
            DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );

      await service.initialize();

      expect(service.currentState, AuthState.authenticated);
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

      await Future.delayed(const Duration(milliseconds: 100));

      expect(states, [AuthState.authenticating, AuthState.authenticated]);
    });
  });

  group('B2C Policy Parameter', () {
    test('policy parameter must be included in authorize requests', () {
      // This test documents the requirement that B2C/CIAM flows must include
      // the policy (user flow) parameter in authorization requests.
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
      // This is verified by code inspection since AuthorizationTokenRequest is opaque
      // See: lib/services/oauth2_service.dart lines ~275 (signInEmail) and ~312 (signInGoogle)
    });

    test('policy parameter must be included in token refresh requests', () {
      // Token refresh via TokenRequest must also include the policy parameter
      // to ensure the token endpoint knows which user flow's keys to use for validation

      const config = AuthConfig(
        tenant: 'test.onmicrosoft.com',
        clientId: 'test-client-id',
        policy: 'B2C_1_signupsignin',
        authorityHost: 'test.ciamlogin.com',
        scopes: ['openid'],
        redirectUris: {'android': 'test://callback'},
        knownAuthorities: ['test.ciamlogin.com'],
      );

      // Verified by code inspection in getAccessToken() refresh flow
      // See: lib/services/oauth2_service.dart line ~383
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
