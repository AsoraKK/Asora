import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart' as http_testing;

import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';

/// In-memory FlutterSecureStorage for testing.
class _MemoryStorage implements FlutterSecureStorage {
  final Map<String, String> _store = {};

  Map<String, String> get store => Map.unmodifiable(_store);

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

Map<String, dynamic> _userJson({String id = 'u1'}) => {
  'id': id,
  'email': 'test@test.com',
  'name': 'Test User',
  'role': 'user',
  'tier': 'free',
  'reputationScore': 0,
  'createdAt': '2024-01-01T00:00:00Z',
  'lastLoginAt': '2024-06-01T00:00:00Z',
};

void main() {
  late _MemoryStorage storage;

  setUp(() {
    storage = _MemoryStorage();
  });

  // ────── OAuth2Config ──────

  group('OAuth2Config', () {
    test('scopes splits by whitespace', () {
      final scopes = OAuth2Config.scopes;
      expect(scopes, isA<List<String>>());
      expect(scopes, isNotEmpty);
      // Default contains 'openid email profile offline_access'
      expect(scopes, contains('openid'));
    });

    test('scope returns raw scope string', () {
      expect(OAuth2Config.scope, isA<String>());
      expect(OAuth2Config.scope, isNotEmpty);
    });

    test('redirectUri returns platform-specific URI', () {
      final uri = OAuth2Config.redirectUri;
      expect(uri, isA<String>());
      expect(uri, isNotEmpty);
    });

    test('serviceConfiguration has endpoints', () {
      final config = OAuth2Config.serviceConfiguration;
      expect(config.authorizationEndpoint, isNotEmpty);
      expect(config.tokenEndpoint, isNotEmpty);
    });

    test('postLogoutRedirectUri returns non-null', () {
      final uri = OAuth2Config.postLogoutRedirectUri;
      // On non-web, falls back to redirectUri
      expect(uri, isNotNull);
    });

    test('endpoint constants are non-empty', () {
      expect(OAuth2Config.authorizationEndpoint, isNotEmpty);
      expect(OAuth2Config.tokenEndpoint, isNotEmpty);
      expect(OAuth2Config.userInfoEndpoint, isNotEmpty);
      expect(OAuth2Config.clientId, isNotEmpty);
    });

    test('IDP hints have defaults', () {
      expect(OAuth2Config.googleIdpHint, isNotEmpty);
      expect(OAuth2Config.appleIdpHint, isNotEmpty);
      expect(OAuth2Config.worldIdpHint, isNotEmpty);
    });
  });

  // ────── OAuth2Provider enum ──────

  group('OAuth2Provider', () {
    test('has all expected values', () {
      expect(OAuth2Provider.values, hasLength(4));
      expect(OAuth2Provider.values, contains(OAuth2Provider.google));
      expect(OAuth2Provider.values, contains(OAuth2Provider.apple));
      expect(OAuth2Provider.values, contains(OAuth2Provider.world));
      expect(OAuth2Provider.values, contains(OAuth2Provider.email));
    });
  });

  // ────── OAuth2Service._buildAdditionalParameters ──────

  group('OAuth2Service._buildAdditionalParameters via signInWithOAuth2', () {
    // We cant directly test private methods, but we test the config/factory paths
  });

  // ────── getStoredUser ──────

  group('getStoredUser', () {
    test('returns null when no stored user', () async {
      final service = OAuth2Service(secureStorage: storage);
      final user = await service.getStoredUser();
      expect(user, isNull);
    });

    test('returns user when valid JSON stored', () async {
      await storage.write(
        key: 'oauth2_user_data',
        value: jsonEncode(_userJson()),
      );
      final service = OAuth2Service(secureStorage: storage);
      final user = await service.getStoredUser();
      expect(user, isNotNull);
      expect(user!.id, 'u1');
    });

    test('returns null and cleans up invalid JSON', () async {
      await storage.write(key: 'oauth2_user_data', value: 'not-json');
      final service = OAuth2Service(secureStorage: storage);
      final user = await service.getStoredUser();
      expect(user, isNull);
      // Should have cleaned up the invalid entry
      expect(await storage.read(key: 'oauth2_user_data'), isNull);
    });

    test('returns null for non-map JSON', () async {
      await storage.write(key: 'oauth2_user_data', value: '"just a string"');
      final service = OAuth2Service(secureStorage: storage);
      final user = await service.getStoredUser();
      expect(user, isNull);
    });
  });

  // ────── isSignedIn / _isTokenValid ──────

  group('isSignedIn', () {
    test('returns false without token or expiry', () async {
      final service = OAuth2Service(secureStorage: storage);
      expect(await service.isSignedIn(), isFalse);
    });

    test('returns false with token but no expiry', () async {
      await storage.write(key: 'oauth2_access_token', value: 'token');
      final service = OAuth2Service(secureStorage: storage);
      expect(await service.isSignedIn(), isFalse);
    });

    test('returns false with expiry but no token', () async {
      await storage.write(
        key: 'oauth2_token_expiry',
        value: DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );
      final service = OAuth2Service(secureStorage: storage);
      expect(await service.isSignedIn(), isFalse);
    });

    test('returns true when token is valid and not expired', () async {
      await storage.write(key: 'oauth2_access_token', value: 'token');
      await storage.write(
        key: 'oauth2_token_expiry',
        value: DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );
      final service = OAuth2Service(secureStorage: storage);
      expect(await service.isSignedIn(), isTrue);
    });

    test('returns false when token is expired', () async {
      await storage.write(key: 'oauth2_access_token', value: 'token');
      await storage.write(
        key: 'oauth2_token_expiry',
        value: DateTime.now()
            .subtract(const Duration(hours: 1))
            .toIso8601String(),
      );
      final service = OAuth2Service(secureStorage: storage);
      expect(await service.isSignedIn(), isFalse);
    });

    test('returns false when expiry is invalid format', () async {
      await storage.write(key: 'oauth2_access_token', value: 'token');
      await storage.write(key: 'oauth2_token_expiry', value: 'not-a-date');
      final service = OAuth2Service(secureStorage: storage);
      expect(await service.isSignedIn(), isFalse);
      // Should have cleaned up invalid expiry
      expect(await storage.read(key: 'oauth2_token_expiry'), isNull);
    });
  });

  // ────── getAccessToken ──────

  group('getAccessToken', () {
    test('returns token when valid and not expired', () async {
      await storage.write(key: 'oauth2_access_token', value: 'my-token');
      await storage.write(
        key: 'oauth2_token_expiry',
        value: DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );
      final service = OAuth2Service(secureStorage: storage);
      final token = await service.getAccessToken();
      expect(token, 'my-token');
    });

    test('returns null when expired and no refresh token', () async {
      await storage.write(key: 'oauth2_access_token', value: 'expired');
      await storage.write(
        key: 'oauth2_token_expiry',
        value: DateTime.now()
            .subtract(const Duration(hours: 1))
            .toIso8601String(),
      );
      final service = OAuth2Service(secureStorage: storage);
      final token = await service.getAccessToken();
      expect(token, isNull);
    });

    test('returns null when no tokens stored', () async {
      final service = OAuth2Service(secureStorage: storage);
      final token = await service.getAccessToken();
      expect(token, isNull);
    });
  });

  // ────── signOut ──────

  group('signOut', () {
    test('clears all stored tokens', () async {
      await storage.write(key: 'oauth2_access_token', value: 'at');
      await storage.write(key: 'oauth2_refresh_token', value: 'rt');
      await storage.write(key: 'oauth2_id_token', value: 'it');
      await storage.write(key: 'oauth2_token_expiry', value: 'exp');
      await storage.write(key: 'oauth2_user_data', value: 'ud');

      final service = OAuth2Service(secureStorage: storage);
      await service.signOut();

      expect(await storage.read(key: 'oauth2_access_token'), isNull);
      expect(await storage.read(key: 'oauth2_refresh_token'), isNull);
      expect(await storage.read(key: 'oauth2_id_token'), isNull);
      expect(await storage.read(key: 'oauth2_token_expiry'), isNull);
      expect(await storage.read(key: 'oauth2_user_data'), isNull);
    });

    test('signOut with no id token just clears tokens', () async {
      await storage.write(key: 'oauth2_access_token', value: 'at');

      final service = OAuth2Service(secureStorage: storage);
      await service.signOut();

      expect(await storage.read(key: 'oauth2_access_token'), isNull);
    });
  });

  // ────── getUserInfo ──────

  group('getUserInfo', () {
    test('returns cached user when available', () async {
      await storage.write(
        key: 'oauth2_user_data',
        value: jsonEncode(_userJson()),
      );
      final service = OAuth2Service(secureStorage: storage);
      final user = await service.getUserInfo();
      expect(user, isNotNull);
      expect(user!.id, 'u1');
    });

    test('returns null when no cached user and no token', () async {
      final service = OAuth2Service(secureStorage: storage);
      final user = await service.getUserInfo();
      expect(user, isNull);
    });

    test(
      'fetches user from server when valid token but no cached user',
      () async {
        await storage.write(key: 'oauth2_access_token', value: 'token');
        await storage.write(
          key: 'oauth2_token_expiry',
          value: DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
        );

        final client = http_testing.MockClient((request) async {
          expect(request.headers['Authorization'], 'Bearer token');
          return http.Response(
            jsonEncode({'user': _userJson(id: 'fetched')}),
            200,
          );
        });

        final service = OAuth2Service(
          secureStorage: storage,
          httpClient: client,
        );
        final user = await service.getUserInfo();
        expect(user, isNotNull);
        expect(user!.id, 'fetched');
      },
    );

    test('returns null when fetch fails', () async {
      await storage.write(key: 'oauth2_access_token', value: 'token');
      await storage.write(
        key: 'oauth2_token_expiry',
        value: DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );

      final client = http_testing.MockClient((request) async {
        return http.Response('error', 500);
      });

      final service = OAuth2Service(secureStorage: storage, httpClient: client);
      final user = await service.getUserInfo();
      expect(user, isNull);
    });
  });

  // ────── _fetchAndCacheUser ──────

  group('fetchAndCacheUser (via getUserInfo)', () {
    test('handles user in response root', () async {
      await storage.write(key: 'oauth2_access_token', value: 'token');
      await storage.write(
        key: 'oauth2_token_expiry',
        value: DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );

      final client = http_testing.MockClient((request) async {
        // Response without 'user' wrapper - data directly in root
        return http.Response(jsonEncode(_userJson(id: 'root')), 200);
      });

      final service = OAuth2Service(secureStorage: storage, httpClient: client);
      final user = await service.getUserInfo();
      expect(user, isNotNull);
      expect(user!.id, 'root');
    });

    test('handles empty response body', () async {
      await storage.write(key: 'oauth2_access_token', value: 'token');
      await storage.write(
        key: 'oauth2_token_expiry',
        value: DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );

      final client = http_testing.MockClient((request) async {
        return http.Response(jsonEncode({}), 200);
      });

      final service = OAuth2Service(secureStorage: storage, httpClient: client);
      final user = await service.getUserInfo();
      expect(user, isNull);
    });

    test('handles network error gracefully', () async {
      await storage.write(key: 'oauth2_access_token', value: 'token');
      await storage.write(
        key: 'oauth2_token_expiry',
        value: DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );

      final client = http_testing.MockClient((request) async {
        throw Exception('timeout');
      });

      final service = OAuth2Service(secureStorage: storage, httpClient: client);
      final user = await service.getUserInfo();
      expect(user, isNull);
    });
  });

  // ────── refreshToken ──────

  group('refreshToken', () {
    test('returns null when no refresh token stored', () async {
      final service = OAuth2Service(secureStorage: storage);
      final result = await service.refreshToken();
      expect(result, isNull);
    });

    test('returns null when refresh token is empty', () async {
      await storage.write(key: 'oauth2_refresh_token', value: '');
      final service = OAuth2Service(secureStorage: storage);
      final result = await service.refreshToken();
      expect(result, isNull);
    });
  });

  // ────── Debug APIs ──────

  group('Debug APIs', () {
    test('debugBuildAuthorizationUrl returns valid URL', () {
      final service = OAuth2Service(secureStorage: storage);
      final url = service.debugBuildAuthorizationUrl(
        codeChallenge: 'challenge123',
        state: 'state456',
        nonce: 'nonce789',
      );

      expect(url, contains('response_type=code'));
      expect(url, contains('client_id='));
      expect(url, contains('code_challenge=challenge123'));
      expect(url, contains('state=state456'));
      expect(url, contains('nonce=nonce789'));
      expect(url, contains('code_challenge_method=S256'));
    });

    test('debugHandleCallback completes with code', () async {
      final service = OAuth2Service(secureStorage: storage);
      final future = service.debugStartAndWaitForCode();

      service.debugHandleCallback(Uri.parse('https://cb?code=abc123'));
      final code = await future;
      expect(code, 'abc123');
    });

    test('debugHandleCallback completes with error on error param', () async {
      final service = OAuth2Service(secureStorage: storage);
      final future = service.debugStartAndWaitForCode();

      service.debugHandleCallback(
        Uri.parse('https://cb?error=access_denied&error_description=denied'),
      );

      expect(() => future, throwsA(isA<AuthFailure>()));
    });

    test('debugHandleCallback completes with error when no code', () async {
      final service = OAuth2Service(secureStorage: storage);
      final future = service.debugStartAndWaitForCode();

      service.debugHandleCallback(Uri.parse('https://cb?state=abc'));
      expect(() => future, throwsA(isA<AuthFailure>()));
    });

    test('getWebHref returns null by default', () {
      final service = OAuth2Service(secureStorage: storage);
      expect(service.getWebHref(), isNull);
    });
  });
}
