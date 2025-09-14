import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/domain/user.dart';
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

  // Helper for assertions
  String? get(String key) => _data[key];
}

class _FakeHttpClient extends http.BaseClient {
  final Map<String, http.Response Function(http.BaseRequest)> _routes = {};

  void register(String url, http.Response Function(http.BaseRequest) handler) {
    _routes[url] = handler;
  }

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final key = request.url.toString();
    final handler = _routes[key];
    if (handler == null) {
      return http.StreamedResponse(Stream<List<int>>.fromIterable([]), 404);
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
      codeVerifier: '',
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
  group('OAuth2Service - token + user flows', () {
    late _FakeSecureStorage storage;
    late _FakeHttpClient httpClient;
    late _FakeAuthSessionManager sessionManager;
    late OAuth2Service service;

    setUp(() {
      storage = _FakeSecureStorage();
      httpClient = _FakeHttpClient();
      sessionManager = _FakeAuthSessionManager();
      service = OAuth2Service(
        secureStorage: storage,
        httpClient: httpClient,
        sessionManager: sessionManager,
        launcher: (uri, {mode = LaunchMode.platformDefault}) async => true, // avoid real url_launcher
      );
    });

    test('refreshToken returns user and updates tokens', () async {
      // Arrange
      await storage.write(key: 'oauth2_refresh_token', value: 'refresh1');

      final tokenUrl = OAuth2Config.tokenEndpoint;
      final userInfoUrl = OAuth2Config.userInfoEndpoint;

      httpClient.register(tokenUrl, (req) {
        return http.Response(
          jsonEncode({
            'access_token': 'access1',
            'refresh_token': 'refresh2',
            'token_type': 'Bearer',
            'expires_in': 3600,
            'scope': OAuth2Config.scope,
            'user': _userJson(_sampleUser()),
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      httpClient.register(userInfoUrl, (req) {
        return http.Response(
          jsonEncode(_userJson(_sampleUser())),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      // Act
      final user = await service.refreshToken();

      // Assert
      expect(user, isA<User>());
      expect(storage.get('oauth2_access_token'), equals('access1'));
      // refreshToken() updates access token and expiry; refresh token may remain unchanged
      expect(storage.get('oauth2_refresh_token'), equals('refresh1'));
      expect(storage.get('oauth2_user_data'), isNotNull);
      expect(sessionManager.completed, isEmpty); // refresh flow does not complete session
    });

    test('refreshToken returns null when no refresh token', () async {
      final res = await service.refreshToken();
      expect(res, isNull);
    });

    test('refreshToken clears tokens on non-200', () async {
      await storage.write(key: 'oauth2_access_token', value: 'a');
      await storage.write(key: 'oauth2_refresh_token', value: 'r');
      await storage.write(key: 'oauth2_token_expiry', value: DateTime.now().toIso8601String());

      httpClient.register(OAuth2Config.tokenEndpoint, (req) => http.Response('{"error":"bad"}', 400));

      final res = await service.refreshToken();
      expect(res, isNull);
      expect(storage.get('oauth2_access_token'), isNull);
      expect(storage.get('oauth2_refresh_token'), isNull);
      expect(storage.get('oauth2_token_expiry'), isNull);
    });

    test('getUserInfo returns user and stores data', () async {
      await storage.write(key: 'oauth2_access_token', value: 'a');
      httpClient.register(OAuth2Config.userInfoEndpoint, (req) {
        return http.Response(jsonEncode(_userJson(_sampleUser())), 200,
            headers: {'content-type': 'application/json'});
      });

      final user = await service.getUserInfo();
      expect(user, isA<User>());
      expect(storage.get('oauth2_user_data'), isNotNull);
    });

    test('getUserInfo returns null when no token or non-200', () async {
      expect(await service.getUserInfo(), isNull);

      await storage.write(key: 'oauth2_access_token', value: 'a');
      httpClient.register(OAuth2Config.userInfoEndpoint, (req) => http.Response('oops', 500));
      expect(await service.getUserInfo(), isNull);
    });

    test('isSignedIn respects expiry', () async {
      await storage.write(key: 'oauth2_access_token', value: 'a');
      await storage.write(key: 'oauth2_token_expiry', value: DateTime.now().add(const Duration(minutes: 5)).toIso8601String());
      expect(await service.isSignedIn(), isTrue);

      await storage.write(key: 'oauth2_token_expiry', value: DateTime.now().subtract(const Duration(minutes: 1)).toIso8601String());
      expect(await service.isSignedIn(), isFalse);
    });

    test('getAccessToken refreshes when expired', () async {
      await storage.write(key: 'oauth2_access_token', value: 'old');
      await storage.write(key: 'oauth2_refresh_token', value: 'r');
      await storage.write(key: 'oauth2_token_expiry', value: DateTime.now().subtract(const Duration(minutes: 1)).toIso8601String());

      httpClient.register(OAuth2Config.tokenEndpoint, (req) {
        return http.Response(
          jsonEncode({
            'access_token': 'newtoken',
            'refresh_token': 'r2',
            'token_type': 'Bearer',
            'expires_in': 1200,
            'scope': OAuth2Config.scope,
            'user': _userJson(_sampleUser()),
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      httpClient.register(OAuth2Config.userInfoEndpoint, (req) => http.Response(jsonEncode(_userJson(_sampleUser())), 200));

      final token = await service.getAccessToken();
      expect(token, equals('newtoken'));
    });

    test('getStoredUser returns user from storage', () async {
      await storage.write(key: 'oauth2_user_data', value: jsonEncode(_userJson(_sampleUser())));
      final user = await service.getStoredUser();
      expect(user, isA<User>());
      expect(user!.id, 'u1');
    });

    test('signOut clears tokens and sessions', () async {
      await storage.write(key: 'oauth2_access_token', value: 'a');
      await storage.write(key: 'oauth2_refresh_token', value: 'r');
      await storage.write(key: 'oauth2_user_data', value: jsonEncode(_userJson(_sampleUser())));

      await service.signOut();
      expect(storage.get('oauth2_access_token'), isNull);
      expect(storage.get('oauth2_refresh_token'), isNull);
      expect(storage.get('oauth2_user_data'), isNull);
      expect(sessionManager.clearedAll, isTrue);
    });
  });
}
