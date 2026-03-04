import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart' as http_testing;

import 'package:asora/features/auth/application/oauth2_service.dart';

/// In-memory secure storage for testing.
class _MemoryStorage implements FlutterSecureStorage {
  final Map<String, String> _store = {};

  @override
  Future<void> write({
    required String key,
    required String? value,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (value == null) {
      _store.remove(key);
    } else {
      _store[key] = value;
    }
  }

  @override
  Future<String?> read({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async => _store[key];

  @override
  Future<void> delete({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    _store.remove(key);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  // ─────── OAuth2Config ───────

  group('OAuth2Config', () {
    test('static const endpoints are non-empty strings', () {
      expect(OAuth2Config.authorizationEndpoint, isNotEmpty);
      expect(OAuth2Config.tokenEndpoint, isNotEmpty);
      expect(OAuth2Config.userInfoEndpoint, isNotEmpty);
      expect(OAuth2Config.clientId, isNotEmpty);
    });

    test('scopes splits scopeString', () {
      final scopes = OAuth2Config.scopes;
      expect(scopes, isNotEmpty);
      // Default: 'openid email profile offline_access'
      expect(scopes, contains('openid'));
    });

    test('scope alias equals scopeString', () {
      expect(OAuth2Config.scope, OAuth2Config.scopeString);
    });

    test('serviceConfiguration returns valid config', () {
      final config = OAuth2Config.serviceConfiguration;
      expect(config.authorizationEndpoint, OAuth2Config.authorizationEndpoint);
      expect(config.tokenEndpoint, OAuth2Config.tokenEndpoint);
    });

    test('postLogoutRedirectUri returns non-null on non-web', () {
      // In test environment, kIsWeb is false
      final uri = OAuth2Config.postLogoutRedirectUri;
      expect(uri, isNotNull);
    });

    test('redirectUri returns platform-specific value on non-web', () {
      final uri = OAuth2Config.redirectUri;
      expect(uri, isNotEmpty);
    });

    test('idp hints have default values', () {
      expect(OAuth2Config.googleIdpHint, 'Google');
      expect(OAuth2Config.appleIdpHint, 'Apple');
      expect(OAuth2Config.worldIdpHint, 'World');
    });
  });

  // ─────── OAuth2Provider ───────

  group('OAuth2Provider', () {
    test('has all expected values', () {
      expect(OAuth2Provider.values, hasLength(4));
      expect(OAuth2Provider.values, contains(OAuth2Provider.google));
      expect(OAuth2Provider.values, contains(OAuth2Provider.apple));
      expect(OAuth2Provider.values, contains(OAuth2Provider.world));
      expect(OAuth2Provider.values, contains(OAuth2Provider.email));
    });
  });

  // ─────── OAuth2Service (pure unit tests — no AppAuth calls) ───────

  group('OAuth2Service', () {
    late _MemoryStorage storage;

    setUp(() {
      storage = _MemoryStorage();
    });

    test('isSignedIn returns false with no token', () async {
      final service = OAuth2Service(secureStorage: storage);
      expect(await service.isSignedIn(), isFalse);
    });

    test('isSignedIn returns false when token expired', () async {
      await storage.write(key: 'oauth2_access_token', value: 'tok');
      await storage.write(
        key: 'oauth2_token_expiry',
        value: DateTime.now()
            .subtract(const Duration(hours: 1))
            .toIso8601String(),
      );
      final service = OAuth2Service(secureStorage: storage);
      expect(await service.isSignedIn(), isFalse);
    });

    test('isSignedIn returns true when token valid', () async {
      await storage.write(key: 'oauth2_access_token', value: 'tok');
      await storage.write(
        key: 'oauth2_token_expiry',
        value: DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );
      final service = OAuth2Service(secureStorage: storage);
      expect(await service.isSignedIn(), isTrue);
    });

    test('getStoredUser returns null when nothing stored', () async {
      final service = OAuth2Service(secureStorage: storage);
      expect(await service.getStoredUser(), isNull);
    });

    test('getStoredUser returns user when valid JSON', () async {
      await storage.write(
        key: 'oauth2_user_data',
        value: jsonEncode({
          'id': 'u1',
          'email': 'a@b.com',
          'role': 'user',
          'tier': 'free',
          'reputationScore': 0,
          'createdAt': '2024-01-01T00:00:00Z',
          'lastLoginAt': '2024-06-01T00:00:00Z',
        }),
      );
      final service = OAuth2Service(secureStorage: storage);
      final user = await service.getStoredUser();
      expect(user, isNotNull);
      expect(user!.id, 'u1');
    });

    test('getStoredUser returns null for invalid JSON', () async {
      await storage.write(key: 'oauth2_user_data', value: 'not-json');
      final service = OAuth2Service(secureStorage: storage);
      final user = await service.getStoredUser();
      expect(user, isNull);
    });

    test('getAccessToken returns null when invalid', () async {
      final service = OAuth2Service(secureStorage: storage);
      final token = await service.getAccessToken();
      expect(token, isNull);
    });

    test('getAccessToken returns token when valid', () async {
      await storage.write(key: 'oauth2_access_token', value: 'my-token');
      await storage.write(
        key: 'oauth2_token_expiry',
        value: DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );
      final service = OAuth2Service(secureStorage: storage);
      final token = await service.getAccessToken();
      expect(token, 'my-token');
    });

    test('signOut clears stored tokens', () async {
      await storage.write(key: 'oauth2_access_token', value: 'tok');
      await storage.write(key: 'oauth2_refresh_token', value: 'ref');
      await storage.write(key: 'oauth2_id_token', value: 'id');
      await storage.write(key: 'oauth2_token_expiry', value: 'exp');
      await storage.write(key: 'oauth2_user_data', value: '{}');

      final service = OAuth2Service(secureStorage: storage);
      await service.signOut();

      expect(await storage.read(key: 'oauth2_access_token'), isNull);
      expect(await storage.read(key: 'oauth2_refresh_token'), isNull);
      expect(await storage.read(key: 'oauth2_id_token'), isNull);
      expect(await storage.read(key: 'oauth2_token_expiry'), isNull);
      expect(await storage.read(key: 'oauth2_user_data'), isNull);
    });

    test('getUserInfo returns stored user when available', () async {
      await storage.write(
        key: 'oauth2_user_data',
        value: jsonEncode({
          'id': 'u1',
          'email': 'a@b.com',
          'role': 'user',
          'tier': 'free',
          'reputationScore': 0,
          'createdAt': '2024-01-01T00:00:00Z',
          'lastLoginAt': '2024-06-01T00:00:00Z',
        }),
      );
      final service = OAuth2Service(secureStorage: storage);
      final user = await service.getUserInfo();
      expect(user, isNotNull);
      expect(user!.id, 'u1');
    });

    test('getUserInfo fetches from network when no cache', () async {
      await storage.write(key: 'oauth2_access_token', value: 'my-tok');
      await storage.write(
        key: 'oauth2_token_expiry',
        value: DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );

      final httpClient = http_testing.MockClient((request) async {
        return http.Response(
          jsonEncode({
            'user': {
              'id': 'u2',
              'email': 'b@c.com',
              'role': 'user',
              'tier': 'free',
              'reputationScore': 0,
              'createdAt': '2024-01-01T00:00:00Z',
              'lastLoginAt': '2024-06-01T00:00:00Z',
            },
          }),
          200,
        );
      });

      final service = OAuth2Service(
        secureStorage: storage,
        httpClient: httpClient,
      );
      final user = await service.getUserInfo();
      expect(user, isNotNull);
      expect(user!.id, 'u2');
    });

    test('getUserInfo returns null on 500', () async {
      await storage.write(key: 'oauth2_access_token', value: 'my-tok');
      await storage.write(
        key: 'oauth2_token_expiry',
        value: DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );

      final httpClient = http_testing.MockClient((request) async {
        return http.Response('Error', 500);
      });

      final service = OAuth2Service(
        secureStorage: storage,
        httpClient: httpClient,
      );
      final user = await service.getUserInfo();
      expect(user, isNull);
    });

    test('getUserInfo returns null when no access token', () async {
      final service = OAuth2Service(secureStorage: storage);
      final user = await service.getUserInfo();
      expect(user, isNull);
    });

    test('isTokenValid false for invalid expiry format', () async {
      await storage.write(key: 'oauth2_access_token', value: 'tok');
      await storage.write(key: 'oauth2_token_expiry', value: 'not-a-date');

      final service = OAuth2Service(secureStorage: storage);
      // _isTokenValid should return false, so isSignedIn returns false
      expect(await service.isSignedIn(), isFalse);
    });

    // ─── Debug / Test APIs ───

    test('debugBuildAuthorizationUrl constructs a valid URL', () {
      final service = OAuth2Service(secureStorage: storage);
      final url = service.debugBuildAuthorizationUrl(
        codeChallenge: 'challenge123',
        state: 'state123',
        nonce: 'nonce123',
      );
      expect(url, contains('client_id='));
      expect(url, contains('code_challenge=challenge123'));
      expect(url, contains('state=state123'));
      expect(url, contains('nonce=nonce123'));
      expect(url, contains('response_type=code'));
    });

    test('debugHandleCallback completes with code', () async {
      final service = OAuth2Service(secureStorage: storage);
      final future = service.debugStartAndWaitForCode();

      service.debugHandleCallback(Uri.parse('http://localhost?code=my-code'));

      final code = await future;
      expect(code, 'my-code');
    });

    test('debugHandleCallback completes with error on error param', () async {
      final service = OAuth2Service(secureStorage: storage);
      final future = service.debugStartAndWaitForCode();

      service.debugHandleCallback(
        Uri.parse(
          'http://localhost?error=access_denied&error_description=desc',
        ),
      );

      expect(future, throwsA(anything));
    });

    test('debugHandleCallback completes with error when no code', () async {
      final service = OAuth2Service(secureStorage: storage);
      final future = service.debugStartAndWaitForCode();

      service.debugHandleCallback(Uri.parse('http://localhost'));

      expect(future, throwsA(anything));
    });

    test('getWebHref returns null by default', () {
      final service = OAuth2Service(secureStorage: storage);
      expect(service.getWebHref(), isNull);
    });
  });
}
