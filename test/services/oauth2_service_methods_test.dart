/// Extended tests for OAuth2Service (services layer) — targeting uncovered paths
/// Covers: initialize, _loadConfig, signOut, getAccessToken, cacheToken,
/// mapAppAuthException, AuthConfig.fromJson, redirectUri platform logic
library;

import 'package:dio/dio.dart';
import 'package:flutter/services.dart' show PlatformException;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:asora/services/oauth2_service.dart';

// Mocks
class MockDio extends Mock implements Dio {}

class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  late MockDio mockDio;
  late MockFlutterSecureStorage mockStorage;

  setUp(() {
    mockDio = MockDio();
    mockStorage = MockFlutterSecureStorage();
  });

  group('AuthConfig', () {
    test('fromJson parses all fields', () {
      final config = AuthConfig.fromJson(const {
        'tenant': 'mytenant.onmicrosoft.com',
        'tenantId': 'tid-123',
        'clientId': 'cid-456',
        'policy': 'B2C_1_signup',
        'authorityHost': 'mytenant.ciamlogin.com',
        'scopes': ['openid', 'offline_access'],
        'redirectUris': {'android': 'com.app://callback', 'ios': 'msal://auth'},
        'knownAuthorities': ['mytenant.ciamlogin.com'],
        'googleIdpHint': 'Google',
      });

      expect(config.tenant, 'mytenant.onmicrosoft.com');
      expect(config.tenantId, 'tid-123');
      expect(config.clientId, 'cid-456');
      expect(config.scopes, hasLength(2));
      expect(config.googleIdpHint, 'Google');
    });

    test('fromJson with null tenantId', () {
      final config = AuthConfig.fromJson(const {
        'tenant': 'T',
        'clientId': 'C',
        'policy': 'P',
        'authorityHost': 'H',
        'scopes': <dynamic>[],
        'redirectUris': <String, dynamic>{},
        'knownAuthorities': <dynamic>[],
      });
      expect(config.tenantId, isNull);
    });

    test('_tenantPath uses tenantId when available', () {
      const config = AuthConfig(
        tenant: 'tenantName',
        tenantId: 'tenantIdValue',
        clientId: 'cid',
        policy: 'p',
        authorityHost: 'host.com',
        scopes: [],
        redirectUris: {},
        knownAuthorities: [],
      );
      expect(config.discoveryUrl, contains('tenantIdValue'));
    });

    test('_tenantPath falls back to tenant when tenantId is null', () {
      const config = AuthConfig(
        tenant: 'tenantFallback',
        clientId: 'cid',
        policy: 'p',
        authorityHost: 'host.com',
        scopes: [],
        redirectUris: {},
        knownAuthorities: [],
      );
      expect(config.discoveryUrl, contains('tenantFallback'));
    });

    test('_tenantPath falls back to tenant when tenantId is empty', () {
      const config = AuthConfig(
        tenant: 'tenantFallback',
        tenantId: '',
        clientId: 'cid',
        policy: 'p',
        authorityHost: 'host.com',
        scopes: [],
        redirectUris: {},
        knownAuthorities: [],
      );
      expect(config.discoveryUrl, contains('tenantFallback'));
    });

    test('computed endpoints contain correct paths', () {
      const config = AuthConfig(
        tenant: 'T',
        tenantId: 'tid',
        clientId: 'cid',
        policy: 'P',
        authorityHost: 'host.com',
        scopes: [],
        redirectUris: {},
        knownAuthorities: [],
      );
      expect(config.issuer, 'https://host.com/tid/v2.0');
      expect(config.authorizationEndpoint, contains('/oauth2/v2.0/authorize'));
      expect(config.tokenEndpoint, contains('/oauth2/v2.0/token'));
      expect(config.endSessionEndpoint, contains('/oauth2/v2.0/logout'));
    });

    test('_fallbackRedirectUri uses MSAL pattern', () {
      const config = AuthConfig(
        tenant: 'T',
        clientId: 'my-client',
        policy: 'P',
        authorityHost: 'host.com',
        scopes: [],
        redirectUris: {},
        knownAuthorities: [],
      );
      // With no matching platform URI, redirectUri should fall back
      expect(config.redirectUri, contains('my-client'));
    });

    test('fromEnvironment creates config with defaults', () {
      final config = AuthConfig.fromEnvironment();
      expect(config.tenant, isNotEmpty);
      expect(config.clientId, isNotEmpty);
      expect(config.scopes, isNotEmpty);
    });
  });

  group('AuthResult', () {
    test('isExpired returns true when past expiresOn', () {
      final result = AuthResult(
        accessToken: 'tok',
        expiresOn: DateTime.now().subtract(const Duration(hours: 1)),
      );
      expect(result.isExpired, isTrue);
    });

    test('isExpired returns false when before expiresOn', () {
      final result = AuthResult(
        accessToken: 'tok',
        expiresOn: DateTime.now().add(const Duration(hours: 1)),
      );
      expect(result.isExpired, isFalse);
    });

    test('fields are stored correctly', () {
      final result = AuthResult(
        accessToken: 'access',
        refreshToken: 'refresh',
        idToken: 'id',
        expiresOn: DateTime(2025),
        accountId: 'acc',
      );
      expect(result.accessToken, 'access');
      expect(result.refreshToken, 'refresh');
      expect(result.idToken, 'id');
      expect(result.accountId, 'acc');
    });
  });

  group('AuthException', () {
    test('toString includes message and error name', () {
      const ex = AuthException(AuthError.network, 'Connection failed');
      expect(ex.toString(), contains('network'));
      expect(ex.toString(), contains('Connection failed'));
    });

    test('preserves original error', () {
      final orig = Exception('original');
      final ex = AuthException(AuthError.unknown, 'msg', orig);
      expect(ex.originalError, orig);
    });
  });

  group('OAuth2Service', () {
    late OAuth2Service service;

    setUp(() {
      service = OAuth2Service(dio: mockDio, secureStorage: mockStorage);
    });

    tearDown(() => service.dispose());

    test('currentState defaults to unauthenticated', () {
      expect(service.currentState, AuthState.unauthenticated);
    });

    test('updateState emits to stream and updates currentState', () async {
      final states = <AuthState>[];
      final sub = service.authState.listen(states.add);

      service.updateState(AuthState.authenticating);
      service.updateState(AuthState.authenticated);

      await Future<void>.delayed(Duration.zero);
      await sub.cancel();

      expect(states, contains(AuthState.authenticating));
      expect(states, contains(AuthState.authenticated));
      expect(service.currentState, AuthState.authenticated);
    });

    group('initialize', () {
      test('sets authenticated when valid cached token exists', () async {
        when(
          () => mockStorage.read(key: 'access_token'),
        ).thenAnswer((_) async => 'cached-token');
        when(() => mockStorage.read(key: 'expires_on')).thenAnswer(
          (_) async =>
              DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
        );
        // No config endpoint — falls back to fromEnvironment
        await service.initialize();

        expect(service.currentState, AuthState.authenticated);
      });

      test('stays unauthenticated when token is expired', () async {
        when(
          () => mockStorage.read(key: 'access_token'),
        ).thenAnswer((_) async => 'expired-token');
        when(() => mockStorage.read(key: 'expires_on')).thenAnswer(
          (_) async => DateTime.now()
              .subtract(const Duration(hours: 1))
              .toIso8601String(),
        );
        await service.initialize();

        expect(service.currentState, AuthState.unauthenticated);
      });

      test('stays unauthenticated when no cached token', () async {
        when(
          () => mockStorage.read(key: 'access_token'),
        ).thenAnswer((_) async => null);
        await service.initialize();

        expect(service.currentState, AuthState.unauthenticated);
      });
    });

    group('signOut', () {
      test('clears storage and sets unauthenticated', () async {
        when(
          () => mockStorage.delete(key: any(named: 'key')),
        ).thenAnswer((_) async {});

        service.updateState(AuthState.authenticated);
        await service.signOut();

        expect(service.currentState, AuthState.unauthenticated);
        verify(() => mockStorage.delete(key: 'access_token')).called(1);
        verify(() => mockStorage.delete(key: 'refresh_token')).called(1);
        verify(() => mockStorage.delete(key: 'id_token')).called(1);
        verify(() => mockStorage.delete(key: 'expires_on')).called(1);
        verify(() => mockStorage.delete(key: 'account_id')).called(1);
      });

      test('handles storage error gracefully', () async {
        when(
          () => mockStorage.delete(key: any(named: 'key')),
        ).thenThrow(Exception('Storage error'));

        // Should not throw
        await service.signOut();
      });
    });

    group('cacheToken', () {
      test('writes all fields to storage', () async {
        when(
          () => mockStorage.write(
            key: any(named: 'key'),
            value: any(named: 'value'),
          ),
        ).thenAnswer((_) async {});

        final result = AuthResult(
          accessToken: 'at',
          refreshToken: 'rt',
          idToken: 'idt',
          expiresOn: DateTime(2025, 6, 1),
          accountId: 'aid',
        );

        await service.cacheToken(result);

        verify(
          () => mockStorage.write(key: 'access_token', value: 'at'),
        ).called(1);
        verify(
          () => mockStorage.write(key: 'id_token', value: 'idt'),
        ).called(1);
        verify(
          () => mockStorage.write(
            key: 'expires_on',
            value: any(named: 'value'),
          ),
        ).called(1);
        verify(
          () => mockStorage.write(key: 'account_id', value: 'aid'),
        ).called(1);
      });

      test('skips id_token and account_id when null', () async {
        when(
          () => mockStorage.write(
            key: any(named: 'key'),
            value: any(named: 'value'),
          ),
        ).thenAnswer((_) async {});

        final result = AuthResult(accessToken: 'at', expiresOn: DateTime(2025));

        await service.cacheToken(result);

        verify(
          () => mockStorage.write(key: 'access_token', value: 'at'),
        ).called(1);
        verifyNever(
          () => mockStorage.write(
            key: 'id_token',
            value: any(named: 'value'),
          ),
        );
        verifyNever(
          () => mockStorage.write(
            key: 'account_id',
            value: any(named: 'value'),
          ),
        );
      });
    });

    group('getAccessToken', () {
      test('returns cached token if still valid', () async {
        when(
          () => mockStorage.read(key: 'access_token'),
        ).thenAnswer((_) async => 'valid-token');
        when(() => mockStorage.read(key: 'expires_on')).thenAnswer(
          (_) async =>
              DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
        );

        final token = await service.getAccessToken();
        expect(token, 'valid-token');
      });

      test('returns null when no config loaded and force refresh', () async {
        when(
          () => mockStorage.read(key: 'access_token'),
        ).thenAnswer((_) async => null);
        when(
          () => mockStorage.read(key: 'expires_on'),
        ).thenAnswer((_) async => null);

        final token = await service.getAccessToken(forceRefresh: true);
        expect(token, isNull);
      });

      test('returns null when no refresh token and token expired', () async {
        // Initialize config first
        await service.initialize().catchError((_) {});

        when(
          () => mockStorage.read(key: 'access_token'),
        ).thenAnswer((_) async => 'expired');
        when(() => mockStorage.read(key: 'expires_on')).thenAnswer(
          (_) async => DateTime.now()
              .subtract(const Duration(hours: 1))
              .toIso8601String(),
        );
        when(
          () => mockStorage.read(key: 'refresh_token'),
        ).thenAnswer((_) async => null);

        final token = await service.getAccessToken();
        expect(token, isNull);
      });

      test('returns null on exception during token fetch', () async {
        when(
          () => mockStorage.read(key: 'access_token'),
        ).thenThrow(Exception('storage error'));

        final token = await service.getAccessToken();
        expect(token, isNull);
      });
    });

    group('mapAppAuthException', () {
      test('maps user_cancel to cancelled', () {
        final ex = service.mapAppAuthException(
          PlatformException(code: 'user_cancel', message: 'User cancelled'),
        );
        expect(ex.error, AuthError.cancelled);
      });

      test('maps network to network error', () {
        final ex = service.mapAppAuthException(
          PlatformException(code: 'network_error', message: 'No connection'),
        );
        expect(ex.error, AuthError.network);
      });

      test('maps policy message to policyNotFound', () {
        final ex = service.mapAppAuthException(
          PlatformException(code: 'auth', message: 'AADB2C policy missing'),
        );
        expect(ex.error, AuthError.policyNotFound);
      });

      test('maps no_account code to accountUnavailable', () {
        final ex = service.mapAppAuthException(
          PlatformException(code: 'no_account', message: 'no account found'),
        );
        expect(ex.error, AuthError.accountUnavailable);
      });

      test('maps unknown code to unknown', () {
        final ex = service.mapAppAuthException(
          PlatformException(code: 'weird_code', message: 'something else'),
        );
        expect(ex.error, AuthError.unknown);
      });

      test('handles null message', () {
        final ex = service.mapAppAuthException(
          PlatformException(code: 'unknown'),
        );
        expect(ex.error, AuthError.unknown);
        expect(ex.message, 'Auth error');
      });
    });
  });

  group('_loadConfig', () {
    test('uses config endpoint when provided and returns 200', () async {
      final mockDio2 = MockDio();
      final resp = Response<Map<String, dynamic>>(
        data: {
          'tenant': 'remote',
          'clientId': 'c',
          'policy': 'p',
          'authorityHost': 'h',
          'scopes': <dynamic>[],
          'redirectUris': <String, dynamic>{},
          'knownAuthorities': <dynamic>[],
        },
        statusCode: 200,
        requestOptions: RequestOptions(),
      );
      when(
        () => mockDio2.get<Map<String, dynamic>>('/config'),
      ).thenAnswer((_) async => resp);
      when(
        () => mockStorage.read(key: any(named: 'key')),
      ).thenAnswer((_) async => null);

      final svc = OAuth2Service(
        dio: mockDio2,
        secureStorage: mockStorage,
        configEndpoint: '/config',
      );
      await svc.initialize();
      svc.dispose();

      verify(() => mockDio2.get<Map<String, dynamic>>('/config')).called(1);
    });

    test('falls back to fromEnvironment when endpoint fails', () async {
      final mockDio2 = MockDio();
      when(
        () => mockDio2.get<Map<String, dynamic>>('/config'),
      ).thenThrow(DioException(requestOptions: RequestOptions()));
      when(
        () => mockStorage.read(key: any(named: 'key')),
      ).thenAnswer((_) async => null);

      final svc = OAuth2Service(
        dio: mockDio2,
        secureStorage: mockStorage,
        configEndpoint: '/config',
      );
      // Should not throw — falls back
      await svc.initialize();
      svc.dispose();
    });
  });
}
