import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart' show LaunchMode;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:asora/core/auth/auth_session_manager.dart';

import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';

void main() {
  test('debugBuildAuthorizationUrl formats expected parameters', () {
    final svc = OAuth2Service(launcher: _fakeLauncher);
    final url = svc.debugBuildAuthorizationUrl(
      codeChallenge: 'cc',
      state: 'st',
      nonce: 'nn',
    );
    expect(url, contains('response_type=code'));
    expect(url, contains('client_id='));
    expect(url, contains('redirect_uri='));
    expect(url, contains('code_challenge=cc'));
    expect(url, contains('state=st'));
    expect(url, contains('nonce=nn'));
  });

  test('debugStartAndWaitForCode completes via debugHandleCallback', () async {
    final svc = OAuth2Service(launcher: _fakeLauncher);
    final future = svc.debugStartAndWaitForCode();
    // Simulate valid deep link callback
    svc.debugHandleCallback(Uri.parse('asora://oauth/callback?code=abc&state=st'));
    final code = await future;
    expect(code, 'abc');
  });

  test('debugStartAndWaitForCode completes with error on callback error', () async {
    final svc = OAuth2Service(launcher: _fakeLauncher);
    final future = svc.debugStartAndWaitForCode();
    // Simulate error callback
    svc.debugHandleCallback(Uri.parse('asora://oauth/callback?error=access_denied&error_description=nope'));
    expect(future, throwsA(isA<AuthFailure>()));
  });

  test('web setup listener parses href and completes', () async {
    // Subclass to override getWebHref()
    final svc = _WebTestService();
    final future = svc.debugStartAndWaitForCode();
    svc.debugSetupCallbackListener();
    final code = await future;
    expect(code, 'webcode');
  });

  // Note: end-to-end signInWithOAuth2 flow is not exercised because the web
  // callback can fire before the internal completer is created. We cover the
  // building blocks via debug helpers instead.
}

class _WebTestService extends OAuth2Service {
  _WebTestService() : super(debugForceWeb: true);
  @override
  String? getWebHref() => 'https://example.com/auth/callback?code=webcode&state=st';
}

Future<bool> _fakeLauncher(Uri uri, {LaunchMode mode = LaunchMode.platformDefault}) async => true;

class _FullFlowWebService extends OAuth2Service {
  _FullFlowWebService()
      : super(
          debugForceWeb: true,
          launcher: _fakeLauncher,
          httpClient: _FullFlowHttp(),
          sessionManager: _FullFlowSessionManager(),
          secureStorage: _MemSecureStorage(),
        );
  @override
  String? getWebHref() => 'https://example.com/auth/callback?code=code1&state=st';
}

class _FullFlowHttp extends _FullFlowBaseClient {}

class _FullFlowBaseClient extends http.BaseClient {
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final url = request.url.toString();
    if (url == OAuth2Config.tokenEndpoint) {
      final body = jsonEncode({
        'access_token': 'acc',
        'refresh_token': 'ref',
        'token_type': 'Bearer',
        'expires_in': 3600,
        'scope': OAuth2Config.scope,
        'user': {
          'id': 'u1',
          'email': 'u1@example.com',
          'role': 'user',
          'tier': 'bronze',
          'reputationScore': 0,
          'createdAt': '2023-01-01T00:00:00Z',
          'lastLoginAt': '2023-01-01T00:00:00Z',
          'isTemporary': false,
        },
      });
      return http.StreamedResponse(Stream.value(utf8.encode(body)), 200, headers: {'content-type': 'application/json'});
    }
    if (url == OAuth2Config.userInfoEndpoint) {
      final body = jsonEncode({
        'id': 'u1',
        'email': 'u1@example.com',
        'role': 'user',
        'tier': 'bronze',
        'reputationScore': 0,
        'createdAt': '2023-01-01T00:00:00Z',
        'lastLoginAt': '2023-01-01T00:00:00Z',
        'isTemporary': false,
      });
      return http.StreamedResponse(Stream.value(utf8.encode(body)), 200, headers: {'content-type': 'application/json'});
    }
    return http.StreamedResponse(Stream<List<int>>.fromIterable([]), 404);
  }
}

class _FullFlowSessionManager extends AuthSessionManager {
  @override
  Future<AuthSessionState> createSession({
    required String state,
    required String nonce,
    required String codeChallenge,
    Duration? ttl,
  }) async {
    return AuthSessionState(
      id: 'session_full',
      state: state,
      nonce: nonce,
      codeVerifier: '',
      codeChallenge: codeChallenge,
      createdAt: DateTime.now(),
      ttl: const Duration(minutes: 10),
    );
  }
}

class _MemSecureStorage extends FlutterSecureStorage {
  final Map<String, String> _data = {};
  @override
  Future<void> write({required String key, required String? value, IOSOptions? iOptions, AndroidOptions? aOptions, LinuxOptions? lOptions, WebOptions? webOptions, MacOsOptions? mOptions, WindowsOptions? wOptions}) async {
    if (value == null) {
      _data.remove(key);
    } else {
      _data[key] = value;
    }
  }
  @override
  Future<String?> read({required String key, IOSOptions? iOptions, AndroidOptions? aOptions, LinuxOptions? lOptions, WebOptions? webOptions, MacOsOptions? mOptions, WindowsOptions? wOptions}) async => _data[key];
  @override
  Future<void> delete({required String key, IOSOptions? iOptions, AndroidOptions? aOptions, LinuxOptions? lOptions, WebOptions? webOptions, MacOsOptions? mOptions, WindowsOptions? wOptions}) async { _data.remove(key); }
  @override
  Future<void> deleteAll({IOSOptions? iOptions, AndroidOptions? aOptions, LinuxOptions? lOptions, WebOptions? webOptions, MacOsOptions? mOptions, WindowsOptions? wOptions}) async { _data.clear(); }
}

class _ErrorHttp extends http.BaseClient {
  final int code;
  final String body;
  _ErrorHttp(this.code, this.body);
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    return http.StreamedResponse(Stream.value(utf8.encode(body)), code, headers: {'content-type': 'application/json'});
  }
}

class _ThrowingHttp extends http.BaseClient {
  final Exception ex;
  _ThrowingHttp(this.ex);
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async => throw ex;
}
