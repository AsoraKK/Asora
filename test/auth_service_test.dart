import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:asora/features/auth/application/auth_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';

/// Lightweight fake for unit tests; **never** use in production.
class FakeSecureStorage implements FlutterSecureStorage {
  final Map<String, String?> _data = {};

  // ─────────────────────────────────────────────
  // Platform option getters required by v9 API.
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

  // iOS-only protected-data helpers (not needed in tests).
  @override
  Stream<bool>? get onCupertinoProtectedDataAvailabilityChanged => null;
  @override
  Future<bool> isCupertinoProtectedDataAvailable() async => true;
  // ─────────────────────────────────────────────

  @override
  Future<void> write({
    required String key,
    String? value,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    MacOsOptions? macOsOptions,
    WebOptions? webOptions,
    WindowsOptions? windowsOptions,
  }) async {
    _data[key] = value;
  }

  @override
  Future<String?> read({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    MacOsOptions? macOsOptions,
    WebOptions? webOptions,
    WindowsOptions? windowsOptions,
  }) async =>
      _data[key];

  @override
  Future<void> delete({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    MacOsOptions? macOsOptions,
    WebOptions? webOptions,
    WindowsOptions? windowsOptions,
  }) async =>
      _data.remove(key);

  @override
  Future<void> deleteAll({
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    MacOsOptions? macOsOptions,
    WebOptions? webOptions,
    WindowsOptions? windowsOptions,
  }) async =>
      _data.clear();

  // Optional helpers below — only implement if your code needs them.
  @override
  Future<Map<String, String>> readAll({
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    MacOsOptions? macOsOptions,
    WebOptions? webOptions,
    WindowsOptions? windowsOptions,
  }) async =>
      _data.map((k, v) => MapEntry(k, v ?? ''));

  @override
  Future<bool> containsKey({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    MacOsOptions? macOsOptions,
    WebOptions? webOptions,
    WindowsOptions? windowsOptions,
  }) async =>
      _data.containsKey(key);

  // Listener API (no-op in tests)
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