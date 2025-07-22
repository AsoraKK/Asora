import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:asora/features/auth/application/auth_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';

/// Simple in-memory fake for unit tests.
class FakeSecureStorage implements FlutterSecureStorage {
  final Map<String, String?> _data = {};

  // Required option getters (v9 API)
  @override
  AndroidOptions get aOptions => const AndroidOptions();
  @override
  IOSOptions get iOptions => const IOSOptions();
  @override
  LinuxOptions get lOptions => const LinuxOptions();
  @override
  MacOsOptions get mOptions => const MacOsOptions();
  @override
  WebOptions get webOptions => const WebOptions();
  @override
  WindowsOptions get wOptions => const WindowsOptions();

  // iOS protected-data helpers (not used in tests)
  @override
  Stream<bool>? get onCupertinoProtectedDataAvailabilityChanged => null;
  @override
  Future<bool> isCupertinoProtectedDataAvailable() async => true;

  // CRUD ------------------------------------------------------------
  @override
  Future<void> write({
    required String key,
    required String? value,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    MacOsOptions? mOptions,
    WebOptions? webOptions,
    WindowsOptions? wOptions,
  }) async {
    _data[key] = value;
  }

  @override
  Future<String?> read({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    MacOsOptions? mOptions,
    WebOptions? webOptions,
    WindowsOptions? wOptions,
  }) async => _data[key];

  @override
  Future<void> delete({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    MacOsOptions? mOptions,
    WebOptions? webOptions,
    WindowsOptions? wOptions,
  }) async {
    _data.remove(key);
  }

  @override
  Future<void> deleteAll({
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    MacOsOptions? mOptions,
    WebOptions? webOptions,
    WindowsOptions? wOptions,
  }) async {
    _data.clear();
  }

  // Optional helpers
  @override
  Future<Map<String, String>> readAll({
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    MacOsOptions? mOptions,
    WebOptions? webOptions,
    WindowsOptions? wOptions,
  }) async => _data.map((k, v) => MapEntry(k, v ?? ''));

  @override
  Future<bool> containsKey({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    MacOsOptions? mOptions,
    WebOptions? webOptions,
    WindowsOptions? wOptions,
  }) async => _data.containsKey(key);

  // Listener API (no-op)
  @override
  void registerListener({
    required String key,
    required void Function(String?) listener,
  }) {}
  @override
  void unregisterListener({
    required String key,
    required void Function(String?) listener,
  }) {}
  @override
  void unregisterAllListenersForKey({required String key}) {}
  @override
  void unregisterAllListeners() {}
}

void main() {
  test('verifyTokenWithBackend stores token on success', () async {
    final client = MockClient((request) async {
      expect(jsonDecode(request.body)['token'], 'id123');
      return http.Response(jsonEncode({'sessionToken': 'abc'}), 200);
    });

    final storage = FakeSecureStorage();
    final service = AuthService(
      secureStorage: storage,
      httpClient: client,
      authUrl: 'https://example.com',
    );

    final token = await service.verifyTokenWithBackend('id123');

    expect(token, 'abc');
    expect(await storage.read(key: 'sessionToken'), 'abc');
  });

  test('verifyTokenWithBackend throws AuthFailure on error', () async {
    final client = MockClient((_) async => http.Response('error', 500));

    final service = AuthService(
      secureStorage: FakeSecureStorage(),
      httpClient: client,
      authUrl: 'https://example.com',
    );

    expect(
      () => service.verifyTokenWithBackend('bad'),
      throwsA(isA<AuthFailure>()),
    );
  });
}
