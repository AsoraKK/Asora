// Additional comprehensive tests to improve coverage for auth session manager
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:asora/core/auth/auth_session_manager.dart';
import 'package:asora/core/auth/pkce_helper.dart';

/// In-memory fake for flutter_secure_storage
class _FakeSecureStore {
  final Map<String, String> _data = {};
  Future<dynamic> handle(MethodCall call) async {
    switch (call.method) {
      case 'write':
        _data['${call.arguments['key']}'] =
            call.arguments['value'] as String? ?? '';
        return null;
      case 'read':
        return _data['${call.arguments['key']}'];
      case 'delete':
        _data.remove('${call.arguments['key']}');
        return null;
      case 'readAll':
        return Map<String, String>.from(_data);
      case 'deleteAll':
        _data.clear();
        return null;
      case 'containsKey':
        return _data.containsKey('${call.arguments['key']}');
      default:
        return null;
    }
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // Channel name used by flutter_secure_storage
  const MethodChannel channel = MethodChannel(
    'plugins.it_nomads.com/flutter_secure_storage',
  );
  final _FakeSecureStore fake = _FakeSecureStore();

  setUpAll(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) => fake.handle(call));
  });

  tearDownAll(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  group('AuthSessionState Model Tests', () {
    test('should handle JSON serialization correctly', () {
      final session = AuthSessionState(
        id: 'test-session-id',
        state: 'test-state',
        nonce: 'test-nonce',
        codeVerifier: 'test-verifier',
        codeChallenge: 'test-challenge',
        createdAt: DateTime(2023, 1, 1, 12, 0, 0),
        ttl: const Duration(minutes: 15),
      );

      // Test toJson
      final json = session.toJson();
      expect(json['state'], equals('test-state'));
      expect(json['nonce'], equals('test-nonce'));
      expect(json['codeVerifier'], equals('test-verifier'));
      expect(json['codeChallenge'], equals('test-challenge'));
      expect(json['ttl'], equals(15 * 60 * 1000)); // 15 minutes in milliseconds

      // Test fromJson
      final restored = AuthSessionState.fromJson(json);
      expect(restored.state, equals(session.state));
      expect(restored.nonce, equals(session.nonce));
      expect(restored.codeVerifier, equals(session.codeVerifier));
      expect(restored.codeChallenge, equals(session.codeChallenge));
      expect(restored.ttl, equals(session.ttl));
    });

    test('should handle custom TTL values correctly', () {
      const shortTtl = Duration(minutes: 5);
      const longTtl = Duration(hours: 2);

      final shortSession = AuthSessionState(
        id: 'short-session-id',
        state: 'short-state',
        nonce: 'short-nonce',
        codeVerifier: 'short-verifier',
        codeChallenge: 'short-challenge',
        createdAt: DateTime.now(),
        ttl: shortTtl,
      );

      final longSession = AuthSessionState(
        id: 'long-session-id',
        state: 'long-state',
        nonce: 'long-nonce',
        codeVerifier: 'long-verifier',
        codeChallenge: 'long-challenge',
        createdAt: DateTime.now(),
        ttl: longTtl,
      );

      expect(shortSession.ttl, equals(shortTtl));
      expect(longSession.ttl, equals(longTtl));
    });

    test('should correctly identify expired sessions', () {
      // Create an expired session (in the past)
      final expiredSession = AuthSessionState(
        id: 'expired-session-id',
        state: 'expired-state',
        nonce: 'expired-nonce',
        codeVerifier: 'expired-verifier',
        codeChallenge: 'expired-challenge',
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
        ttl: const Duration(minutes: 30),
      );

      expect(expiredSession.isExpired, isTrue);
    });

    test('should correctly identify non-expired sessions', () {
      // Create a fresh session
      final freshSession = AuthSessionState(
        id: 'fresh-session-id',
        state: 'fresh-state',
        nonce: 'fresh-nonce',
        codeVerifier: 'fresh-verifier',
        codeChallenge: 'fresh-challenge',
        createdAt: DateTime.now(),
        ttl: const Duration(minutes: 30),
      );

      expect(freshSession.isExpired, isFalse);
    });

    test('should handle edge case: exactly at expiry', () {
      final now = DateTime.now();
      final sessionAtExpiry = AuthSessionState(
        id: 'expiry-session-id',
        state: 'expiry-state',
        nonce: 'expiry-nonce',
        codeVerifier: 'expiry-verifier',
        codeChallenge: 'expiry-challenge',
        createdAt: now.subtract(
          const Duration(minutes: 30, seconds: 1),
        ), // Make it slightly expired
        ttl: const Duration(minutes: 30),
      );

      // This should be expired
      expect(sessionAtExpiry.isExpired, isTrue);
    });

    test('should support copyWith method for immutable updates', () {
      final originalSession = AuthSessionState(
        id: 'original-session-id',
        state: 'original-state',
        nonce: 'original-nonce',
        codeVerifier: 'original-verifier',
        codeChallenge: 'original-challenge',
        createdAt: DateTime(2023, 1, 1),
        ttl: const Duration(minutes: 15),
      );

      final updatedSession = originalSession.copyWith(
        state: 'updated-state',
        ttl: const Duration(minutes: 30),
      );

      expect(updatedSession.state, equals('updated-state'));
      expect(updatedSession.ttl, equals(const Duration(minutes: 30)));
      // Other fields should remain unchanged
      expect(updatedSession.nonce, equals('original-nonce'));
      expect(updatedSession.codeVerifier, equals('original-verifier'));
      expect(updatedSession.codeChallenge, equals('original-challenge'));
    });
  });

  group('AuthSessionStatus Enum Tests', () {
    test('should have all expected status values', () {
      const allStatuses = AuthSessionStatus.values;
      expect(allStatuses, contains(AuthSessionStatus.unauthenticated));
      expect(allStatuses, contains(AuthSessionStatus.authenticating));
      expect(allStatuses, contains(AuthSessionStatus.authenticated));
      expect(allStatuses, contains(AuthSessionStatus.expired));
      expect(allStatuses, contains(AuthSessionStatus.failed));
    });

    test('should convert status to string correctly', () {
      expect(
        AuthSessionStatus.authenticated.toString(),
        equals('AuthSessionStatus.authenticated'),
      );
      expect(
        AuthSessionStatus.unauthenticated.toString(),
        equals('AuthSessionStatus.unauthenticated'),
      );
    });
  });

  group('PkceHelper Tests', () {
    test('should generate code verifier with default length', () {
      final verifier = PkceHelper.generateCodeVerifier();
      expect(verifier.length, equals(43)); // Default length
      expect(
        verifier,
        matches(RegExp(r'^[A-Za-z0-9._~-]+$')),
      ); // Valid characters only
    });

    test('should generate code verifier with custom length', () {
      final shortVerifier = PkceHelper.generateCodeVerifier(length: 50);
      final longVerifier = PkceHelper.generateCodeVerifier(length: 100);

      expect(shortVerifier.length, equals(50));
      expect(longVerifier.length, equals(100));
      expect(shortVerifier, matches(RegExp(r'^[A-Za-z0-9._~-]+$')));
      expect(longVerifier, matches(RegExp(r'^[A-Za-z0-9._~-]+$')));
    });

    test('should generate unique code verifiers', () {
      final verifier1 = PkceHelper.generateCodeVerifier();
      final verifier2 = PkceHelper.generateCodeVerifier();
      final verifier3 = PkceHelper.generateCodeVerifier();

      expect(verifier1, isNot(equals(verifier2)));
      expect(verifier2, isNot(equals(verifier3)));
      expect(verifier1, isNot(equals(verifier3)));
    });

    test('should generate code challenge from verifier', () {
      const testVerifier = 'test-verifier-123';
      final challenge = PkceHelper.generateCodeChallenge(testVerifier);

      expect(challenge, isNotEmpty);
      expect(
        challenge,
        isNot(equals(testVerifier)),
      ); // Should be different from verifier
      // Should be base64url encoded (no padding, uses - and _ instead of + and /)
      expect(challenge, matches(RegExp(r'^[A-Za-z0-9_-]+$')));
    });

    test('should generate consistent challenge for same verifier', () {
      const testVerifier = 'consistent-test-verifier';
      final challenge1 = PkceHelper.generateCodeChallenge(testVerifier);
      final challenge2 = PkceHelper.generateCodeChallenge(testVerifier);

      expect(challenge1, equals(challenge2));
    });

    test('should validate code challenge correctly', () {
      final verifier = PkceHelper.generateCodeVerifier();
      final challenge = PkceHelper.generateCodeChallenge(verifier);

      expect(PkceHelper.validateCodeChallenge(verifier, challenge), isTrue);
    });

    test('should reject invalid code challenge', () {
      final verifier = PkceHelper.generateCodeVerifier();
      const wrongChallenge = 'wrong-challenge-value';

      expect(
        PkceHelper.validateCodeChallenge(verifier, wrongChallenge),
        isFalse,
      );
    });

    test('should handle edge case lengths for code verifier', () {
      // Test minimum length (43)
      final minVerifier = PkceHelper.generateCodeVerifier(length: 43);
      expect(minVerifier.length, equals(43));

      // Test maximum length (128)
      final maxVerifier = PkceHelper.generateCodeVerifier(length: 128);
      expect(maxVerifier.length, equals(128));
    });

    test('should validate PKCE helper character set compliance', () {
      final verifier = PkceHelper.generateCodeVerifier(length: 100);

      // RFC 7636: code verifier should be unreserved characters
      // unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
      final validChars = RegExp(r'^[A-Za-z0-9._~-]+$');
      expect(verifier, matches(validChars));

      // Should not contain any reserved characters
      expect(verifier, isNot(contains('+')));
      expect(verifier, isNot(contains('/')));
      expect(verifier, isNot(contains('=')));
      expect(verifier, isNot(contains(' ')));
    });

    test('should validate code verifier length constraints', () {
      // Test that invalid lengths are rejected
      expect(
        () => PkceHelper.generateCodeVerifier(length: 42),
        throwsA(isA<ArgumentError>()),
      );
      expect(
        () => PkceHelper.generateCodeVerifier(length: 129),
        throwsA(isA<ArgumentError>()),
      );
      expect(
        () => PkceHelper.generateCodeVerifier(length: 0),
        throwsA(isA<ArgumentError>()),
      );
      expect(
        () => PkceHelper.generateCodeVerifier(length: -1),
        throwsA(isA<ArgumentError>()),
      );
    });

    test('should generate PKCE pair correctly', () {
      final pkcePair = PkceHelper.generatePkcePair();
      expect(pkcePair, hasLength(2));
      expect(pkcePair, containsPair('verifier', isA<String>()));
      expect(pkcePair, containsPair('challenge', isA<String>()));

      final verifier = pkcePair['verifier']!;
      final challenge = pkcePair['challenge']!;

      expect(verifier.length, equals(43));
      expect(challenge, isNotEmpty);
      expect(PkceHelper.validateCodeChallenge(verifier, challenge), isTrue);
    });

    test('should generate OAuth2 state parameter', () {
      final state1 = PkceHelper.generateState();
      final state2 = PkceHelper.generateState();

      expect(state1, isNotEmpty);
      expect(state2, isNotEmpty);
      expect(state1, isNot(equals(state2))); // Should be unique
      expect(state1, matches(RegExp(r'^[A-Za-z0-9_-]+$'))); // Base64url format
    });
  });
}
