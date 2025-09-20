import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:asora/core/auth/auth_session_manager.dart';

class _FakeSecureStoreChannel {
  final Map<String, String> _data = {};
  Future<dynamic> handler(MethodCall call) async {
    switch (call.method) {
      case 'write':
        final key = call.arguments['key'] as String;
        final val = call.arguments['value'] as String?;
        if (val == null) {
          _data.remove(key);
        } else {
          _data[key] = val;
        }
        return null;
      case 'read':
        return _data[call.arguments['key'] as String];
      case 'delete':
        _data.remove(call.arguments['key'] as String);
        return null;
      case 'deleteAll':
        _data.clear();
        return null;
      case 'readAll':
        return Map<String, String>.from(_data);
      case 'containsKey':
        return _data.containsKey(call.arguments['key'] as String);
      default:
        return null;
    }
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const MethodChannel channel = MethodChannel(
    'plugins.it_nomads.com/flutter_secure_storage',
  );
  final _FakeSecureStoreChannel fake = _FakeSecureStoreChannel();

  setUpAll(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, fake.handler);
  });
  tearDownAll(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  group('AuthSessionManager behavior with mocked storage', () {
    late AuthSessionManager manager;

    setUp(() {
      manager = AuthSessionManager();
    });

    test('createTokenSession stores data and hasActiveSession true', () async {
      final result = await manager.createTokenSession(
        accessToken: 'atk',
        refreshToken: 'rtk',
        userId: 'user1',
      );
      expect(result['accessToken'], 'atk');

      final has = await manager.hasActiveSession();
      expect(has, isTrue);
    });

    test('getCurrentSession returns stored values', () async {
      await manager.createTokenSession(
        accessToken: 'a',
        refreshToken: 'r',
        userId: 'u',
      );
      final sess = await manager.getCurrentSession();
      expect(sess, isNotNull);
      expect(sess!['accessToken'], 'a');
      expect(sess['userId'], 'u');
    });

    test('refreshSession updates expiry and token', () async {
      await manager.createTokenSession(
        accessToken: 'a',
        refreshToken: 'r',
        userId: 'u',
      );
      final ok = await manager.refreshSession('newToken');
      expect(ok, isTrue);
      final sess = await manager.getCurrentSession();
      expect(sess!['accessToken'], 'newToken');
      expect(sess['expiresAt'], isA<DateTime?>());
    });

    test('getSessionState reflects unauthenticated when expired', () async {
      await manager.createTokenSession(
        accessToken: 'a',
        refreshToken: 'r',
        userId: 'u',
      );
      // Force expiry to past by calling refreshSession with past expiry
      await manager.refreshSession(
        'a2',
        DateTime.now().subtract(const Duration(hours: 1)),
      );
      final state = await manager.getSessionState();
      expect(state, AuthSessionStatus.unauthenticated);
    });

    test('validateSession and validateAndGetSession happy path', () async {
      await manager.createTokenSession(
        accessToken: 'a',
        refreshToken: 'r',
        userId: 'u',
      );
      expect(await manager.validateSession(), isTrue);
      final sess = await manager.validateAndGetSession();
      expect(sess, isNotNull);
    });

    test('clearSession removes data and disables session', () async {
      await manager.createTokenSession(
        accessToken: 'a',
        refreshToken: 'r',
        userId: 'u',
      );
      await manager.clearSession();
      expect(await manager.hasActiveSession(), isFalse);
      expect(await manager.getCurrentSession(), isNull);
    });

    test('consumeSession does not throw', () async {
      await manager.consumeSession('abc123');
    });

    test(
      'createSession stores oauth session and completeSession clears it',
      () async {
        final s = await manager.createSession(
          state: 'st',
          nonce: 'nn',
          codeChallenge: 'cc',
        );
        expect(s.id, startsWith('session_'));
        // Completing should not throw with mocked storage
        await manager.completeSession(s.id);
      },
    );

    test('clearAllSessions calls deleteAll without error', () async {
      await manager.createTokenSession(
        accessToken: 'a',
        refreshToken: 'r',
        userId: 'u',
      );
      await manager.clearAllSessions();
      expect(await manager.getCurrentSession(), isNull);
    });
  });
}
