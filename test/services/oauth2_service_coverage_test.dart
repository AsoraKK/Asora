import 'package:flutter_test/flutter_test.dart';
import 'package:asora/services/oauth2_service.dart';

void main() {
  group('AuthConfig', () {
    AuthConfig makeConfig({
      String? tenantId,
      String tenant = 'test.onmicrosoft.com',
      String clientId = 'client-123',
    }) {
      return AuthConfig(
        tenant: tenant,
        tenantId: tenantId,
        clientId: clientId,
        policy: 'B2C_1_signupsignin',
        authorityHost: 'test.ciamlogin.com',
        scopes: const ['openid', 'offline_access'],
        redirectUris: const {
          'android': 'com.test://callback',
          'ios': 'msalclient-123://auth',
        },
        knownAuthorities: const ['test.ciamlogin.com'],
        googleIdpHint: 'Google',
      );
    }

    test('discoveryUrl uses tenantId when available', () {
      final config = makeConfig(tenantId: 'tid-123');
      expect(config.discoveryUrl, contains('tid-123'));
      expect(config.discoveryUrl, contains('openid-configuration'));
      expect(config.discoveryUrl, contains('p=B2C_1_signupsignin'));
    });

    test('discoveryUrl falls back to tenant name without tenantId', () {
      final config = makeConfig(tenantId: null);
      expect(config.discoveryUrl, contains('test.onmicrosoft.com'));
    });

    test('discoveryUrl falls back to tenant name with empty tenantId', () {
      final config = makeConfig(tenantId: '');
      expect(config.discoveryUrl, contains('test.onmicrosoft.com'));
    });

    test('issuer uses tenantId path', () {
      final config = makeConfig(tenantId: 'tid');
      expect(config.issuer, 'https://test.ciamlogin.com/tid/v2.0');
    });

    test('authorizationEndpoint is correct', () {
      final config = makeConfig(tenantId: 'tid');
      expect(
        config.authorizationEndpoint,
        'https://test.ciamlogin.com/tid/oauth2/v2.0/authorize',
      );
    });

    test('tokenEndpoint is correct', () {
      final config = makeConfig(tenantId: 'tid');
      expect(
        config.tokenEndpoint,
        'https://test.ciamlogin.com/tid/oauth2/v2.0/token',
      );
    });

    test('endSessionEndpoint is correct', () {
      final config = makeConfig(tenantId: 'tid');
      expect(
        config.endSessionEndpoint,
        'https://test.ciamlogin.com/tid/oauth2/v2.0/logout',
      );
    });

    test('redirectUri uses fallback pattern', () {
      // Default target platform is android in test
      final config = makeConfig();
      // Should return the android redirect or fallback
      expect(config.redirectUri, isNotEmpty);
    });

    test('fromJson parses all fields', () {
      final config = AuthConfig.fromJson(const {
        'tenant': 'tenant.com',
        'tenantId': 'tid',
        'clientId': 'cid',
        'policy': 'policy',
        'authorityHost': 'host.com',
        'scopes': ['openid'],
        'redirectUris': {'android': 'a://cb'},
        'knownAuthorities': ['host.com'],
        'googleIdpHint': 'Google',
      });
      expect(config.tenant, 'tenant.com');
      expect(config.tenantId, 'tid');
      expect(config.clientId, 'cid');
      expect(config.scopes, ['openid']);
      expect(config.redirectUris['android'], 'a://cb');
      expect(config.googleIdpHint, 'Google');
    });

    test('fromJson with null optional fields', () {
      final config = AuthConfig.fromJson(const {
        'tenant': 't',
        'clientId': 'c',
        'policy': 'p',
        'authorityHost': 'h',
        'scopes': <dynamic>[],
        'redirectUris': <String, dynamic>{},
        'knownAuthorities': <dynamic>[],
      });
      expect(config.tenantId, isNull);
      expect(config.googleIdpHint, isNull);
    });

    test('fromEnvironment creates with defaults', () {
      final config = AuthConfig.fromEnvironment();
      expect(config.tenant, isNotEmpty);
      expect(config.clientId, isNotEmpty);
      expect(config.policy, isNotEmpty);
      expect(config.scopes, isNotEmpty);
    });
  });

  group('AuthResult', () {
    test('isExpired returns false for future date', () {
      final result = AuthResult(
        accessToken: 'tok',
        expiresOn: DateTime.now().add(const Duration(hours: 1)),
      );
      expect(result.isExpired, isFalse);
    });

    test('isExpired returns true for past date', () {
      final result = AuthResult(
        accessToken: 'tok',
        expiresOn: DateTime.now().subtract(const Duration(hours: 1)),
      );
      expect(result.isExpired, isTrue);
    });

    test('optional fields are null by default', () {
      final result = AuthResult(accessToken: 'tok', expiresOn: DateTime.now());
      expect(result.refreshToken, isNull);
      expect(result.idToken, isNull);
      expect(result.accountId, isNull);
    });

    test('stores all fields', () {
      final result = AuthResult(
        accessToken: 'at',
        refreshToken: 'rt',
        idToken: 'it',
        expiresOn: DateTime(2025, 12, 31),
        accountId: 'acct',
      );
      expect(result.accessToken, 'at');
      expect(result.refreshToken, 'rt');
      expect(result.idToken, 'it');
      expect(result.accountId, 'acct');
    });
  });

  group('AuthException', () {
    test('toString includes message and error name', () {
      const e = AuthException(AuthError.cancelled, 'User cancelled');
      expect(e.toString(), 'AuthException: User cancelled (cancelled)');
    });

    test('stores original error', () {
      final orig = Exception('root');
      final e = AuthException(AuthError.network, 'net', orig);
      expect(e.originalError, orig);
    });
  });

  group('AuthState', () {
    test('all values exist', () {
      expect(AuthState.values.length, 4);
      expect(AuthState.values, contains(AuthState.unauthenticated));
      expect(AuthState.values, contains(AuthState.authenticating));
      expect(AuthState.values, contains(AuthState.authenticated));
      expect(AuthState.values, contains(AuthState.error));
    });
  });

  group('AuthError', () {
    test('all values exist', () {
      expect(AuthError.values.length, 6);
      expect(AuthError.values, contains(AuthError.cancelled));
      expect(AuthError.values, contains(AuthError.network));
      expect(AuthError.values, contains(AuthError.policyNotFound));
      expect(AuthError.values, contains(AuthError.accountUnavailable));
      expect(AuthError.values, contains(AuthError.transient));
      expect(AuthError.values, contains(AuthError.unknown));
    });
  });
}
