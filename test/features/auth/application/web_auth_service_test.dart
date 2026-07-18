import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart' as http_testing;

import 'package:asora/features/auth/application/web_auth_service.dart';
import 'package:asora/features/auth/application/web_token_storage.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';
import 'package:asora/features/auth/domain/user.dart';

// ---------------------------------------------------------------------------
// In-memory storage for testing (replaces the stub that always returns null)
// ---------------------------------------------------------------------------

class InMemoryTokenStorage extends WebTokenStorage {
  final Map<String, String> _store = {};

  @override
  String? read(String key) => _store[key];

  @override
  void write(String key, String value) => _store[key] = value;

  @override
  void delete(String key) => _store.remove(key);

  @override
  void clearAll() => _store.clear();

  Map<String, String> get snapshot => Map.unmodifiable(_store);
}

Map<String, dynamic> _userJson({String id = 'u1'}) => {
  'id': id,
  'email': '$id@test.com',
  'role': 'user',
  'tier': 'bronze',
  'reputationScore': 0,
  'createdAt': DateTime(2026).toIso8601String(),
  'lastLoginAt': DateTime(2026).toIso8601String(),
};

Map<String, dynamic> _tokenResponseJson({
  String accessToken = 'at_123',
  String refreshToken = 'rt_456',
  String idToken = 'id_789',
  int expiresIn = 3600,
}) => {
  'access_token': accessToken,
  'refresh_token': refreshToken,
  'id_token': idToken,
  'expires_in': expiresIn,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  group('WebAuthService.handleCallback', () {
    WebAuthService buildService({
      InMemoryTokenStorage? storage,
      int tokenStatus = 200,
      Map<String, dynamic>? tokenBody,
      int userStatus = 200,
      Map<String, dynamic>? userBody,
    }) {
      final client = http_testing.MockClient((request) async {
        if (request.url.path.contains('token') ||
            request.url.toString().contains('token')) {
          return http.Response(
            jsonEncode(tokenBody ?? _tokenResponseJson()),
            tokenStatus,
          );
        }
        return http.Response(jsonEncode(userBody ?? _userJson()), userStatus);
      });

      return WebAuthService(httpClient: client, storage: storage);
    }

    test('rejects callback with error param', () async {
      final svc = buildService();

      expect(
        () => svc.handleCallback(
          Uri.parse(
            'https://app.lythaus.com/auth/callback?error=access_denied&error_description=User+cancelled',
          ),
        ),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('rejects callback with missing code', () async {
      final svc = buildService();

      expect(
        () => svc.handleCallback(
          Uri.parse('https://app.lythaus.com/auth/callback?state=abc'),
        ),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('rejects callback with state mismatch', () async {
      final svc = buildService();

      expect(
        () => svc.handleCallback(
          Uri.parse(
            'https://app.lythaus.com/auth/callback?code=abc&state=some_state',
          ),
        ),
        throwsA(isA<AuthFailure>()),
      );
    });

    test(
      'rejects callback missing a verifier after state validation',
      () async {
        final storage = InMemoryTokenStorage()..write('pkce_state', 'expected');
        final svc = buildService(storage: storage);

        await expectLater(
          svc.handleCallback(
            Uri.parse(
              'https://app.lythaus.com/auth/callback?code=abc&state=expected',
            ),
          ),
          throwsA(isA<AuthFailure>()),
        );
        expect(storage.snapshot, isEmpty);
      },
    );

    test('stores tokens and user data on successful callback', () async {
      final storage = InMemoryTokenStorage()
        ..write('pkce_state', 'expected_state')
        ..write('pkce_code_verifier', 'verifier-123')
        ..write('oidc_nonce', 'nonce-123');
      final svc = buildService(storage: storage);

      final user = await svc.handleCallback(
        Uri.parse(
          'https://app.lythaus.com/auth/callback?code=abc&state=expected_state',
        ),
      );

      expect(user.id, 'u1');
      expect(storage.read('access_token'), 'at_123');
      expect(storage.read('refresh_token'), 'rt_456');
      expect(storage.read('id_token'), 'id_789');
      expect(storage.read('token_expiry'), isNotNull);
      expect(storage.read('user_data'), contains('"id":"u1"'));
      expect(storage.read('pkce_state'), isNull);
      expect(storage.read('pkce_code_verifier'), isNull);
      expect(storage.read('oidc_nonce'), isNull);
      expect(storage.read('auth_provider'), isNull);
    });
  });

  group('WebAuthService session management (stub platform)', () {
    late InMemoryTokenStorage storage;
    late WebAuthService service;

    setUp(() {
      storage = InMemoryTokenStorage();
      service = WebAuthService(storage: storage);
    });

    test('isSignedIn returns false when no token stored', () {
      expect(service.isSignedIn(), isFalse);
    });

    test('getStoredUser returns null when no data stored', () {
      expect(service.getStoredUser(), isNull);
    });

    test('getStoredUser returns null for invalid JSON', () {
      storage.write('user_data', '{not-json');
      expect(service.getStoredUser(), isNull);
    });

    test('getStoredUser returns parsed user when data is valid', () {
      storage.write('user_data', jsonEncode(_userJson(id: 'u-storage')));

      final user = service.getStoredUser();

      expect(user, isNotNull);
      expect(user!.id, 'u-storage');
    });

    test('getAccessToken returns null when no token stored', () {
      expect(service.getAccessToken(), isNull);
    });

    test('isSignedIn returns true when token has no expiry', () {
      storage.write('access_token', 'token');
      expect(service.isSignedIn(), isTrue);
    });

    test('isSignedIn returns true for valid expiry window', () {
      storage.write('access_token', 'token');
      storage.write(
        'token_expiry',
        DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      );
      expect(service.isSignedIn(), isTrue);
    });

    test('isSignedIn returns false for expired token', () {
      storage.write('access_token', 'token');
      storage.write(
        'token_expiry',
        DateTime.now().subtract(const Duration(minutes: 1)).toIso8601String(),
      );
      expect(service.isSignedIn(), isFalse);
    });

    test('isSignedIn returns false for invalid expiry format', () {
      storage.write('access_token', 'token');
      storage.write('token_expiry', 'not-a-date');
      expect(service.isSignedIn(), isFalse);
    });

    test('signOut does not throw', () {
      storage.write('access_token', 'token');
      storage.write('user_data', jsonEncode(_userJson()));
      expect(() => service.signOut(), returnsNormally);
      expect(storage.snapshot, isEmpty);
    });
  });

  group('WebAuthService callback exchanges', () {
    test('handles token exchange failure gracefully', () async {
      final client = http_testing.MockClient((request) async {
        return http.Response('{"error":"invalid_grant"}', 400);
      });
      final storage = InMemoryTokenStorage()
        ..write('pkce_state', 'expected')
        ..write('pkce_code_verifier', 'verifier');
      final svc = WebAuthService(httpClient: client, storage: storage);

      await expectLater(
        svc.handleCallback(
          Uri.parse(
            'https://app.lythaus.com/auth/callback?code=abc&state=expected',
          ),
        ),
        throwsA(isA<AuthFailure>()),
      );
      expect(storage.snapshot, isEmpty);
    });

    test('handles user fetch failure gracefully', () async {
      var callCount = 0;
      final client = http_testing.MockClient((request) async {
        callCount++;
        if (callCount == 1) {
          return http.Response(jsonEncode(_tokenResponseJson()), 200);
        }
        return http.Response('Not found', 404);
      });
      final storage = InMemoryTokenStorage()
        ..write('pkce_state', 'expected')
        ..write('pkce_code_verifier', 'verifier');
      final svc = WebAuthService(httpClient: client, storage: storage);

      await expectLater(
        svc.handleCallback(
          Uri.parse(
            'https://app.lythaus.com/auth/callback?code=abc&state=expected',
          ),
        ),
        throwsA(isA<AuthFailure>()),
      );
      expect(storage.read('access_token'), 'at_123');
    });

    test('rejects token responses without an access token', () async {
      final storage = InMemoryTokenStorage()
        ..write('pkce_state', 'expected')
        ..write('pkce_code_verifier', 'verifier');
      final client = http_testing.MockClient(
        (_) async => http.Response('{}', 200),
      );
      final svc = WebAuthService(httpClient: client, storage: storage);

      await expectLater(
        svc.handleCallback(
          Uri.parse(
            'https://app.lythaus.com/auth/callback?code=abc&state=expected',
          ),
        ),
        throwsA(isA<AuthFailure>()),
      );
      expect(storage.snapshot, isEmpty);
    });

    test('accepts a userinfo response wrapped in a user envelope', () async {
      final storage = InMemoryTokenStorage()
        ..write('pkce_state', 'expected')
        ..write('pkce_code_verifier', 'verifier');
      var callCount = 0;
      final client = http_testing.MockClient((_) async {
        callCount++;
        if (callCount == 1) {
          return http.Response(jsonEncode(_tokenResponseJson()), 200);
        }
        return http.Response(
          jsonEncode({'user': _userJson(id: 'wrapped-user')}),
          200,
        );
      });
      final svc = WebAuthService(httpClient: client, storage: storage);

      final user = await svc.handleCallback(
        Uri.parse(
          'https://app.lythaus.com/auth/callback?code=abc&state=expected',
        ),
      );

      expect(user.id, 'wrapped-user');
    });
  });

  group('User.fromJson/toJson roundtrip for session restore', () {
    test('serializes and deserializes correctly', () {
      final user = User(
        id: 'u-web-1',
        email: 'web@lythaus.com',
        role: UserRole.user,
        tier: UserTier.silver,
        reputationScore: 42,
        createdAt: DateTime(2026, 1, 1),
        lastLoginAt: DateTime(2026, 3, 31),
      );

      final json = jsonEncode(user.toJson());
      final restored = User.fromJson(jsonDecode(json) as Map<String, dynamic>);

      expect(restored.id, user.id);
      expect(restored.email, user.email);
      expect(restored.role, user.role);
      expect(restored.tier, user.tier);
      expect(restored.reputationScore, user.reputationScore);
    });

    test('handles API-style snake_case keys', () {
      final json = {
        'id': 'u-api',
        'email': 'api@lythaus.com',
        'role': 'moderator',
        'tier': 'gold',
        'reputation_score': 100,
        'created_at': '2026-01-01T00:00:00.000',
        'last_login_at': '2026-03-31T00:00:00.000',
      };

      final user = User.fromJson(json);
      expect(user.id, 'u-api');
      expect(user.reputationScore, 100);
    });
  });
}
