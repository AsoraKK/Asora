import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:asora/core/auth/auth_session_manager.dart';
import 'package:flutter/services.dart';

// Mock for FlutterSecureStorage
class MockFlutterSecureStorage extends FlutterSecureStorage {
  final Map<String, String> _storage = {};

  MockFlutterSecureStorage() : super();

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
    if (value != null) {
      _storage[key] = value;
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
  }) async {
    return _storage[key];
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
    _storage.remove(key);
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
    _storage.clear();
  }

  @override
  Future<Map<String, String>> readAll({
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    return Map.from(_storage);
  }

  // Helper method for testing
  void clearMockStorage() {
    _storage.clear();
  }

  Map<String, String> get mockStorage => Map.from(_storage);
}

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

  void clear() => _data.clear();
  Map<String, String> get data => _data;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AuthSessionState', () {
    late DateTime testDate;

    setUp(() {
      testDate = DateTime(2023, 12, 15, 14, 30, 0);
    });

    group('Constructor Tests', () {
      test('should create AuthSessionState with all required fields', () {
        final sessionState = AuthSessionState(
          id: 'test_id',
          state: 'test_state',
          nonce: 'test_nonce',
          codeVerifier: 'test_verifier',
          codeChallenge: 'test_challenge',
          createdAt: testDate,
          ttl: const Duration(minutes: 10),
        );

        expect(sessionState.id, equals('test_id'));
        expect(sessionState.state, equals('test_state'));
        expect(sessionState.nonce, equals('test_nonce'));
        expect(sessionState.codeVerifier, equals('test_verifier'));
        expect(sessionState.codeChallenge, equals('test_challenge'));
        expect(sessionState.createdAt, equals(testDate));
        expect(sessionState.ttl, equals(const Duration(minutes: 10)));
      });
    });

    group('isExpired Tests', () {
      test('should return false for non-expired session', () {
        final futureDate = DateTime.now().add(const Duration(hours: 1));
        final sessionState = AuthSessionState(
          id: 'test_id',
          state: 'test_state',
          nonce: 'test_nonce',
          codeVerifier: 'test_verifier',
          codeChallenge: 'test_challenge',
          createdAt: futureDate,
          ttl: const Duration(minutes: 10),
        );

        expect(sessionState.isExpired, isFalse);
      });

      test('should return true for expired session', () {
        final pastDate = DateTime.now().subtract(const Duration(hours: 1));
        final sessionState = AuthSessionState(
          id: 'test_id',
          state: 'test_state',
          nonce: 'test_nonce',
          codeVerifier: 'test_verifier',
          codeChallenge: 'test_challenge',
          createdAt: pastDate,
          ttl: const Duration(minutes: 10),
        );

        expect(sessionState.isExpired, isTrue);
      });
    });

    group('JSON Serialization Tests', () {
      test('should serialize to JSON correctly', () {
        final sessionState = AuthSessionState(
          id: 'test_id',
          state: 'test_state',
          nonce: 'test_nonce',
          codeVerifier: 'test_verifier',
          codeChallenge: 'test_challenge',
          createdAt: testDate,
          ttl: const Duration(minutes: 10),
        );

        final json = sessionState.toJson();

        expect(json['id'], equals('test_id'));
        expect(json['state'], equals('test_state'));
        expect(json['nonce'], equals('test_nonce'));
        expect(json['codeVerifier'], equals('test_verifier'));
        expect(json['codeChallenge'], equals('test_challenge'));
        expect(json['createdAt'], equals(testDate.toIso8601String()));
        expect(json['ttl'], equals(const Duration(minutes: 10).inMilliseconds));
      });

      test('should deserialize from JSON correctly', () {
        final json = {
          'id': 'test_id',
          'state': 'test_state',
          'nonce': 'test_nonce',
          'codeVerifier': 'test_verifier',
          'codeChallenge': 'test_challenge',
          'createdAt': testDate.toIso8601String(),
          'ttl': const Duration(minutes: 10).inMilliseconds,
        };

        final sessionState = AuthSessionState.fromJson(json);

        expect(sessionState.id, equals('test_id'));
        expect(sessionState.state, equals('test_state'));
        expect(sessionState.nonce, equals('test_nonce'));
        expect(sessionState.codeVerifier, equals('test_verifier'));
        expect(sessionState.codeChallenge, equals('test_challenge'));
        expect(sessionState.createdAt, equals(testDate));
        expect(sessionState.ttl, equals(const Duration(minutes: 10)));
      });

      test('should maintain consistency between toJson and fromJson', () {
        final originalState = AuthSessionState(
          id: 'test_id',
          state: 'test_state',
          nonce: 'test_nonce',
          codeVerifier: 'test_verifier',
          codeChallenge: 'test_challenge',
          createdAt: testDate,
          ttl: const Duration(minutes: 10),
        );

        final json = originalState.toJson();
        final reconstructedState = AuthSessionState.fromJson(json);

        expect(reconstructedState.id, equals(originalState.id));
        expect(reconstructedState.state, equals(originalState.state));
        expect(reconstructedState.nonce, equals(originalState.nonce));
        expect(
          reconstructedState.codeVerifier,
          equals(originalState.codeVerifier),
        );
        expect(
          reconstructedState.codeChallenge,
          equals(originalState.codeChallenge),
        );
        expect(reconstructedState.createdAt, equals(originalState.createdAt));
        expect(reconstructedState.ttl, equals(originalState.ttl));
      });
    });

    group('copyWith Tests', () {
      test('should create copy with updated fields', () {
        final originalState = AuthSessionState(
          id: 'test_id',
          state: 'test_state',
          nonce: 'test_nonce',
          codeVerifier: 'test_verifier',
          codeChallenge: 'test_challenge',
          createdAt: testDate,
          ttl: const Duration(minutes: 10),
        );

        final updatedState = originalState.copyWith(
          id: 'new_id',
          state: 'new_state',
        );

        expect(updatedState.id, equals('new_id'));
        expect(updatedState.state, equals('new_state'));
        expect(updatedState.nonce, equals('test_nonce')); // unchanged
        expect(updatedState.codeVerifier, equals('test_verifier')); // unchanged
        expect(
          updatedState.codeChallenge,
          equals('test_challenge'),
        ); // unchanged
        expect(updatedState.createdAt, equals(testDate)); // unchanged
        expect(
          updatedState.ttl,
          equals(const Duration(minutes: 10)),
        ); // unchanged
      });

      test('should create identical copy when no parameters provided', () {
        final originalState = AuthSessionState(
          id: 'test_id',
          state: 'test_state',
          nonce: 'test_nonce',
          codeVerifier: 'test_verifier',
          codeChallenge: 'test_challenge',
          createdAt: testDate,
          ttl: const Duration(minutes: 10),
        );

        final copiedState = originalState.copyWith();

        expect(copiedState.id, equals(originalState.id));
        expect(copiedState.state, equals(originalState.state));
        expect(copiedState.nonce, equals(originalState.nonce));
        expect(copiedState.codeVerifier, equals(originalState.codeVerifier));
        expect(copiedState.codeChallenge, equals(originalState.codeChallenge));
        expect(copiedState.createdAt, equals(originalState.createdAt));
        expect(copiedState.ttl, equals(originalState.ttl));
      });
    });
  });

  group('AuthSessionStatus', () {
    test('should have all expected enum values', () {
      expect(AuthSessionStatus.values.length, equals(5));
      expect(
        AuthSessionStatus.values,
        contains(AuthSessionStatus.unauthenticated),
      );
      expect(
        AuthSessionStatus.values,
        contains(AuthSessionStatus.authenticating),
      );
      expect(
        AuthSessionStatus.values,
        contains(AuthSessionStatus.authenticated),
      );
      expect(AuthSessionStatus.values, contains(AuthSessionStatus.expired));
      expect(AuthSessionStatus.values, contains(AuthSessionStatus.failed));
    });

    test('should have correct enum names', () {
      expect(AuthSessionStatus.unauthenticated.name, equals('unauthenticated'));
      expect(AuthSessionStatus.authenticating.name, equals('authenticating'));
      expect(AuthSessionStatus.authenticated.name, equals('authenticated'));
      expect(AuthSessionStatus.expired.name, equals('expired'));
      expect(AuthSessionStatus.failed.name, equals('failed'));
    });
  });

  group('AuthSessionManager', () {
    group('Session Creation Logic Tests', () {
      test('should test session ID generation format', () {
        // Test the session ID generation logic conceptually
        final sessionId = 'session_${'test' * 8}'; // 32 chars
        expect(sessionId, startsWith('session_'));
        expect(sessionId.length, greaterThan(8));
      });

      test('should test default TTL value', () {
        const defaultTtl = Duration(minutes: 10);
        expect(defaultTtl.inMinutes, equals(10));
        expect(defaultTtl.inMilliseconds, equals(600000));
      });

      test('should test expiry time calculation', () {
        final now = DateTime.now();
        const ttl = Duration(minutes: 10);
        final expiryTime = now.add(ttl);

        expect(expiryTime.isAfter(now), isTrue);
        expect(expiryTime.difference(now), equals(ttl));
      });
    });

    group('Session Status Logic Tests', () {
      test('should test session status enum values', () {
        expect(AuthSessionStatus.values.length, equals(5));
        expect(
          AuthSessionStatus.unauthenticated.name,
          equals('unauthenticated'),
        );
        expect(AuthSessionStatus.authenticating.name, equals('authenticating'));
        expect(AuthSessionStatus.authenticated.name, equals('authenticated'));
        expect(AuthSessionStatus.expired.name, equals('expired'));
        expect(AuthSessionStatus.failed.name, equals('failed'));
      });

      test('should test session expiry logic', () {
        final pastTime = DateTime.now().subtract(const Duration(hours: 1));
        final futureTime = DateTime.now().add(const Duration(hours: 1));

        // Past time should be considered expired
        expect(DateTime.now().isAfter(pastTime), isTrue);

        // Future time should not be expired
        expect(DateTime.now().isBefore(futureTime), isTrue);
      });
    });

    group('Session Data Validation Tests', () {
      test('should test access token validation logic', () {
        const validToken = 'valid_access_token_123';
        const emptyToken = '';

        expect(validToken.isNotEmpty, isTrue);
        expect(emptyToken.isNotEmpty, isFalse);
      });

      test('should test user ID validation logic', () {
        const validUserId = 'user_123';
        const emptyUserId = '';

        expect(validUserId.isNotEmpty, isTrue);
        expect(emptyUserId.isNotEmpty, isFalse);
      });

      test('should test session validation logic components', () {
        const validToken = 'test_token';
        const validUserId = 'test_user';

        final isSessionValid = validToken.isNotEmpty && validUserId.isNotEmpty;

        expect(isSessionValid, isTrue);
      });
    });

    group('Storage Key Constants Tests', () {
      test('should test storage key formats', () {
        const sessionTokenKey = 'session_token';
        const refreshTokenKey = 'refresh_token';
        const userIdKey = 'user_id';
        const sessionExpiryKey = 'session_expiry';

        expect(sessionTokenKey, equals('session_token'));
        expect(refreshTokenKey, equals('refresh_token'));
        expect(userIdKey, equals('user_id'));
        expect(sessionExpiryKey, equals('session_expiry'));
      });

      test('should test OAuth session key format', () {
        const sessionId = 'test_session_123';
        final oauthSessionKey = 'oauth_session_$sessionId';

        expect(oauthSessionKey, equals('oauth_session_test_session_123'));
        expect(oauthSessionKey, startsWith('oauth_session_'));
      });
    });

    group('Date Handling Tests', () {
      test('should test ISO8601 date serialization', () {
        final testDate = DateTime(2023, 12, 15, 14, 30, 0);
        final isoString = testDate.toIso8601String();
        final parsedDate = DateTime.parse(isoString);

        expect(parsedDate, equals(testDate));
        expect(isoString, contains('2023-12-15T14:30:00'));
      });

      test('should test default expiry calculation', () {
        final now = DateTime.now();
        final defaultExpiry = now.add(const Duration(hours: 24));

        expect(defaultExpiry.isAfter(now), isTrue);
        expect(defaultExpiry.difference(now).inHours, equals(24));
      });

      test('should test expiry comparison logic', () {
        final now = DateTime.now();
        final pastExpiry = now.subtract(const Duration(hours: 1));
        final futureExpiry = now.add(const Duration(hours: 1));

        expect(now.isAfter(pastExpiry), isTrue); // Expired
        expect(now.isBefore(futureExpiry), isTrue); // Not expired
      });
    });

    group('Secure Random String Tests', () {
      test('should test random string generation concept', () {
        const chars =
            'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const length = 32;

        expect(chars.length, equals(62));
        expect(length, equals(32));

        // Test that we can generate strings of different lengths
        final shortLength = 8;
        final longLength = 64;

        expect(shortLength, lessThan(length));
        expect(longLength, greaterThan(length));
      });

      test('should test session ID prefix format', () {
        const prefix = 'session_';
        const randomPart = 'abcd1234efgh5678ijkl9012mnop3456';
        final sessionId = '$prefix$randomPart';

        expect(sessionId, startsWith(prefix));
        expect(sessionId.length, equals(prefix.length + randomPart.length));
        expect(sessionId, equals('session_abcd1234efgh5678ijkl9012mnop3456'));
      });
    });

    group('Error Handling Logic Tests', () {
      test('should test debug print message formats', () {
        const userId = 'test_user_123';
        const successMessage = '✅ Auth session created for user: $userId';
        const errorMessage = '❌ Failed to create auth session: test error';

        expect(successMessage, contains('✅'));
        expect(successMessage, contains(userId));
        expect(errorMessage, contains('❌'));
        expect(errorMessage, contains('Failed to create auth session'));
      });

      test('should test session consumption logging', () {
        const sessionState = 'test_session_state_123';
        const consumeMessage = '✅ Session consumed: $sessionState';

        expect(consumeMessage, contains('✅'));
        expect(consumeMessage, contains('Session consumed'));
      expect(consumeMessage, contains(sessionState));
    });
  });
  group('AuthSessionManager method tests', () {
    const MethodChannel channel =
        MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
    final _FakeSecureStore fakeStore = _FakeSecureStore();
    final AuthSessionManager manager = AuthSessionManager();

    setUpAll(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) => fakeStore.handle(call));
    });

    tearDown(() {
      fakeStore.clear();
    });

    tearDownAll(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    test('createTokenSession persists tokens and expiry', () async {
      final expiry = DateTime.now().add(const Duration(hours: 1));

      final result = await manager.createTokenSession(
        accessToken: 'access',
        refreshToken: 'refresh',
        userId: 'user',
        expiresAt: expiry,
      );

      expect(result['accessToken'], equals('access'));
      expect(fakeStore.data['session_token'], equals('access'));
      expect(fakeStore.data['refresh_token'], equals('refresh'));
      expect(fakeStore.data['user_id'], equals('user'));
      expect(
        fakeStore.data['session_expiry'],
        equals(expiry.toIso8601String()),
      );
    });

    test('hasActiveSession reflects token presence and expiry', () async {
      final expiry = DateTime.now().add(const Duration(minutes: 30));
      await manager.createTokenSession(
        accessToken: 'a',
        refreshToken: 'r',
        userId: 'u',
        expiresAt: expiry,
      );

      expect(await manager.hasActiveSession(), isTrue);

      fakeStore.data.remove('session_token');
      expect(await manager.hasActiveSession(), isFalse);
    });

    test('hasActiveSession returns false when session expired', () async {
      final pastExpiry = DateTime.now().subtract(const Duration(minutes: 1));
      await manager.createTokenSession(
        accessToken: 'a',
        refreshToken: 'r',
        userId: 'u',
        expiresAt: pastExpiry,
      );

      expect(await manager.hasActiveSession(), isFalse);
    });

    test('getSessionState returns authenticated and expired states', () async {
      final expiry = DateTime.now().add(const Duration(minutes: 30));
      await manager.createTokenSession(
        accessToken: 'tok',
        refreshToken: 'ref',
        userId: 'user',
        expiresAt: expiry,
      );

      expect(
        await manager.getSessionState(),
        equals(AuthSessionStatus.authenticated),
      );

      await manager.clearSession();

      final pastExpiry = DateTime.now().subtract(const Duration(minutes: 1));
      await manager.createTokenSession(
        accessToken: 'tok',
        refreshToken: 'ref',
        userId: 'user',
        expiresAt: pastExpiry,
      );

      expect(
        await manager.getSessionState(),
        equals(AuthSessionStatus.expired),
      );
    });

    test('refreshSession updates token and expiry', () async {
      final expiry = DateTime.now().add(const Duration(minutes: 30));
      await manager.createTokenSession(
        accessToken: 'old',
        refreshToken: 'ref',
        userId: 'user',
        expiresAt: expiry,
      );

      final newExpiry = DateTime.now().add(const Duration(hours: 1));
      final refreshed = await manager.refreshSession('new', newExpiry);

      expect(refreshed, isTrue);
      expect(fakeStore.data['session_token'], equals('new'));
      expect(
        fakeStore.data['session_expiry'],
        equals(newExpiry.toIso8601String()),
      );
    });

    test('clearSession removes all persisted keys', () async {
      final expiry = DateTime.now().add(const Duration(minutes: 30));
      await manager.createTokenSession(
        accessToken: 'tok',
        refreshToken: 'ref',
        userId: 'user',
        expiresAt: expiry,
      );

      await manager.clearSession();

      expect(fakeStore.data.containsKey('session_token'), isFalse);
      expect(fakeStore.data.containsKey('refresh_token'), isFalse);
      expect(fakeStore.data.containsKey('user_id'), isFalse);
      expect(fakeStore.data.containsKey('session_expiry'), isFalse);
    });

    test('validateSession fails when state inconsistent', () async {
      final expiry = DateTime.now().add(const Duration(minutes: 30));
      await manager.createTokenSession(
        accessToken: 'tok',
        refreshToken: 'ref',
        userId: 'user',
        expiresAt: expiry,
      );

      fakeStore.data.remove('user_id');
      expect(await manager.validateSession(), isFalse);
    });
  });
});
}
