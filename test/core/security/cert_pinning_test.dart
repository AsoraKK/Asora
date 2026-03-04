import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:asora/core/security/cert_pinning.dart';

class _FakeAdapter implements HttpClientAdapter {
  ResponseBody? response;
  Object? errorToThrow;
  bool throwWithIncomingOptions = false;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (errorToThrow != null) {
      if (errorToThrow is DioException) throw errorToThrow!;
      if (throwWithIncomingOptions) {
        throw DioException(
          requestOptions: options,
          type: DioExceptionType.connectionError,
          error: errorToThrow,
        );
      } else {
        // Fallback if options not provided
        throw DioException(
          requestOptions: RequestOptions(path: options.path),
          type: DioExceptionType.connectionError,
          error: errorToThrow,
        );
      }
    }
    return response ?? ResponseBody.fromString('ok', 200);
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  test('createPinnedDio sets adapter and interceptor', () {
    final dio = createPinnedDio(baseUrl: 'https://example.com');
    expect(dio.options.baseUrl, 'https://example.com');
    expect(dio.httpClientAdapter, isA<PinnedCertHttpClientAdapter>());
    // Interceptor type name should be present
    expect(
      dio.interceptors.any(
        (i) => i.runtimeType.toString().contains('CertPinning'),
      ),
      isTrue,
    );
  });

  test('PinnedCertHttpClientAdapter delegates on success', () async {
    final fake = _FakeAdapter();
    fake.response = ResponseBody.fromString('ok', 200);

    final pinned = PinnedCertHttpClientAdapter(fake);
    final opts = RequestOptions(path: '/test', method: 'GET');
    // Base URL influences host parsing
    opts.baseUrl = 'https://asora-function-flex.azurewebsites.net';

    final res = await pinned.fetch(opts, null, null);
    expect(res.statusCode, 200);
  });

  test('PinnedCertHttpClientAdapter logs and rethrows on error', () async {
    final fake = _FakeAdapter();
    final opts = RequestOptions(path: '/x', method: 'GET');
    opts.baseUrl = 'https://asora-function-flex.azurewebsites.net';
    fake.errorToThrow = Exception('tls fail');

    final pinned = PinnedCertHttpClientAdapter(fake);

    expect(() => pinned.fetch(opts, null, null), throwsA(isA<DioException>()));
  });

  test('isPinValidationError detects for pinned host connection errors', () {
    final ro = RequestOptions(path: '/x', method: 'GET');
    ro.baseUrl = 'https://asora-function-dev.azurewebsites.net';
    final err = DioException(
      requestOptions: ro,
      type: DioExceptionType.connectionError,
      error: Exception('conn'),
    );
    expect(isPinValidationError(err), isTrue);

    final ro2 = RequestOptions(path: '/x', method: 'GET');
    ro2.baseUrl = 'https://not-pinned.example';
    final err2 = DioException(
      requestOptions: ro2,
      type: DioExceptionType.connectionError,
      error: Exception('conn'),
    );
    expect(isPinValidationError(err2), isFalse);
  });

  test('getCertPinningInfo contains pinned domains', () {
    final info = getCertPinningInfo();
    expect(info.enabled, kEnableCertPinning);
    expect(info.pins.keys, contains('asora-function-dev.azurewebsites.net'));
  });

  test('interceptor maps connectionError for pinned host', () async {
    final dio = createPinnedDio(
      baseUrl: 'https://asora-function-dev.azurewebsites.net',
    );
    final fake = _FakeAdapter();
    dio.httpClientAdapter = PinnedCertHttpClientAdapter(fake);
    // adapter will throw a DioException connectionError using incoming request options
    fake.throwWithIncomingOptions = true;
    fake.errorToThrow = Exception('tls');
    try {
      await dio.get<Map<String, dynamic>>('/x');
      fail('should throw');
    } on DioException catch (e) {
      expect(isPinValidationError(e), isTrue);
      expect(e.message, contains('Secure connection could not be established'));
    }
  });
}
