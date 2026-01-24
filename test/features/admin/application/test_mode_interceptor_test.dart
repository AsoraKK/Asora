import 'dart:typed_data';

import 'package:asora/features/admin/application/live_test_mode_provider.dart';
import 'package:asora/features/admin/application/test_mode_interceptor.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _CaptureAdapter implements HttpClientAdapter {
  ResponseBody? response;
  Object? errorToThrow;
  bool throwWithIncomingOptions = false;
  RequestOptions? lastOptions;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastOptions = options;
    if (errorToThrow != null) {
      if (errorToThrow is DioException) throw errorToThrow!;
      if (throwWithIncomingOptions) {
        throw DioException(
          requestOptions: options,
          type: DioExceptionType.connectionError,
          error: errorToThrow,
        );
      }
      throw DioException(
        requestOptions: RequestOptions(path: options.path),
        type: DioExceptionType.connectionError,
        error: errorToThrow,
      );
    }
    return response ?? ResponseBody.fromString('ok', 200);
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  test('injects headers when live test mode is enabled', () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    container.read(liveTestModeProvider.notifier).enable();
    final interceptor = container.read(testModeInterceptorProvider);
    final adapter = _CaptureAdapter()
      ..response = ResponseBody.fromString('ok', 200);
    final dio = Dio()
      ..httpClientAdapter = adapter
      ..interceptors.add(interceptor);

    await dio.get<void>('/test');

    final options = adapter.lastOptions;
    expect(options, isNotNull);
    final state = container.read(liveTestModeProvider);
    expect(options!.headers[TestModeHeaders.testMode], 'true');
    expect(options.headers[TestModeHeaders.sessionId], state.sessionId);
    expect(
      options.headers[TestModeHeaders.sessionStarted],
      state.sessionStarted.millisecondsSinceEpoch.toString(),
    );
  });

  test('does not inject headers when live test mode is disabled', () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final interceptor = container.read(testModeInterceptorProvider);
    final adapter = _CaptureAdapter()
      ..response = ResponseBody.fromString('ok', 200);
    final dio = Dio()
      ..httpClientAdapter = adapter
      ..interceptors.add(interceptor);

    await dio.get<void>('/test');

    final headers = adapter.lastOptions?.headers ?? const <String, dynamic>{};
    expect(headers.containsKey(TestModeHeaders.testMode), isFalse);
  });

  test('passes through errors in live test mode', () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    container.read(liveTestModeProvider.notifier).enable();
    final interceptor = container.read(testModeInterceptorProvider);
    final adapter = _CaptureAdapter()
      ..throwWithIncomingOptions = true
      ..errorToThrow = Exception('boom');
    final dio = Dio()
      ..httpClientAdapter = adapter
      ..interceptors.add(interceptor);

    await expectLater(dio.get<void>('/fail'), throwsA(isA<DioException>()));
  });
}
