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

// ---------------------------------------------------------------------------
// Testable subclass that takes an injectable storage
// ---------------------------------------------------------------------------

class TestableWebAuthService extends WebAuthService {
  TestableWebAuthService({
    required this.storage,
    required http.Client httpClient,
  }) : super(httpClient: httpClient);

  final InMemoryTokenStorage storage;
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

      return WebAuthService(httpClient: client);
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
  });

  group('WebAuthService session management (stub platform)', () {
    late WebAuthService service;

    setUp(() {
      service = WebAuthService();
    });

    test('isSignedIn returns false when no token stored', () {
      expect(service.isSignedIn(), isFalse);
    });

    test('getStoredUser returns null when no data stored', () {
      expect(service.getStoredUser(), isNull);
    });

    test('getAccessToken returns null when no token stored', () {
      expect(service.getAccessToken(), isNull);
    });

    test('signOut does not throw', () {
      expect(() => service.signOut(), returnsNormally);
    });
  });

  group('WebAuthService PKCE generation', () {
    test('handles token exchange failure gracefully', () async {
      final client = http_testing.MockClient((request) async {
        return http.Response('{"error":"invalid_grant"}', 400);
      });
      final svc = WebAuthService(httpClient: client);

      expect(
        () => svc.handleCallback(
          Uri.parse('https://app.lythaus.com/auth/callback?code=abc'),
        ),
        throwsA(isA<AuthFailure>()),
      );
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
      final svc = WebAuthService(httpClient: client);

      expect(
        () => svc.handleCallback(
          Uri.parse('https://app.lythaus.com/auth/callback?code=abc'),
        ),
        throwsA(isA<AuthFailure>()),
      );
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
