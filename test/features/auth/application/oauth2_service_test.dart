import 'dart:convert';
import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';
import 'package:asora/core/auth/auth_session_manager.dart';

class _FakeSecureStorage extends FlutterSecureStorage {
  final Map<String, String> _data = {};

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
      _data.remove(key);
    } else {
      _data[key] = value;
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
  }) async => _data[key];

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
    _data.remove(key);
  }

  @override
  Future<void> deleteAll({
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    _data.clear();
  }

  String? get(String key) => _data[key];

  @override
  Future<bool> containsKey({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async => _data.containsKey(key);
}

class _ThrowingSecureStorage extends FlutterSecureStorage {
  @override
  Future<String?> read({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    throw Exception('Storage read error');
  }

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
    // Allow writes to succeed
  }

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
    // Allow deletes to succeed
  }

  @override
  Future<void> deleteAll({
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    // Allow deletes to succeed
  }

  @override
  Future<bool> containsKey({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    return false;
  }
}

class _FakeHttpClient extends http.BaseClient {
  final Map<String, http.Response Function(http.BaseRequest)> _routes = {};
  final List<http.BaseRequest> requests = [];

  void register(String url, http.Response Function(http.BaseRequest) handler) {
    _routes[url] = handler;
  }

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    requests.add(request);
    final key = request.url.toString();

    var handler = _routes[key];

    if (handler == null) {
      return http.StreamedResponse(
        Stream<List<int>>.fromIterable([utf8.encode('Not Found')]),
        404,
      );
    }

    final response = handler(request);
    return http.StreamedResponse(
      Stream<List<int>>.fromIterable([response.bodyBytes]),
      response.statusCode,
      headers: response.headers,
      reasonPhrase: response.reasonPhrase,
    );
  }
}

class _FakeAuthSessionManager extends AuthSessionManager {
  bool clearedAll = false;
  final List<String> completed = [];

  @override
  Future<AuthSessionState> createSession({
    required String state,
    required String nonce,
    required String codeChallenge,
    Duration? ttl,
  }) async {
    return AuthSessionState(
      id: 'session_123',
      state: state,
      nonce: nonce,
      codeVerifier: 'test_code_verifier',
      codeChallenge: codeChallenge,
      createdAt: DateTime.now(),
      ttl: ttl ?? const Duration(minutes: 10),
    );
  }

  @override
  Future<void> completeSession(String sessionId) async {
    completed.add(sessionId);
  }

  @override
  Future<void> clearAllSessions() async {
    clearedAll = true;
  }
}

User _sampleUser() => User(
  id: 'u1',
  email: 'u1@example.com',
  role: UserRole.user,
  tier: UserTier.bronze,
  reputationScore: 0,
  createdAt: DateTime.parse('2023-01-01T00:00:00Z'),
  lastLoginAt: DateTime.parse('2023-01-01T00:00:00Z'),
);

Map<String, dynamic> _userJson(User u) => u.toJson();

void main() {
  group('OAuth2Service Tests', () {
    late _FakeSecureStorage storage;
    late _FakeHttpClient httpClient;
    late _FakeAuthSessionManager sessionManager;
    late OAuth2Service service;

    setUp(() {
      TestWidgetsFlutterBinding.ensureInitialized();
      storage = _FakeSecureStorage();
      httpClient = _FakeHttpClient();
      sessionManager = _FakeAuthSessionManager();

      service = OAuth2Service(
        secureStorage: storage,
        httpClient: httpClient,
        sessionManager: sessionManager,
        launcher: (uri, {mode = LaunchMode.platformDefault}) async => true,
      );

      const MethodChannel(
        'plugins.flutter.io/url_launcher',
      ).setMockMethodCallHandler((_) async => true);
    });

    tearDown(() {
      const MethodChannel(
        'plugins.flutter.io/url_launcher',
      ).setMockMethodCallHandler(null);
    });

    group('OAuth2Config', () {
      test('has valid configuration', () {
        expect(OAuth2Config.authorizationEndpoint, isNotEmpty);
        expect(OAuth2Config.tokenEndpoint, isNotEmpty);
        expect(OAuth2Config.userInfoEndpoint, isNotEmpty);
        expect(OAuth2Config.clientId, isNotEmpty);
        expect(OAuth2Config.scope, contains('openid'));
        expect(OAuth2Config.redirectUri, isNotEmpty);
      });
    });

    group('OAuth2TokenResponse', () {
      test('creates from JSON correctly', () {
        final json = {
          'access_token': 'access123',
          'refresh_token': 'refresh123',
          'token_type': 'Bearer',
          'expires_in': 3600,
          'scope': 'openid email profile',
          'user': _userJson(_sampleUser()),
        };

        final response = OAuth2TokenResponse.fromJson(json);

        expect(response.accessToken, equals('access123'));
        expect(response.refreshToken, equals('refresh123'));
        expect(response.tokenType, equals('Bearer'));
        expect(response.expiresIn, equals(3600));
        expect(response.scope, equals('openid email profile'));
        expect(response.user.id, equals('u1'));
      });
    });

    group('refreshToken', () {
      test('returns user when refresh token exists', () async {
        await storage.write(key: 'oauth2_refresh_token', value: 'refresh1');

        httpClient.register(OAuth2Config.tokenEndpoint, (req) {
          return http.Response(
            jsonEncode({
              'access_token': 'access1',
              'token_type': 'Bearer',
              'expires_in': 3600,
              'scope': OAuth2Config.scope,
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        httpClient.register(OAuth2Config.userInfoEndpoint, (req) {
          return http.Response(
            jsonEncode(_userJson(_sampleUser())),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final user = await service.refreshToken();

        expect(user, isNotNull);
        expect(user!.id, equals('u1'));
        expect(storage.get('oauth2_access_token'), equals('access1'));
        expect(
          storage.get('oauth2_refresh_token'),
          equals('refresh1'),
        ); // Original refresh token remains
      });

      test('returns null when no refresh token', () async {
        final user = await service.refreshToken();
        expect(user, isNull);
      });

      test('returns null on HTTP error', () async {
        await storage.write(key: 'oauth2_refresh_token', value: 'refresh1');

        httpClient.register(OAuth2Config.tokenEndpoint, (req) {
          return http.Response('{"error": "invalid_grant"}', 400);
        });

        final user = await service.refreshToken();
        expect(user, isNull);
        expect(storage.get('oauth2_refresh_token'), isNull);
      });
    });

    group('getUserInfo', () {
      test('returns user when access token exists', () async {
        await storage.write(key: 'oauth2_access_token', value: 'access123');

        httpClient.register(OAuth2Config.userInfoEndpoint, (req) {
          expect(req.headers['Authorization'], equals('Bearer access123'));
          return http.Response(
            jsonEncode(_userJson(_sampleUser())),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final user = await service.getUserInfo();

        expect(user, isNotNull);
        expect(user!.id, equals('u1'));
        expect(await storage.containsKey(key: 'oauth2_user_data'), isTrue);
      });

      test('returns null when no access token', () async {
        final user = await service.getUserInfo();
        expect(user, isNull);
      });

      test('returns null on HTTP error', () async {
        await storage.write(key: 'oauth2_access_token', value: 'access123');

        httpClient.register(OAuth2Config.userInfoEndpoint, (req) {
          return http.Response('Unauthorized', 401);
        });

        final user = await service.getUserInfo();
        expect(user, isNull);
      });
    });

    group('isSignedIn', () {
      test('returns true when valid token exists', () async {
        await storage.write(key: 'oauth2_access_token', value: 'access123');
        final futureExpiry = DateTime.now().add(const Duration(hours: 1));
        await storage.write(
          key: 'oauth2_token_expiry',
          value: futureExpiry.toIso8601String(),
        );

        expect(await service.isSignedIn(), isTrue);
      });

      test('returns false when no access token', () async {
        expect(await service.isSignedIn(), isFalse);
      });

      test('returns false when token expired', () async {
        await storage.write(key: 'oauth2_access_token', value: 'access123');
        final pastExpiry = DateTime.now().subtract(const Duration(hours: 1));
        await storage.write(
          key: 'oauth2_token_expiry',
          value: pastExpiry.toIso8601String(),
        );

        expect(await service.isSignedIn(), isFalse);
      });
    });

    group('getAccessToken', () {
      test('returns token when valid', () async {
        await storage.write(key: 'oauth2_access_token', value: 'access123');
        final futureExpiry = DateTime.now().add(const Duration(hours: 1));
        await storage.write(
          key: 'oauth2_token_expiry',
          value: futureExpiry.toIso8601String(),
        );

        final token = await service.getAccessToken();
        expect(token, equals('access123'));
      });

      test('returns null when not signed in', () async {
        final token = await service.getAccessToken();
        expect(token, isNull);
      });
    });

    group('getStoredUser', () {
      test('returns user when stored', () async {
        final userData = jsonEncode(_userJson(_sampleUser()));
        await storage.write(key: 'oauth2_user_data', value: userData);

        final user = await service.getStoredUser();
        expect(user, isNotNull);
        expect(user!.id, equals('u1'));
      });

      test('returns null when no user stored', () async {
        final user = await service.getStoredUser();
        expect(user, isNull);
      });

      test('returns null on invalid JSON', () async {
        await storage.write(key: 'oauth2_user_data', value: 'invalid json');
        final user = await service.getStoredUser();
        expect(user, isNull);
      });
    });

    group('signOut', () {
      test('clears all data', () async {
        await storage.write(key: 'oauth2_access_token', value: 'access123');
        await storage.write(key: 'oauth2_refresh_token', value: 'refresh123');
        await storage.write(key: 'oauth2_user_data', value: '{"id": "user1"}');

        await service.signOut();

        expect(storage.get('oauth2_access_token'), isNull);
        expect(storage.get('oauth2_refresh_token'), isNull);
        expect(storage.get('oauth2_user_data'), isNull);
        expect(sessionManager.clearedAll, isTrue);
      });
    });

    group('signInWithOAuth2 error handling', () {
      test('throws error when launcher fails', () async {
        final failingService = OAuth2Service(
          secureStorage: storage,
          httpClient: httpClient,
          sessionManager: sessionManager,
          launcher: (uri, {mode = LaunchMode.platformDefault}) async => false,
        );

        expect(
          () => failingService.signInWithOAuth2(),
          throwsA(isA<AuthFailure>()),
        );
      });

      test('handles token exchange error', () async {
        httpClient.register(OAuth2Config.tokenEndpoint, (req) {
          return http.Response('{"error": "invalid_grant"}', 400);
        });

        expect(
          () => service.debugExchangeCode('auth123', 'verifier123'),
          throwsA(isA<AuthFailure>()),
        );
      });

      test('handles JSON decode error in token exchange', () async {
        httpClient.register(OAuth2Config.tokenEndpoint, (req) {
          return http.Response('invalid json', 200);
        });

        expect(
          () => service.debugExchangeCode('auth123', 'verifier123'),
          throwsA(isA<FormatException>()),
        );
      });

      test('handles callback URI with error', () async {
        final futureCode = service.debugStartAndWaitForCode();

        final errorUri = Uri.parse(
          'asora://auth?error=access_denied&error_description=User%20denied%20access',
        );
        service.debugHandleCallback(errorUri);

        expect(futureCode, throwsA(isA<AuthFailure>()));
      });

      test('handles callback URI with missing parameters', () async {
        final incompleteUri = Uri.parse('asora://auth');

        // This should not cause any exceptions
        expect(
          () => service.debugHandleCallback(incompleteUri),
          returnsNormally,
        );
      });

      test('handles getUserInfo network error during refresh', () async {
        await storage.write(key: 'oauth2_refresh_token', value: 'refresh1');

        httpClient.register(OAuth2Config.tokenEndpoint, (req) {
          return http.Response(
            jsonEncode({
              'access_token': 'access1',
              'token_type': 'Bearer',
              'expires_in': 3600,
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        httpClient.register(OAuth2Config.userInfoEndpoint, (req) {
          return http.Response('Server Error', 500);
        });

        final user = await service.refreshToken();
        expect(user, isNull);
      });
    });

    group('constructor variations', () {
      test('can be created with debugForceWeb', () {
        final webService = OAuth2Service(
          secureStorage: storage,
          httpClient: httpClient,
          sessionManager: sessionManager,
          debugForceWeb: true,
        );

        expect(webService, isA<OAuth2Service>());
      });
    });

    group('@visibleForTesting methods', () {
      test('debugBuildAuthorizationUrl constructs URL', () {
        final url = service.debugBuildAuthorizationUrl(
          codeChallenge: 'challenge123',
          state: 'state123',
          nonce: 'nonce123',
        );

        expect(url, contains('response_type=code'));
        expect(url, contains('state=state123'));
        expect(url, contains('nonce=nonce123'));
        expect(url, contains('code_challenge=challenge123'));
        expect(url, contains('code_challenge_method=S256'));
        expect(url, contains('client_id='));
        expect(url, contains('redirect_uri='));
        expect(url, contains('scope='));
      });

      test('debugHandleCallback processes URI', () {
        final futureCode = service.debugStartAndWaitForCode();

        final callbackUri = Uri.parse(
          'asora://auth?code=auth123&state=state123',
        );
        service.debugHandleCallback(callbackUri);

        expect(futureCode, completion(equals('auth123')));
      });

      test('debugExchangeCode makes token request', () async {
        httpClient.register(OAuth2Config.tokenEndpoint, (req) {
          return http.Response(
            jsonEncode({
              'access_token': 'access123',
              'refresh_token': 'refresh123',
              'token_type': 'Bearer',
              'expires_in': 3600,
              'scope': 'openid email profile',
              'user': _userJson(_sampleUser()),
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final tokenResponse = await service.debugExchangeCode(
          'auth123',
          'verifier123',
        );
        expect(tokenResponse.accessToken, equals('access123'));
      });

      test('debugStoreTokens stores data', () async {
        final tokenResponse = OAuth2TokenResponse.fromJson({
          'access_token': 'access123',
          'refresh_token': 'refresh123',
          'token_type': 'Bearer',
          'expires_in': 3600,
          'scope': 'openid email profile',
          'user': _userJson(_sampleUser()),
        });

        await service.debugStoreTokens(tokenResponse);

        expect(storage.get('oauth2_access_token'), equals('access123'));
        expect(await storage.containsKey(key: 'oauth2_user_data'), isTrue);
      });

      test('debugSetupCallbackListener works', () {
        expect(() => service.debugSetupCallbackListener(), returnsNormally);
      });

      test('complete OAuth flow simulation', () async {
        // Setup mock responses
        httpClient.register(OAuth2Config.tokenEndpoint, (req) {
          return http.Response(
            jsonEncode({
              'access_token': 'new_access',
              'refresh_token': 'new_refresh',
              'token_type': 'Bearer',
              'expires_in': 3600,
              'scope': 'openid email profile',
              'user': _userJson(_sampleUser()),
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        // Simulate complete flow
        final url = service.debugBuildAuthorizationUrl(
          codeChallenge: 'challenge',
          state: 'state',
          nonce: 'nonce',
        );
        expect(url, contains('code_challenge=challenge'));

        final futureCode = service.debugStartAndWaitForCode();
        service.debugHandleCallback(
          Uri.parse('asora://auth?code=testcode&state=state'),
        );
        final code = await futureCode;
        expect(code, equals('testcode'));

        final tokenResponse = await service.debugExchangeCode(code, 'verifier');
        await service.debugStoreTokens(tokenResponse);

        expect(await service.isSignedIn(), isTrue);
        expect(await service.getAccessToken(), equals('new_access'));
      });
    });

    group('edge cases', () {
      test('handles null user data in token response', () async {
        final json = {
          'access_token': 'access123',
          'token_type': 'Bearer',
          'expires_in': 3600,
          'scope': 'openid email profile',
          'user': null,
        };

        expect(
          () => OAuth2TokenResponse.fromJson(json),
          throwsA(isA<TypeError>()),
        );
      });

      test('handles expired token in isSignedIn', () async {
        await storage.write(key: 'oauth2_access_token', value: 'access123');
        await storage.write(key: 'oauth2_token_expiry', value: 'invalid-date');

        expect(await service.isSignedIn(), isFalse);
      });

      test('handles missing expiry in isSignedIn', () async {
        await storage.write(key: 'oauth2_access_token', value: 'access123');
        // No expiry stored

        expect(await service.isSignedIn(), isFalse);
      });

      test('debugHandleCallback with different schemes', () {
        // Test com.asora.app scheme
        final uri1 = Uri.parse('com.asora.app://auth?code=123&state=state');
        expect(() => service.debugHandleCallback(uri1), returnsNormally);

        // Test localhost scheme
        final uri2 = Uri.parse(
          'http://localhost:3000/auth?code=123&state=state',
        );
        expect(() => service.debugHandleCallback(uri2), returnsNormally);
      });

      test('refreshToken clears tokens on JSON parse error', () async {
        await storage.write(key: 'oauth2_refresh_token', value: 'refresh1');

        httpClient.register(OAuth2Config.tokenEndpoint, (req) {
          return http.Response('invalid json', 200);
        });

        final user = await service.refreshToken();

        expect(user, isNull);
        expect(storage.get('oauth2_refresh_token'), isNull);
      });

      test('signOut with no stored data', () async {
        // Should not throw even if nothing is stored
        expect(() => service.signOut(), returnsNormally);
      });

      test('handles network exceptions in getUserInfo', () async {
        await storage.write(key: 'oauth2_access_token', value: 'access123');

        httpClient.register(OAuth2Config.userInfoEndpoint, (req) {
          throw Exception('Network error');
        });

        final user = await service.getUserInfo();
        expect(user, isNull);
      });

      test('handles network exceptions in refreshToken', () async {
        await storage.write(key: 'oauth2_refresh_token', value: 'refresh123');

        httpClient.register(OAuth2Config.tokenEndpoint, (req) {
          throw Exception('Network error');
        });

        final user = await service.refreshToken();
        expect(user, isNull);
        expect(storage.get('oauth2_refresh_token'), isNull);
      });

      test('handles secure storage exceptions in getStoredUser', () async {
        // Create a storage that throws on read
        final throwingStorage = _ThrowingSecureStorage();
        final throwingService = OAuth2Service(
          secureStorage: throwingStorage,
          httpClient: httpClient,
          sessionManager: sessionManager,
        );

        final user = await throwingService.getStoredUser();
        expect(user, isNull);
      });

      test('handles secure storage exceptions in isSignedIn', () async {
        final throwingStorage = _ThrowingSecureStorage();
        final throwingService = OAuth2Service(
          secureStorage: throwingStorage,
          httpClient: httpClient,
          sessionManager: sessionManager,
        );

        final isSignedIn = await throwingService.isSignedIn();
        expect(isSignedIn, isFalse);
      });

      test('handles secure storage exceptions in getAccessToken', () async {
        final throwingStorage = _ThrowingSecureStorage();
        final throwingService = OAuth2Service(
          secureStorage: throwingStorage,
          httpClient: httpClient,
          sessionManager: sessionManager,
        );

        final token = await throwingService.getAccessToken();
        expect(token, isNull);
      });

      test('OAuth2Config platform-specific redirect URI validation', () {
        // This tests that redirect URI is properly constructed
        expect(OAuth2Config.redirectUri, isNotEmpty);
        expect(OAuth2Config.clientId, isNotEmpty);
        expect(OAuth2Config.scope, contains('openid'));
      });
    });

    group('platform-specific behavior', () {
      test('web platform specific redirect URIs', () {
        final url = service.debugBuildAuthorizationUrl(
          codeChallenge: 'challenge123',
          state: 'state123',
          nonce: 'nonce123',
        );

        // Should contain redirect URI for current platform
        expect(url, contains('redirect_uri='));
      });

      test('callback handling with web debugging', () {
        final webService = OAuth2Service(
          secureStorage: storage,
          httpClient: httpClient,
          sessionManager: sessionManager,
          debugForceWeb: true,
        );

        // Test web-specific callback handling
        final uri = Uri.parse(
          'http://localhost:3000/auth?code=123&state=state',
        );
        expect(() => webService.debugHandleCallback(uri), returnsNormally);
      });

      test('callback setup for web platform', () {
        final webService = OAuth2Service(
          secureStorage: storage,
          httpClient: httpClient,
          sessionManager: sessionManager,
          debugForceWeb: true,
        );

        // Web callback setup should not cause stack overflow
        // This test just ensures no exception is thrown during instantiation
        expect(webService, isA<OAuth2Service>());
      });
    });

    group('dispose', () {
      test('dispose does not throw', () {
        expect(() => service.dispose(), returnsNormally);
      });
    });
  });
}
