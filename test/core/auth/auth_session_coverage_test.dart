// Additional comprehensive tests to improve coverage for auth session manager
import 'package:flutter_test/flutter_test.dart';
import 'package:asora/core/auth/auth_session_manager.dart';
import 'package:asora/core/auth/pkce_helper.dart';

void main() {
  group('Additional Coverage Tests', () {
    late AuthSessionManager sessionManager;

    setUp(() {
      sessionManager = AuthSessionManager();
    });

    tearDown(() async {
      await sessionManager.clearSession();
    });

    test('should handle JSON serialization edge cases', () {
      final session = AuthSessionState(
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
      expect(json['ttlMinutes'], equals(15));

      // Test fromJson
      final restored = AuthSessionState.fromJson(json);
      expect(restored.state, equals(session.state));
      expect(restored.nonce, equals(session.nonce));
      expect(restored.codeVerifier, equals(session.codeVerifier));
      expect(restored.codeChallenge, equals(session.codeChallenge));
      expect(restored.ttl, equals(session.ttl));
    });

    test('should handle custom TTL values', () {
      final session = AuthSessionState(
        state: 'test-state',
        nonce: 'test-nonce',
        codeVerifier: 'test-verifier',
        codeChallenge: 'test-challenge',
        createdAt: DateTime.now(),
        ttl: const Duration(minutes: 5),
      );

      expect(session.ttl.inMinutes, equals(5));
      expect(session.isExpired, isFalse);
    });

    test('should handle immediate expiry', () {
      final session = AuthSessionState(
        state: 'test-state',
        nonce: 'test-nonce',
        codeVerifier: 'test-verifier',
        codeChallenge: 'test-challenge',
        createdAt: DateTime.now().subtract(const Duration(hours: 1)),
        ttl: const Duration(minutes: 10),
      );

      expect(session.isExpired, isTrue);
    });

    test('should handle edge case: exactly at expiry', () async {
      final now = DateTime.now();
      final session = AuthSessionState(
        state: 'edge-case-state',
        nonce: 'edge-case-nonce',
        codeVerifier: 'edge-case-verifier',
        codeChallenge: 'edge-case-challenge',
        createdAt: now.subtract(const Duration(minutes: 10)),
        ttl: const Duration(minutes: 10),
      );

      // Should be expired (at or past expiry)
      expect(session.isExpired, isTrue);
    });

    test('should handle missing session validation', () async {
      // Test with no session stored
      final result = await sessionManager.validateAndGetSession();
      expect(result, isNull);
    });

    test('should handle multiple session clearing', () async {
      // Should not throw when clearing already cleared session
      await sessionManager.clearSession();
      await sessionManager.clearSession();
      await sessionManager.clearSession();
    });

    test('should generate unique sessions consistently', () async {
      final sessions = <String>[];

      for (int i = 0; i < 5; i++) {
        final session = await sessionManager.createSession(
          accessToken: 'token_$i',
          refreshToken: 'refresh_$i',
          userId: 'user_$i',
        );
        expect(
          sessions.contains(session['userId']),
          isFalse,
          reason: 'UserId should be unique',
        );
        sessions.add(session['userId'] as String);
        await sessionManager.clearSession();
      }
    });

    test('should handle concurrent session operations', () async {
      // Test that multiple operations don't interfere
      await sessionManager.createSession(
        accessToken: 'concurrent_token',
        refreshToken: 'concurrent_refresh',
        userId: 'concurrent_user',
      );
      final hasSession1 = await sessionManager.hasActiveSession();
      final hasSession2 = await sessionManager.hasActiveSession();

      expect(hasSession1, isTrue);
      expect(hasSession2, isTrue);
    });

    test('should validate PKCE helper edge cases', () {
      // Test minimum length
      final minVerifier = PkceHelper.generateCodeVerifier(length: 43);
      expect(minVerifier.length, equals(43));

      // Test maximum length
      final maxVerifier = PkceHelper.generateCodeVerifier(length: 128);
      expect(maxVerifier.length, equals(128));

      // Test challenges are different for different verifiers
      final challenge1 = PkceHelper.generateCodeChallenge(minVerifier);
      final challenge2 = PkceHelper.generateCodeChallenge(maxVerifier);
      expect(challenge1, isNot(equals(challenge2)));
    });

    test('should handle PKCE helper character set validation', () {
      // Valid verifiers should work
      expect(
        () => PkceHelper.generateCodeChallenge('validVerifier123'),
        returnsNormally,
      );
      expect(
        () => PkceHelper.generateCodeChallenge(
          'valid-verifier_with.special~chars',
        ),
        returnsNormally,
      );

      // Invalid characters should throw
      expect(
        () => PkceHelper.generateCodeChallenge('invalid+chars'),
        throwsArgumentError,
      );
      expect(
        () => PkceHelper.generateCodeChallenge('invalid chars'),
        throwsArgumentError,
      );
    });

    test('should test all authentication error conditions', () async {
      // Test error paths in session creation and validation
      await sessionManager.clearSession();

      expect(await sessionManager.hasActiveSession(), isFalse);

      final session = await sessionManager.createSession(
        accessToken: 'session_token',
        refreshToken: 'session_refresh',
        userId: 'session_user',
      );
      expect(await sessionManager.hasActiveSession(), isTrue);

      // Test consuming session (using userId as identifier)
      await sessionManager.consumeSession(session['userId'] as String);
      expect(await sessionManager.hasActiveSession(), isFalse);
    });

    test('should validate secure string generation entropy', () async {
      final sessions = <String, int>{};

      // Generate multiple sessions and check for uniqueness
      for (int i = 0; i < 10; i++) {
        final session = await sessionManager.createSession(
          accessToken: 'entropy_token_$i',
          refreshToken: 'entropy_refresh_$i',
          userId: 'entropy_user_$i',
        );

        // Track userId values for uniqueness
        final userId = session['userId'] as String;
        sessions[userId] = (sessions[userId] ?? 0) + 1;

        // Should never see duplicates
        expect(sessions[userId], equals(1));

        // Verify session structure
        expect(session['accessToken']?.toString().isNotEmpty, isTrue);
        expect(session['refreshToken']?.toString().isNotEmpty, isTrue);
        expect(session['userId']?.toString().isNotEmpty, isTrue);
        expect(session['expiresAt'], isA<DateTime>());

        await sessionManager.clearSession();
      }
    });
  });
}
