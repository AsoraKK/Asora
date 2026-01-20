// ignore_for_file: public_member_api_docs

/// LYTHAUS TEST MODE DIO INTERCEPTOR
///
/// 🎯 Purpose: Automatically inject test mode headers into API requests
/// 🏗️ Architecture: Network layer - interceptor pattern
/// 🔧 Features: Header injection, request logging for test mode
/// 🛡️ Safety: Server-side enforcement of test data isolation
library;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/admin/application/live_test_mode_provider.dart';

/// Dio interceptor that injects test mode headers when live test mode is active
class TestModeInterceptor extends Interceptor {
  final Ref _ref;

  TestModeInterceptor(this._ref);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // Check if test mode is enabled
    final testModeState = _ref.read(liveTestModeProvider);

    if (testModeState.isEnabled) {
      // Inject test mode headers
      final testHeaders = testModeState.getApiHeaders();
      options.headers.addAll(testHeaders);

      debugPrint(
        '🧪 [TestMode] Injecting test headers: session=${testModeState.sessionId}',
      );
    }

    handler.next(options);
  }

  @override
  void onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) {
    // Log test mode responses for debugging
    final testModeState = _ref.read(liveTestModeProvider);

    if (testModeState.isEnabled) {
      debugPrint(
        '🧪 [TestMode] Response: ${response.statusCode} ${response.requestOptions.path}',
      );
    }

    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Log test mode errors with session context
    final testModeState = _ref.read(liveTestModeProvider);

    if (testModeState.isEnabled) {
      debugPrint(
        '🧪 [TestMode] Error: ${err.message} (session=${testModeState.sessionId})',
      );
    }

    handler.next(err);
  }
}

/// Provider for the test mode interceptor
final testModeInterceptorProvider = Provider<TestModeInterceptor>((ref) {
  return TestModeInterceptor(ref);
});
