import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:asora/features/auth/application/auth_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';

class FakeSecureStorage implements FlutterSecureStorage {
  final Map<String, String?> _data = {};

  // ───────────────────────────────────────
  // Abstract getters in v4.x:
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

  // Cupertino protected-data stream & flag:
  @override
  Stream<bool>? get onCupertinoProtectedDataAvailabilityChanged => null;

  @override
  Future<bool> isCupertinoProtectedDataAvailable() async => true;
  // ───────────────────────────────────────

  @override
  Future<void> write({
    required String key,
    required String? value,
    AndroidOptions? aOptions,
    IOSOptions? iOptions,
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
    AndroidOptions? aOptions,
    IOSOptions? iOptions,
    LinuxOptions? lOptions,
    MacOsOptions? mOptions,
    WebOptions? webOptions,
    WindowsOptions? wOptions,
  }) async => _data[key];

  @override
  Future<void> delete({
    required String key,
    AndroidOptions? aOptions,
    IOSOptions? iOptions,
    LinuxOptions? lOptions,
    MacOsOptions? mOptions,
    WebOptions? webOptions,
    WindowsOptions? wOptions,
  }) async {
    _data.remove(key);
  }

  @override
  Future<void> deleteAll({
    AndroidOptions? aOptions,
    IOSOptions? iOptions,
    LinuxOptions? lOptions,
    MacOsOptions? mOptions,
    WebOptions? webOptions,
    WindowsOptions? wOptions,
  }) async {
    _data.clear();
  }

  @override
  Future<Map<String, String>> readAll({
    AndroidOptions? aOptions,
    IOSOptions? iOptions,
    LinuxOptions? lOptions,
    MacOsOptions? mOptions,
    WebOptions? webOptions,
    WindowsOptions? wOptions,
  }) async {
    final result = <String, String>{};
    _data.forEach((k, v) {
      if (v != null) result[k] = v;
    });
    return result;
  }

  @override
  Future<bool> containsKey({
    required String key,
    AndroidOptions? aOptions,
    IOSOptions? iOptions,
    LinuxOptions? lOptions,
    MacOsOptions? mOptions,
    WebOptions? webOptions,
    WindowsOptions? wOptions,
  }) async => _data.containsKey(key);

  // ───────────────────────────────────────
  // Listener API:
  @override
  void registerListener({
    required String key,
    required void Function(String?) listener,
  }) {
    // no-op
  }

  @override
  void unregisterListener({
    required String key,
    required void Function(String?) listener,
  }) {
    // no-op
  }

  @override
  void unregisterAllListenersForKey({required String key}) {
    // no-op
  }

  @override
  void unregisterAllListeners() {
    // no-op
  }
  // ───────────────────────────────────────
}

void main() {
  test('verifyTokenWithBackend stores token on success', () async {
    final client = MockClient((request) async {
      expect(jsonDecode(request.body)['token'], equals('id123'));
      return http.Response(jsonEncode({'sessionToken': 'abc'}), 200);
    });
    final storage = FakeSecureStorage();
    final service = AuthService(
      secureStorage: storage,
      httpClient: client,
      authUrl: 'https://example.com',
    );

    final token = await service.verifyTokenWithBackend('id123');
    expect(token, equals('abc'));
    expect(await storage.read(key: 'sessionToken'), equals('abc'));
  });

  test('verifyTokenWithBackend throws AuthFailure on error', () async {
    final client = MockClient((_) async {
      return http.Response('error', 500);
    });
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
