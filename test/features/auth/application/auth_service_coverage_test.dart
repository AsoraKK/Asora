import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart' as http_testing;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:asora/features/auth/application/auth_service.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';

/// Minimal FlutterSecureStorage for tests.
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

/// OAuth2Service that always throws or returns null to simulate failure.
class _StubOAuth2Service extends OAuth2Service {
  _StubOAuth2Service();
  bool signOutCalled = false;

  @override
  Future<void> signOut() async {
    signOutCalled = true;
  }

  @override
  Future<String?> getAccessToken() async => 'stub-token';
}

void main() {
  late _MemoryStorage storage;
  late _StubOAuth2Service oauth2;

  setUp(() {
    storage = _MemoryStorage();
    oauth2 = _StubOAuth2Service();
  });

  // ─────── loginWithEmail ───────

  group('loginWithEmail', () {
    test('successful login stores token and user', () async {
      final client = http_testing.MockClient((request) async {
        return http.Response(
          jsonEncode({
            'access_token': 'jwt-token',
            'refresh_token': 'refresh-token',
            'expires_in': 900,
            'user': {
              'id': 'u1',
              'email': 'a@b.com',
              'name': 'Test',
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

      final service = AuthService(
        secureStorage: storage,
        httpClient: client,
        oauth2Service: oauth2,
      );

      final user = await service.loginWithEmail('a@b.com', 'pass');
      expect(user.id, 'u1');
    });

    test('throws for 401', () {
      final client = http_testing.MockClient((request) async {
        return http.Response(jsonEncode({'error': 'bad creds'}), 401);
      });

      final service = AuthService(
        secureStorage: storage,
        httpClient: client,
        oauth2Service: oauth2,
      );

      expect(
        () => service.loginWithEmail('a@b.com', 'wrong'),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('throws for 500', () {
      final client = http_testing.MockClient((request) async {
        return http.Response('Internal error', 500);
      });

      final service = AuthService(
        secureStorage: storage,
        httpClient: client,
        oauth2Service: oauth2,
      );

      expect(
        () => service.loginWithEmail('a@b.com', 'pass'),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('throws for 403 with error body', () {
      final client = http_testing.MockClient((request) async {
        return http.Response(jsonEncode({'error': 'forbidden'}), 403);
      });

      final service = AuthService(
        secureStorage: storage,
        httpClient: client,
        oauth2Service: oauth2,
      );

      expect(
        () => service.loginWithEmail('a@b.com', 'pass'),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('throws for empty email', () {
      final service = AuthService(
        secureStorage: storage,
        oauth2Service: oauth2,
      );

      expect(
        () => service.loginWithEmail('', 'pass'),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('throws for empty password', () {
      final service = AuthService(
        secureStorage: storage,
        oauth2Service: oauth2,
      );

      expect(
        () => service.loginWithEmail('a@b.com', ''),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('throws when response missing token', () {
      final client = http_testing.MockClient((request) async {
        return http.Response(
          jsonEncode({
            'user': {'id': 'u1', 'email': 'a@b.com'},
          }),
          200,
        );
      });

      final service = AuthService(
        secureStorage: storage,
        httpClient: client,
        oauth2Service: oauth2,
      );

      expect(
        () => service.loginWithEmail('a@b.com', 'pass'),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('throws when response missing user', () {
      final client = http_testing.MockClient((request) async {
        return http.Response(jsonEncode({'token': 'jwt'}), 200);
      });

      final service = AuthService(
        secureStorage: storage,
        httpClient: client,
        oauth2Service: oauth2,
      );

      expect(
        () => service.loginWithEmail('a@b.com', 'pass'),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('throws for empty 401 body', () {
      final client = http_testing.MockClient((request) async {
        return http.Response('', 401);
      });

      final service = AuthService(
        secureStorage: storage,
        httpClient: client,
        oauth2Service: oauth2,
      );

      expect(
        () => service.loginWithEmail('a@b.com', 'pass'),
        throwsA(isA<AuthFailure>()),
      );
    });
  });

  // ─────── getCurrentUser ───────

  group('email lifecycle operations', () {
    test(
      'posts every operation to its exact endpoint with normalized input',
      () async {
        final requests = <http.Request>[];
        final client = http_testing.MockClient((request) async {
          requests.add(request);
          return http.Response('', 204);
        });
        final service = AuthService(
          secureStorage: storage,
          httpClient: client,
          oauth2Service: oauth2,
          authUrl: 'https://api.lythaus.co/api',
        );

        await service.registerWithEmail(
          ' person@example.com ',
          'StrongPass!123',
        );
        await service.resendEmailVerification(' person@example.com ');
        await service.requestPasswordReset(' person@example.com ');
        await service.verifyEmailToken('verification-token');
        await service.resetEmailPassword('reset-token', 'NewStrongPass!123');

        expect(requests.map((request) => request.url.path), [
          '/api/auth/email/register',
          '/api/auth/email/resend',
          '/api/auth/email/forgot-password',
          '/api/auth/email/verify',
          '/api/auth/email/reset-password',
        ]);
        expect(jsonDecode(requests.first.body), {
          'email': 'person@example.com',
          'password': 'StrongPass!123',
        });
        expect(jsonDecode(requests.last.body), {
          'token': 'reset-token',
          'new_password': 'NewStrongPass!123',
        });
      },
    );

    test(
      'maps client and server failures to controlled auth failures',
      () async {
        var status = 400;
        final client = http_testing.MockClient((request) async {
          return http.Response('', status);
        });
        final service = AuthService(
          secureStorage: storage,
          httpClient: client,
          oauth2Service: oauth2,
          authUrl: 'https://api.lythaus.co/api',
        );

        await expectLater(
          service.verifyEmailToken('invalid-token'),
          throwsA(
            isA<AuthFailure>().having(
              (failure) => failure.message,
              'message',
              'The request could not be completed',
            ),
          ),
        );

        status = 503;
        await expectLater(
          service.requestPasswordReset('person@example.com'),
          throwsA(
            isA<AuthFailure>().having(
              (failure) => failure.message,
              'message',
              'Email authentication is temporarily unavailable',
            ),
          ),
        );
      },
    );

    test(
      'maps transport failures without leaking implementation detail',
      () async {
        final client = http_testing.MockClient((request) async {
          throw http.ClientException('provider detail');
        });
        final service = AuthService(
          secureStorage: storage,
          httpClient: client,
          oauth2Service: oauth2,
          authUrl: 'https://api.lythaus.co/api',
        );

        await expectLater(
          service.resendEmailVerification('person@example.com'),
          throwsA(
            isA<AuthFailure>().having(
              (failure) => failure.message,
              'message',
              'Unable to reach Lythaus authentication',
            ),
          ),
        );
      },
    );
  });

  group('getCurrentUser', () {
    test('returns null when no stored data', () async {
      final service = AuthService(
        secureStorage: storage,
        oauth2Service: oauth2,
      );

      final user = await service.getCurrentUser();
      expect(user, isNull);
    });

    test('returns user from server when stored and valid token', () async {
      // Pre-populate storage
      await storage.write(key: 'jwt', value: 'valid-token');
      await storage.write(
        key: 'userData',
        value: jsonEncode({
          'id': 'u1',
          'email': 'a@b.com',
          'name': 'Test',
          'role': 'user',
          'tier': 'free',
          'reputationScore': 0,
          'createdAt': '2024-01-01T00:00:00Z',
          'lastLoginAt': '2024-06-01T00:00:00Z',
        }),
      );

      final client = http_testing.MockClient((request) async {
        return http.Response(
          jsonEncode({
            'user': {
              'id': 'u1',
              'email': 'a@b.com',
              'name': 'Fresh',
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

      final service = AuthService(
        secureStorage: storage,
        httpClient: client,
        oauth2Service: oauth2,
      );

      final user = await service.getCurrentUser();
      expect(user, isNotNull);
      expect(user!.id, 'u1');
    });

    test('returns cached user on server error', () async {
      await storage.write(key: 'jwt', value: 'valid-token');
      await storage.write(
        key: 'userData',
        value: jsonEncode({
          'id': 'u1',
          'email': 'a@b.com',
          'name': 'Cached',
          'role': 'user',
          'tier': 'free',
          'reputationScore': 0,
          'createdAt': '2024-01-01T00:00:00Z',
          'lastLoginAt': '2024-06-01T00:00:00Z',
        }),
      );

      final client = http_testing.MockClient((request) async {
        return http.Response('Error', 500);
      });

      final service = AuthService(
        secureStorage: storage,
        httpClient: client,
        oauth2Service: oauth2,
      );

      final user = await service.getCurrentUser();
      expect(user, isNotNull);
    });

    test('returns null and clears on 401', () async {
      await storage.write(key: 'jwt', value: 'expired-token');
      await storage.write(
        key: 'userData',
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

      final client = http_testing.MockClient((request) async {
        return http.Response('Unauthorized', 401);
      });

      final service = AuthService(
        secureStorage: storage,
        httpClient: client,
        oauth2Service: oauth2,
      );

      final user = await service.getCurrentUser();
      expect(user, isNull);
    });

    test('returns cached user on network error', () async {
      await storage.write(key: 'jwt', value: 'valid-token');
      await storage.write(
        key: 'userData',
        value: jsonEncode({
          'id': 'u1',
          'email': 'a@b.com',
          'name': 'Cached',
          'role': 'user',
          'tier': 'free',
          'reputationScore': 0,
          'createdAt': '2024-01-01T00:00:00Z',
          'lastLoginAt': '2024-06-01T00:00:00Z',
        }),
      );

      final client = http_testing.MockClient((request) async {
        throw Exception('Network error');
      });

      final service = AuthService(
        secureStorage: storage,
        httpClient: client,
        oauth2Service: oauth2,
      );

      final user = await service.getCurrentUser();
      expect(user, isNotNull);
    });
  });

  // ─────── logout ───────

  group('logout', () {
    test('clears storage and calls oauth2 signout', () async {
      await storage.write(key: 'jwt', value: 'token');
      await storage.write(key: 'userData', value: '{}');

      final service = AuthService(
        secureStorage: storage,
        oauth2Service: oauth2,
      );

      await service.logout();
      expect(oauth2.signOutCalled, isTrue);

      final token = await storage.read(key: 'jwt');
      expect(token, isNull);
    });
  });

  // ─────── isAuthenticated ───────

  group('isAuthenticated', () {
    test('true when token exists', () async {
      await storage.write(key: 'jwt', value: 'token');

      final service = AuthService(
        secureStorage: storage,
        oauth2Service: oauth2,
      );
      expect(await service.isAuthenticated(), isTrue);
    });

    test('false when no token', () async {
      final service = AuthService(
        secureStorage: storage,
        oauth2Service: oauth2,
      );
      expect(await service.isAuthenticated(), isFalse);
    });
  });

  // ─────── getJwtToken ───────

  group('getJwtToken', () {
    test('returns stored token', () async {
      await storage.write(key: 'jwt', value: 'my-token');
      final service = AuthService(
        secureStorage: storage,
        oauth2Service: oauth2,
      );
      expect(await service.getJwtToken(), 'my-token');
    });

    test('returns null when no token', () async {
      final service = AuthService(
        secureStorage: storage,
        oauth2Service: oauth2,
      );
      expect(await service.getJwtToken(), isNull);
    });
  });

  // ─────── signOut alias ───────

  group('signOut', () {
    test('delegates to logout', () async {
      final service = AuthService(
        secureStorage: storage,
        oauth2Service: oauth2,
      );
      await service.signOut();
      expect(oauth2.signOutCalled, isTrue);
    });
  });

  // ─────── validateAndRefreshToken ───────

  group('validateAndRefreshToken', () {
    test('false when no stored token', () async {
      final service = AuthService(
        secureStorage: storage,
        oauth2Service: oauth2,
      );
      expect(await service.validateAndRefreshToken(), isFalse);
    });

    test('true when server returns 200', () async {
      await storage.write(key: 'jwt', value: 'valid');

      final client = http_testing.MockClient((request) async {
        return http.Response('{}', 200);
      });

      final service = AuthService(
        secureStorage: storage,
        httpClient: client,
        oauth2Service: oauth2,
      );
      expect(await service.validateAndRefreshToken(), isTrue);
    });

    test('false on non-200/401', () async {
      await storage.write(key: 'jwt', value: 'valid');

      final client = http_testing.MockClient((request) async {
        return http.Response('Error', 500);
      });

      final service = AuthService(
        secureStorage: storage,
        httpClient: client,
        oauth2Service: oauth2,
      );
      expect(await service.validateAndRefreshToken(), isFalse);
    });

    test('false on network exception', () async {
      await storage.write(key: 'jwt', value: 'valid');

      final client = http_testing.MockClient((request) async {
        throw Exception('boom');
      });

      final service = AuthService(
        secureStorage: storage,
        httpClient: client,
        oauth2Service: oauth2,
      );
      expect(await service.validateAndRefreshToken(), isFalse);
    });
  });
}
