import 'package:flutter_test/flutter_test.dart';
import 'package:asora/services/oauth2_service.dart';

void main() {
  // ─── AuthConfig ───
  group('AuthConfig', () {
    test('fromJson parses all fields', () {
      final json = {
        'tenant': 'mytenant.onmicrosoft.com',
        'tenantId': 'abc-123',
        'clientId': 'client-1',
        'policy': 'B2C_1_signin',
        'authorityHost': 'mytenant.ciamlogin.com',
        'scopes': ['openid', 'offline_access'],
        'redirectUris': {'android': 'com.app://auth', 'ios': 'msal://auth'},
        'knownAuthorities': ['mytenant.ciamlogin.com'],
        'googleIdpHint': 'Google',
      };

      final config = AuthConfig.fromJson(json);
      expect(config.tenant, 'mytenant.onmicrosoft.com');
      expect(config.tenantId, 'abc-123');
      expect(config.clientId, 'client-1');
      expect(config.policy, 'B2C_1_signin');
      expect(config.authorityHost, 'mytenant.ciamlogin.com');
      expect(config.scopes, ['openid', 'offline_access']);
      expect(config.redirectUris['android'], 'com.app://auth');
      expect(config.knownAuthorities, ['mytenant.ciamlogin.com']);
      expect(config.googleIdpHint, 'Google');
    });

    test('fromJson with null optional fields', () {
      final json = {
        'tenant': 't.onmicrosoft.com',
        'clientId': 'c1',
        'policy': 'P1',
        'authorityHost': 'host.com',
        'scopes': <dynamic>[],
        'redirectUris': <String, dynamic>{},
        'knownAuthorities': <dynamic>[],
      };

      final config = AuthConfig.fromJson(json);
      expect(config.tenantId, isNull);
      expect(config.googleIdpHint, isNull);
    });

    test('discoveryUrl uses tenantId when available', () {
      const config = AuthConfig(
        tenant: 'mytenant.onmicrosoft.com',
        tenantId: 'abc-123',
        clientId: 'c1',
        policy: 'B2C_1_signin',
        authorityHost: 'mytenant.ciamlogin.com',
        scopes: [],
        redirectUris: {},
        knownAuthorities: [],
      );

      expect(config.discoveryUrl, contains('abc-123'));
      expect(config.discoveryUrl, contains('p=B2C_1_signin'));
    });

    test('discoveryUrl uses tenant when tenantId is null', () {
      const config = AuthConfig(
        tenant: 'mytenant.onmicrosoft.com',
        clientId: 'c1',
        policy: 'B2C_1_signin',
        authorityHost: 'mytenant.ciamlogin.com',
        scopes: [],
        redirectUris: {},
        knownAuthorities: [],
      );

      expect(config.discoveryUrl, contains('mytenant.onmicrosoft.com'));
    });

    test('discoveryUrl uses tenant when tenantId is empty', () {
      const config = AuthConfig(
        tenant: 'mytenant.onmicrosoft.com',
        tenantId: '',
        clientId: 'c1',
        policy: 'P1',
        authorityHost: 'host.com',
        scopes: [],
        redirectUris: {},
        knownAuthorities: [],
      );

      expect(config.discoveryUrl, contains('mytenant.onmicrosoft.com'));
    });

    test('issuer uses tenantId when available', () {
      const config = AuthConfig(
        tenant: 'mytenant.onmicrosoft.com',
        tenantId: 'abc-123',
        clientId: 'c1',
        policy: 'P1',
        authorityHost: 'host.com',
        scopes: [],
        redirectUris: {},
        knownAuthorities: [],
      );

      expect(config.issuer, 'https://host.com/abc-123/v2.0');
    });

    test('authorizationEndpoint includes tenantPath', () {
      const config = AuthConfig(
        tenant: 't.onmicrosoft.com',
        tenantId: 'tid',
        clientId: 'c1',
        policy: 'P1',
        authorityHost: 'host.com',
        scopes: [],
        redirectUris: {},
        knownAuthorities: [],
      );

      expect(
        config.authorizationEndpoint,
        'https://host.com/tid/oauth2/v2.0/authorize',
      );
    });

    test('tokenEndpoint includes tenantPath', () {
      const config = AuthConfig(
        tenant: 't.onmicrosoft.com',
        tenantId: 'tid',
        clientId: 'c1',
        policy: 'P1',
        authorityHost: 'host.com',
        scopes: [],
        redirectUris: {},
        knownAuthorities: [],
      );

      expect(config.tokenEndpoint, 'https://host.com/tid/oauth2/v2.0/token');
    });

    test('endSessionEndpoint includes tenantPath', () {
      const config = AuthConfig(
        tenant: 't.onmicrosoft.com',
        tenantId: 'tid',
        clientId: 'c1',
        policy: 'P1',
        authorityHost: 'host.com',
        scopes: [],
        redirectUris: {},
        knownAuthorities: [],
      );

      expect(
        config.endSessionEndpoint,
        'https://host.com/tid/oauth2/v2.0/logout',
      );
    });

    test('fallbackRedirectUri uses clientId', () {
      const config = AuthConfig(
        tenant: 't.onmicrosoft.com',
        clientId: 'my-client-id',
        policy: 'P1',
        authorityHost: 'host.com',
        scopes: [],
        redirectUris: {},
        knownAuthorities: [],
      );

      // When platform URIs not available, defaults to msal scheme
      // On Linux test platform this will use the fallback
      expect(config.redirectUri, 'msalmy-client-id://auth');
    });

    test('fromEnvironment returns valid config', () {
      final config = AuthConfig.fromEnvironment();
      expect(config.tenant, isNotEmpty);
      expect(config.clientId, isNotEmpty);
      expect(config.policy, isNotEmpty);
      expect(config.authorityHost, isNotEmpty);
      expect(config.scopes, isNotEmpty);
      expect(config.knownAuthorities, isNotEmpty);
    });
  });

  // ─── AuthResult ───
  group('AuthResult', () {
    test('isExpired returns true when token is expired', () {
      final result = AuthResult(
        accessToken: 'tok',
        expiresOn: DateTime.now().subtract(const Duration(hours: 1)),
      );
      expect(result.isExpired, isTrue);
    });

    test('isExpired returns false when token is valid', () {
      final result = AuthResult(
        accessToken: 'tok',
        expiresOn: DateTime.now().add(const Duration(hours: 1)),
      );
      expect(result.isExpired, isFalse);
    });

    test('stores all fields', () {
      final expiresOn = DateTime(2025, 1, 1);
      final result = AuthResult(
        accessToken: 'access',
        refreshToken: 'refresh',
        idToken: 'id',
        expiresOn: expiresOn,
        accountId: 'acc1',
      );
      expect(result.accessToken, 'access');
      expect(result.refreshToken, 'refresh');
      expect(result.idToken, 'id');
      expect(result.expiresOn, expiresOn);
      expect(result.accountId, 'acc1');
    });

    test('optional fields can be null', () {
      final result = AuthResult(accessToken: 'tok', expiresOn: DateTime(2025));
      expect(result.refreshToken, isNull);
      expect(result.idToken, isNull);
      expect(result.accountId, isNull);
    });
  });

  // ─── AuthException ───
  group('AuthException', () {
    test('toString includes message and error type', () {
      const ex = AuthException(AuthError.network, 'Network failed');
      expect(ex.toString(), contains('Network failed'));
      expect(ex.toString(), contains('network'));
    });

    test('preserves original error', () {
      final original = Exception('root cause');
      final ex = AuthException(AuthError.unknown, 'wrapped', original);
      expect(ex.originalError, original);
      expect(ex.error, AuthError.unknown);
      expect(ex.message, 'wrapped');
    });

    test('all error types', () {
      expect(AuthError.cancelled.name, 'cancelled');
      expect(AuthError.network.name, 'network');
      expect(AuthError.policyNotFound.name, 'policyNotFound');
      expect(AuthError.accountUnavailable.name, 'accountUnavailable');
      expect(AuthError.transient.name, 'transient');
      expect(AuthError.unknown.name, 'unknown');
    });
  });

  // ─── AuthState enum ───
  group('AuthState enum', () {
    test('all values exist', () {
      expect(AuthState.values, hasLength(4));
      expect(AuthState.unauthenticated, isNotNull);
      expect(AuthState.authenticating, isNotNull);
      expect(AuthState.authenticated, isNotNull);
      expect(AuthState.error, isNotNull);
    });
  });
}
