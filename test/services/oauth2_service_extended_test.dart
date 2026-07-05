// ignore_for_file: public_member_api_docs

import 'package:asora/services/oauth2_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart' show PlatformException;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

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
    test('fromJson parses fields', () {
      final config = AuthConfig.fromJson(const {
        'tenant': 'tenant.onmicrosoft.com',
        'tenantId': 'tenant-id',
        'clientId': 'client-id',
        'policy': 'B2C_1_signupsignin',
        'authorityHost': 'tenant.ciamlogin.com',
        'scopes': ['openid', 'offline_access'],
        'redirectUris': {'android': 'com.app://oauth/callback'},
        'knownAuthorities': ['tenant.ciamlogin.com'],
        'googleIdpHint': 'Google',
      });

      expect(config.tenant, 'tenant.onmicrosoft.com');
      expect(config.tenantId, 'tenant-id');
      expect(config.clientId, 'client-id');
      expect(config.googleIdpHint, 'Google');
    });

    test('fromEnvironment returns compile-time defaults', () {
      final config = AuthConfig.fromEnvironment();

      expect(config.tenant, isNotEmpty);
      expect(config.clientId, isNotEmpty);
      expect(config.policy, isNotEmpty);
    });

    test('builds expected endpoints', () {
      const config = AuthConfig(
        tenant: 'tenant.onmicrosoft.com',
        tenantId: 'tenant-id',
        clientId: 'client-id',
        policy: 'B2C_1_signupsignin',
        authorityHost: 'tenant.ciamlogin.com',
        scopes: ['openid'],
        redirectUris: {'android': 'com.app://oauth/callback'},
        knownAuthorities: ['tenant.ciamlogin.com'],
      );

      expect(config.issuer, 'https://tenant.ciamlogin.com/tenant-id/v2.0');
      expect(
        config.authorizationEndpoint,
        'https://tenant.ciamlogin.com/tenant-id/oauth2/v2.0/authorize',
      );
      expect(
        config.tokenEndpoint,
        'https://tenant.ciamlogin.com/tenant-id/oauth2/v2.0/token',
      );
      expect(
        config.discoveryUrl,
        'https://tenant.ciamlogin.com/tenant-id/v2.0/.well-known/openid-configuration?p=B2C_1_signupsignin',
      );
    });
  });

  group('OAuth2Service initialization', () {
    test('does not fetch remote config during initialization', () async {
      when(
        () => mockStorage.read(key: any(named: 'key')),
      ).thenAnswer((_) async => null);

      final service = OAuth2Service(dio: mockDio, secureStorage: mockStorage);
      await service.initialize();

      verifyNever(() => mockDio.get<Map<String, dynamic>>(any()));
      service.dispose();
    });

    test('uses cached token when present and not expired', () async {
      when(() => mockStorage.read(key: 'access_token')).thenAnswer(
        (_) async => 'cached-token',
      );
      when(() => mockStorage.read(key: 'expires_on')).thenAnswer(
        (_) async =>
            DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );

      final service = OAuth2Service(dio: mockDio, secureStorage: mockStorage);
      await service.initialize();

      expect(service.currentState, AuthState.authenticated);
      service.dispose();
    });
  });

  group('AuthResult', () {
    test('isExpired detects past expiry', () {
      final result = AuthResult(
        accessToken: 'token',
        expiresOn: DateTime.now().subtract(const Duration(minutes: 1)),
      );

      expect(result.isExpired, isTrue);
    });

    test('isExpired accepts future expiry', () {
      final result = AuthResult(
        accessToken: 'token',
        expiresOn: DateTime.now().add(const Duration(minutes: 1)),
      );

      expect(result.isExpired, isFalse);
    });
  });

  group('OAuth2Service cacheToken', () {
    test('stores token fields', () async {
      when(
        () => mockStorage.write(
          key: any(named: 'key'),
          value: any(named: 'value'),
        ),
      ).thenAnswer((_) async {});

      final service = OAuth2Service(dio: mockDio, secureStorage: mockStorage);
      final expiry = DateTime(2025, 6, 1);
      final result = AuthResult(
        accessToken: 'access',
        refreshToken: 'refresh',
        idToken: 'id-token',
        expiresOn: expiry,
        accountId: 'account-1',
      );

      await service.cacheToken(result);

      verify(() => mockStorage.write(key: 'access_token', value: 'access'))
          .called(1);
      verify(() => mockStorage.write(key: 'id_token', value: 'id-token'))
          .called(1);
      verify(
        () => mockStorage.write(
          key: 'expires_on',
          value: expiry.toIso8601String(),
        ),
      ).called(1);
      verify(() => mockStorage.write(key: 'account_id', value: 'account-1'))
          .called(1);
      service.dispose();
    });
  });

  group('OAuth2Service mapAppAuthException', () {
    test('maps common app auth errors', () {
      final service = OAuth2Service(dio: mockDio, secureStorage: mockStorage);

      expect(
        service
            .mapAppAuthException(
              PlatformException(code: 'user_cancel', message: 'cancelled'),
            )
            .error,
        AuthError.cancelled,
      );
      expect(
        service
            .mapAppAuthException(
              PlatformException(code: 'network_error', message: 'timeout'),
            )
            .error,
        AuthError.network,
      );
      expect(
        service
            .mapAppAuthException(
              PlatformException(code: 'auth', message: 'AADB2C90118'),
            )
            .error,
        AuthError.policyNotFound,
      );

      service.dispose();
    });
  });
}
