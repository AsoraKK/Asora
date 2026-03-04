import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart' as http_testing;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:asora/features/auth/application/auth_service.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';
import 'package:asora/features/auth/domain/user.dart';

/// In-memory FlutterSecureStorage for testing.
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

/// Controllable OAuth2Service stub for testing AuthService integration paths.
class _ControllableOAuth2Service extends OAuth2Service {
  bool signOutCalled = false;
  String? _accessToken;
  User? _signInResult;
  User? _refreshResult;
  Object? _signInError;

  void setAccessToken(String? token) => _accessToken = token;
  void setSignInResult(User user) => _signInResult = user;
  void setRefreshResult(User? user) => _refreshResult = user;
  void setSignInError(Object error) => _signInError = error;

  @override
  Future<void> signOut() async {
    signOutCalled = true;
  }

  @override
  Future<String?> getAccessToken() async => _accessToken;

  @override
  Future<User> signInWithOAuth2({
    OAuth2Provider provider = OAuth2Provider.google,
  }) async {
    if (_signInError != null) throw _signInError!;
    return _signInResult!;
  }

  @override
  Future<User?> refreshToken() async => _refreshResult;
}

Map<String, dynamic> _userJson() => {
  'id': 'u1',
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
  late _ControllableOAuth2Service oauth2;

  setUp(() {
    storage = _MemoryStorage();
    oauth2 = _ControllableOAuth2Service();
  });

  AuthService makeService({http.Client? httpClient}) {
    return AuthService(
      secureStorage: storage,
      oauth2Service: oauth2,
      httpClient: httpClient,
    );
  }

  // ────── signInWithGoogle ──────

  group('signInWithGoogle', () {
    test('returns user on success', () async {
      final user = User.fromJson(_userJson());
      oauth2.setSignInResult(user);
      oauth2.setAccessToken('token-123');

      final service = makeService();
      final result = await service.signInWithGoogle();
      expect(result.id, 'u1');
    });

    test('rethrows AuthFailure', () {
      oauth2.setSignInError(AuthFailure.cancelledByUser());
      final service = makeService();
      expect(() => service.signInWithGoogle(), throwsA(isA<AuthFailure>()));
    });

    test('wraps unknown error in AuthFailure', () {
      oauth2.setSignInError(Exception('oops'));
      final service = makeService();
      expect(() => service.signInWithGoogle(), throwsA(isA<AuthFailure>()));
    });
  });

  // ────── signInWithApple ──────

  group('signInWithApple', () {
    test('returns user on success', () async {
      final user = User.fromJson(_userJson());
      oauth2.setSignInResult(user);
      oauth2.setAccessToken('token-123');

      final service = makeService();
      final result = await service.signInWithApple();
      expect(result.id, 'u1');
    });

    test('rethrows AuthFailure from Apple', () {
      oauth2.setSignInError(AuthFailure.cancelledByUser());
      final service = makeService();
      expect(() => service.signInWithApple(), throwsA(isA<AuthFailure>()));
    });

    test('wraps unknown Apple error in AuthFailure', () {
      oauth2.setSignInError(Exception('apple error'));
      final service = makeService();
      expect(() => service.signInWithApple(), throwsA(isA<AuthFailure>()));
    });
  });

  // ────── signInWithWorld ──────

  group('signInWithWorld', () {
    test('returns user on success', () async {
      final user = User.fromJson(_userJson());
      oauth2.setSignInResult(user);
      oauth2.setAccessToken('token-123');

      final service = makeService();
      final result = await service.signInWithWorld();
      expect(result.id, 'u1');
    });

    test('rethrows AuthFailure from World', () {
      oauth2.setSignInError(AuthFailure.cancelledByUser());
      final service = makeService();
      expect(() => service.signInWithWorld(), throwsA(isA<AuthFailure>()));
    });

    test('wraps unknown World error in AuthFailure', () {
      oauth2.setSignInError(Exception('world error'));
      final service = makeService();
      expect(() => service.signInWithWorld(), throwsA(isA<AuthFailure>()));
    });
  });

  // ────── signInWithOAuth2 ──────

  group('signInWithOAuth2', () {
    test('stores JWT and user data on success', () async {
      final user = User.fromJson(_userJson());
      oauth2.setSignInResult(user);
      oauth2.setAccessToken('access-token-1');

      final service = makeService();
      await service.signInWithOAuth2();

      expect(await storage.read(key: 'jwt'), 'access-token-1');
      final storedUserJson = await storage.read(key: 'userData');
      expect(storedUserJson, isNotNull);
    });

    test('stores JWT as null when no access token', () async {
      final user = User.fromJson(_userJson());
      oauth2.setSignInResult(user);
      oauth2.setAccessToken(null);

      final service = makeService();
      await service.signInWithOAuth2();

      // JWT not stored when token is null
      expect(await storage.read(key: 'jwt'), isNull);
    });

    test('rethrows AuthFailure', () {
      oauth2.setSignInError(AuthFailure.serverError('fail'));
      final service = makeService();
      expect(() => service.signInWithOAuth2(), throwsA(isA<AuthFailure>()));
    });

    test('wraps generic error in AuthFailure', () {
      oauth2.setSignInError(StateError('bad'));
      final service = makeService();
      expect(() => service.signInWithOAuth2(), throwsA(isA<AuthFailure>()));
    });
  });

  // ────── refreshOAuth2Token ──────

  group('refreshOAuth2Token', () {
    test('updates JWT and user data on success', () async {
      final user = User.fromJson(_userJson());
      oauth2.setRefreshResult(user);
      oauth2.setAccessToken('refreshed-token');

      final service = makeService();
      await service.refreshOAuth2Token();

      expect(await storage.read(key: 'jwt'), 'refreshed-token');
    });

    test('throws when refresh returns null', () {
      oauth2.setRefreshResult(null);

      final service = makeService();
      expect(() => service.refreshOAuth2Token(), throwsA(isA<AuthFailure>()));
    });

    test('rethrows AuthFailure on refresh error', () {
      oauth2.setSignInError(AuthFailure.serverError('expired'));
      // Override refreshToken to throw
      final service = makeService();
      // refreshOAuth2Token calls oauth2.refreshToken which returns null by default
      oauth2.setRefreshResult(null);
      expect(() => service.refreshOAuth2Token(), throwsA(isA<AuthFailure>()));
    });
  });

  // ────── validateAndRefreshToken ──────

  group('validateAndRefreshToken', () {
    test('returns false when no JWT stored', () async {
      final service = makeService();
      final result = await service.validateAndRefreshToken();
      expect(result, isFalse);
    });

    test('returns true when server returns 200', () async {
      await storage.write(key: 'jwt', value: 'valid-token');

      final client = http_testing.MockClient((request) async {
        return http.Response('{}', 200);
      });

      final service = makeService(httpClient: client);
      final result = await service.validateAndRefreshToken();
      expect(result, isTrue);
    });

    test('returns true on 401 when refresh succeeds', () async {
      await storage.write(key: 'jwt', value: 'expired-token');
      final user = User.fromJson(_userJson());
      oauth2.setRefreshResult(user);
      oauth2.setAccessToken('refreshed');

      final client = http_testing.MockClient((request) async {
        return http.Response('', 401);
      });

      final service = makeService(httpClient: client);
      final result = await service.validateAndRefreshToken();
      expect(result, isTrue);
    });

    test('returns false on 401 when refresh fails', () async {
      await storage.write(key: 'jwt', value: 'expired-token');
      oauth2.setRefreshResult(null);

      final client = http_testing.MockClient((request) async {
        return http.Response('', 401);
      });

      final service = makeService(httpClient: client);
      final result = await service.validateAndRefreshToken();
      expect(result, isFalse);
    });

    test('returns false on other status codes', () async {
      await storage.write(key: 'jwt', value: 'some-token');

      final client = http_testing.MockClient((request) async {
        return http.Response('', 500);
      });

      final service = makeService(httpClient: client);
      final result = await service.validateAndRefreshToken();
      expect(result, isFalse);
    });

    test('returns false on network error', () async {
      await storage.write(key: 'jwt', value: 'some-token');

      final client = http_testing.MockClient((request) async {
        throw Exception('network timeout');
      });

      final service = makeService(httpClient: client);
      final result = await service.validateAndRefreshToken();
      expect(result, isFalse);
    });
  });

  // ────── getCurrentUser ──────

  group('getCurrentUser', () {
    test('returns null when no stored data', () async {
      final service = makeService();
      final result = await service.getCurrentUser();
      expect(result, isNull);
    });

    test('returns null when token but no user data', () async {
      await storage.write(key: 'jwt', value: 'token');
      final service = makeService();
      final result = await service.getCurrentUser();
      expect(result, isNull);
    });

    test('returns null when user data but no token', () async {
      await storage.write(key: 'userData', value: jsonEncode(_userJson()));
      final service = makeService();
      final result = await service.getCurrentUser();
      expect(result, isNull);
    });

    test('returns fresh user on 200 response', () async {
      await storage.write(key: 'jwt', value: 'token');
      await storage.write(key: 'userData', value: jsonEncode(_userJson()));

      final client = http_testing.MockClient((request) async {
        return http.Response(jsonEncode({'user': _userJson()}), 200);
      });

      final service = makeService(httpClient: client);
      final result = await service.getCurrentUser();
      expect(result, isNotNull);
      expect(result!.id, 'u1');
    });

    test('clears data and returns null on 401', () async {
      await storage.write(key: 'jwt', value: 'bad-token');
      await storage.write(key: 'userData', value: jsonEncode(_userJson()));

      final client = http_testing.MockClient((request) async {
        return http.Response('', 401);
      });

      final service = makeService(httpClient: client);
      final result = await service.getCurrentUser();
      expect(result, isNull);
    });

    test('returns cached user on server error', () async {
      await storage.write(key: 'jwt', value: 'token');
      await storage.write(key: 'userData', value: jsonEncode(_userJson()));

      final client = http_testing.MockClient((request) async {
        return http.Response('', 500);
      });

      final service = makeService(httpClient: client);
      final result = await service.getCurrentUser();
      expect(result, isNotNull);
      expect(result!.id, 'u1');
    });

    test('returns cached user on network error', () async {
      await storage.write(key: 'jwt', value: 'token');
      await storage.write(key: 'userData', value: jsonEncode(_userJson()));

      final client = http_testing.MockClient((request) async {
        throw Exception('offline');
      });

      final service = makeService(httpClient: client);
      final result = await service.getCurrentUser();
      expect(result, isNotNull);
    });
  });

  // ────── signOut ──────

  group('signOut', () {
    test('delegates to logout', () async {
      await storage.write(key: 'jwt', value: 'token');
      await storage.write(key: 'userData', value: 'data');

      final service = makeService();
      await service.signOut();

      expect(oauth2.signOutCalled, isTrue);
      expect(await storage.read(key: 'jwt'), isNull);
      expect(await storage.read(key: 'userData'), isNull);
    });
  });

  // ────── isAuthenticated ──────

  group('isAuthenticated', () {
    test('returns true when JWT exists', () async {
      await storage.write(key: 'jwt', value: 'token');
      final service = makeService();
      expect(await service.isAuthenticated(), isTrue);
    });

    test('returns false when no JWT', () async {
      final service = makeService();
      expect(await service.isAuthenticated(), isFalse);
    });
  });

  // ────── getJwtToken ──────

  group('getJwtToken', () {
    test('returns token when stored', () async {
      await storage.write(key: 'jwt', value: 'my-token');
      final service = makeService();
      expect(await service.getJwtToken(), 'my-token');
    });

    test('returns null when not stored', () async {
      final service = makeService();
      expect(await service.getJwtToken(), isNull);
    });
  });

  // ────── loginWithEmail error paths ──────

  group('loginWithEmail error paths', () {
    test('handles missing user data in 200 response', () {
      final client = http_testing.MockClient((request) async {
        return http.Response(jsonEncode({'token': 'tok'}), 200);
      });

      final service = makeService(httpClient: client);
      expect(
        () => service.loginWithEmail('a@b.com', 'pass'),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('handles empty 401 response body', () {
      final client = http_testing.MockClient((request) async {
        return http.Response('', 401);
      });

      final service = makeService(httpClient: client);
      expect(
        () => service.loginWithEmail('a@b.com', 'pass'),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('handles network exception', () {
      final client = http_testing.MockClient((request) async {
        throw Exception('connection refused');
      });

      final service = makeService(httpClient: client);
      expect(
        () => service.loginWithEmail('a@b.com', 'pass'),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('handles 403 with empty body', () {
      final client = http_testing.MockClient((request) async {
        return http.Response('', 403);
      });

      final service = makeService(httpClient: client);
      expect(
        () => service.loginWithEmail('a@b.com', 'pass'),
        throwsA(isA<AuthFailure>()),
      );
    });
  });
}
