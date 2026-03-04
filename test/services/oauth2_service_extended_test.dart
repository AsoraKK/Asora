// ignore_for_file: public_member_api_docs

import 'dart:async';

import 'package:flutter/services.dart' show PlatformException;
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';

import 'package:asora/services/oauth2_service.dart';

void main() {
  // ── OAuth2Service state management ─────────────────────────────────────
  group('OAuth2Service state management', () {
    late OAuth2Service service;
    late _FakeSecureStorage storage;

    setUp(() {
      storage = _FakeSecureStorage();
      service = OAuth2Service(dio: Dio(), secureStorage: storage);
    });

    tearDown(() => service.dispose());

    test('initial state is unauthenticated', () {
      expect(service.currentState, AuthState.unauthenticated);
    });

    test('updateState changes current state', () {
      service.updateState(AuthState.authenticating);
      expect(service.currentState, AuthState.authenticating);
    });

    test('updateState emits to stream', () async {
      final states = <AuthState>[];
      final sub = service.authState.listen(states.add);

      service.updateState(AuthState.authenticating);
      service.updateState(AuthState.authenticated);
      service.updateState(AuthState.error);
      service.updateState(AuthState.unauthenticated);

      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(states, [
        AuthState.authenticating,
        AuthState.authenticated,
        AuthState.error,
        AuthState.unauthenticated,
      ]);

      await sub.cancel();
    });
  });

  // ── OAuth2Service.initialize ──────────────────────────────────────────
  group('OAuth2Service.initialize', () {
    test('authenticated when cached token is valid', () async {
      final storage = _FakeSecureStorage();
      final future = DateTime.now().add(const Duration(hours: 1));
      storage.data['access_token'] = 'valid_token';
      storage.data['expires_on'] = future.toIso8601String();

      final service = OAuth2Service(dio: Dio(), secureStorage: storage);

      await service.initialize();
      expect(service.currentState, AuthState.authenticated);
      service.dispose();
    });

    test('stays unauthenticated without cached token', () async {
      final storage = _FakeSecureStorage();
      final service = OAuth2Service(dio: Dio(), secureStorage: storage);

      await service.initialize();
      expect(service.currentState, AuthState.unauthenticated);
      service.dispose();
    });

    test('stays unauthenticated with expired cached token', () async {
      final storage = _FakeSecureStorage();
      storage.data['access_token'] = 'expired';
      storage.data['expires_on'] = DateTime.now()
          .subtract(const Duration(hours: 1))
          .toIso8601String();

      final service = OAuth2Service(dio: Dio(), secureStorage: storage);

      await service.initialize();
      expect(service.currentState, AuthState.unauthenticated);
      service.dispose();
    });

    test('stays unauthenticated with token but no expiry', () async {
      final storage = _FakeSecureStorage();
      storage.data['access_token'] = 'tok';

      final service = OAuth2Service(dio: Dio(), secureStorage: storage);

      await service.initialize();
      expect(service.currentState, AuthState.unauthenticated);
      service.dispose();
    });

    test('loads config from server endpoint', () async {
      final storage = _FakeSecureStorage();
      final dio = Dio();
      dio.httpClientAdapter = _JsonResponseAdapter({
        'tenant': 'test.onmicrosoft.com',
        'clientId': 'cid',
        'policy': 'B2C_1_test',
        'authorityHost': 'test.ciamlogin.com',
        'scopes': ['openid'],
        'redirectUris': {'android': 'com.test://auth'},
        'knownAuthorities': ['test.ciamlogin.com'],
      });

      final service = OAuth2Service(
        dio: dio,
        secureStorage: storage,
        configEndpoint: '/api/auth/config',
      );

      await service.initialize();
      service.dispose();
    });

    test('falls back to environment config on server error', () async {
      final storage = _FakeSecureStorage();
      final dio = Dio();
      dio.httpClientAdapter = _ErrorAdapter(
        DioException(
          requestOptions: RequestOptions(path: '/api/auth/config'),
          type: DioExceptionType.connectionError,
        ),
      );

      final service = OAuth2Service(
        dio: dio,
        secureStorage: storage,
        configEndpoint: '/api/auth/config',
      );

      await service.initialize();
      // Should not crash
      service.dispose();
    });
  });

  // ── OAuth2Service.signOut ─────────────────────────────────────────────
  group('OAuth2Service.signOut', () {
    test('clears all storage keys', () async {
      final storage = _FakeSecureStorage();
      storage.data['access_token'] = 'tok';
      storage.data['refresh_token'] = 'ref';
      storage.data['id_token'] = 'id';
      storage.data['expires_on'] = '2025-01-01';
      storage.data['account_id'] = 'acc';

      final service = OAuth2Service(dio: Dio(), secureStorage: storage);

      service.updateState(AuthState.authenticated);
      await service.signOut();

      expect(service.currentState, AuthState.unauthenticated);
      expect(storage.data.containsKey('access_token'), isFalse);
      expect(storage.data.containsKey('refresh_token'), isFalse);
      expect(storage.data.containsKey('id_token'), isFalse);
      expect(storage.data.containsKey('expires_on'), isFalse);
      expect(storage.data.containsKey('account_id'), isFalse);
      service.dispose();
    });

    test('works when storage is already empty', () async {
      final storage = _FakeSecureStorage();
      final service = OAuth2Service(dio: Dio(), secureStorage: storage);

      await service.signOut();
      expect(service.currentState, AuthState.unauthenticated);
      service.dispose();
    });
  });

  // ── OAuth2Service.cacheToken ──────────────────────────────────────────
  group('OAuth2Service.cacheToken', () {
    test('stores all fields when present', () async {
      final storage = _FakeSecureStorage();
      final service = OAuth2Service(dio: Dio(), secureStorage: storage);

      final expiry = DateTime(2025, 6, 1);
      final result = AuthResult(
        accessToken: 'at',
        refreshToken: 'rt',
        idToken: 'idt',
        expiresOn: expiry,
        accountId: 'acc-1',
      );

      await service.cacheToken(result);

      expect(storage.data['access_token'], 'at');
      expect(storage.data['id_token'], 'idt');
      expect(storage.data['expires_on'], expiry.toIso8601String());
      expect(storage.data['account_id'], 'acc-1');
      service.dispose();
    });

    test('does not store null optional fields', () async {
      final storage = _FakeSecureStorage();
      final service = OAuth2Service(dio: Dio(), secureStorage: storage);

      final result = AuthResult(
        accessToken: 'at',
        expiresOn: DateTime(2025, 6, 1),
      );

      await service.cacheToken(result);

      expect(storage.data['access_token'], 'at');
      expect(storage.data.containsKey('id_token'), isFalse);
      expect(storage.data.containsKey('account_id'), isFalse);
      service.dispose();
    });
  });

  // ── OAuth2Service.mapAppAuthException ──────────────────────────────────
  group('OAuth2Service.mapAppAuthException', () {
    late OAuth2Service service;

    setUp(() {
      service = OAuth2Service(dio: Dio(), secureStorage: _FakeSecureStorage());
    });

    tearDown(() => service.dispose());

    test('user_cancel code → cancelled', () {
      final e = PlatformException(code: 'user_cancel', message: 'cancelled');
      final auth = service.mapAppAuthException(e);
      expect(auth.error, AuthError.cancelled);
      expect(auth.originalError, e);
    });

    test('cancel in message → cancelled', () {
      final e = PlatformException(code: 'other', message: 'User cancel flow');
      expect(service.mapAppAuthException(e).error, AuthError.cancelled);
    });

    test('network code → network', () {
      final e = PlatformException(code: 'network_error', message: '');
      expect(service.mapAppAuthException(e).error, AuthError.network);
    });

    test('network in message → network', () {
      final e = PlatformException(code: 'other', message: 'Network timeout');
      expect(service.mapAppAuthException(e).error, AuthError.network);
    });

    test('policy in message → policyNotFound', () {
      final e = PlatformException(code: 'auth', message: 'policy not found');
      expect(service.mapAppAuthException(e).error, AuthError.policyNotFound);
    });

    test('AADB2C in message → policyNotFound', () {
      final e = PlatformException(code: 'auth', message: 'AADB2C90091');
      expect(service.mapAppAuthException(e).error, AuthError.policyNotFound);
    });

    test('no_account code → accountUnavailable', () {
      final e = PlatformException(code: 'no_account', message: 'None');
      expect(
        service.mapAppAuthException(e).error,
        AuthError.accountUnavailable,
      );
    });

    test('unknown error → unknown', () {
      final e = PlatformException(code: 'xyz', message: 'Something');
      final auth = service.mapAppAuthException(e);
      expect(auth.error, AuthError.unknown);
      expect(auth.message, 'Something');
    });

    test('null message → defaults to Auth error', () {
      final e = PlatformException(code: 'xyz');
      final auth = service.mapAppAuthException(e);
      expect(auth.error, AuthError.unknown);
      expect(auth.message, 'Auth error');
    });
  });

  // ── OAuth2Service.getAccessToken ──────────────────────────────────────
  group('OAuth2Service.getAccessToken', () {
    test('returns cached token when still valid', () async {
      final storage = _FakeSecureStorage();
      final future = DateTime.now().add(const Duration(hours: 1));
      storage.data['access_token'] = 'cached_tok';
      storage.data['expires_on'] = future.toIso8601String();

      final service = OAuth2Service(dio: Dio(), secureStorage: storage);

      await service.initialize();
      final token = await service.getAccessToken();
      expect(token, 'cached_tok');
      service.dispose();
    });

    test('returns null when no config and no cached token', () async {
      final service = OAuth2Service(
        dio: Dio(),
        secureStorage: _FakeSecureStorage(),
      );

      final token = await service.getAccessToken();
      expect(token, isNull);
      service.dispose();
    });

    test('returns null when token expired and no refresh token', () async {
      final storage = _FakeSecureStorage();
      storage.data['access_token'] = 'old';
      storage.data['expires_on'] = DateTime.now()
          .subtract(const Duration(hours: 1))
          .toIso8601String();

      final service = OAuth2Service(dio: Dio(), secureStorage: storage);
      await service.initialize();

      final token = await service.getAccessToken();
      expect(token, isNull);
      expect(service.currentState, AuthState.unauthenticated);
      service.dispose();
    });

    test(
      'returns null when token expiring soon and no refresh token',
      () async {
        final storage = _FakeSecureStorage();
        // Token expires in 2 minutes (< 5 minute buffer)
        storage.data['access_token'] = 'expiring';
        storage.data['expires_on'] = DateTime.now()
            .add(const Duration(minutes: 2))
            .toIso8601String();

        final service = OAuth2Service(dio: Dio(), secureStorage: storage);
        await service.initialize();

        final token = await service.getAccessToken();
        // No refresh token available, so returns null
        expect(token, isNull);
        service.dispose();
      },
    );

    test('returns null on forceRefresh without config', () async {
      final service = OAuth2Service(
        dio: Dio(),
        secureStorage: _FakeSecureStorage(),
      );

      final token = await service.getAccessToken(forceRefresh: true);
      expect(token, isNull);
      service.dispose();
    });
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────
class _FakeSecureStorage implements FlutterSecureStorage {
  final Map<String, String?> data = {};

  @override
  Future<String?> read({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async => data[key];

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
    data[key] = value;
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
    data.remove(key);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _ErrorAdapter implements HttpClientAdapter {
  _ErrorAdapter(this._error);
  final DioException _error;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    throw _error;
  }

  @override
  void close({bool force = false}) {}
}

class _JsonResponseAdapter implements HttpClientAdapter {
  _JsonResponseAdapter(this._data);
  final Map<String, dynamic> _data;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final jsonStr = _encode(_data);
    return ResponseBody.fromString(
      jsonStr,
      200,
      headers: {
        'content-type': ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

String _encode(dynamic data) {
  if (data is Map) {
    final entries = data.entries
        .map((e) => '"${e.key}":${_encode(e.value)}')
        .join(',');
    return '{$entries}';
  }
  if (data is List) return '[${data.map(_encode).join(',')}]';
  if (data is String) return '"$data"';
  if (data is bool) return '$data';
  if (data is num) return '$data';
  if (data == null) return 'null';
  return '"$data"';
}
