/// ASORA SECURE DIO CLIENT
///
/// 🎯 Purpose: Secure HTTP client with certificate pinning and integrity checks
/// 🔐 Security: SPKI pinning, device integrity validation, secure headers
/// 📡 Network: Azure Functions integration with proper error handling
/// 📱 Platform: Flutter with Riverpod dependency injection
library;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../security/cert_pinning.dart';
import '../security/device_integrity.dart';

/// Secure Dio client provider with certificate pinning and integrity checks
final secureDioProvider = Provider<Dio>((ref) {
  // Get base URL from environment or use development default
  const baseUrl = String.fromEnvironment(
    'AZURE_FUNCTION_URL',
    defaultValue: kDebugMode
        ? 'http://10.0.2.2:7072/api' // Local development
        : 'https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net/api',
  );

  // Create Dio with certificate pinning (only for HTTPS)
  final dio = baseUrl.startsWith('https')
      ? createPinnedDio(baseUrl: baseUrl)
      : Dio(BaseOptions(baseUrl: baseUrl));

  // Configure timeouts
  dio.options.connectTimeout = const Duration(seconds: 10);
  dio.options.receiveTimeout = const Duration(seconds: 30);
  dio.options.sendTimeout = const Duration(seconds: 30);

  // Set default headers
  dio.options.headers.addAll({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Asora-Flutter/${_getAppVersion()}',
  });

  // Add device integrity interceptor
  dio.interceptors.add(_DeviceIntegrityInterceptor(ref));

  // Add logging in debug mode
  if (kDebugMode) {
    dio.interceptors.add(
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        requestHeader: false,
        responseHeader: false,
        error: true,
        logPrint: (object) => debugPrint('🌐 HTTP: $object'),
      ),
    );
  }

  return dio;
});

/// Device integrity interceptor
class _DeviceIntegrityInterceptor extends Interceptor {
  final Ref _ref;

  _DeviceIntegrityInterceptor(this._ref);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Check device integrity for write operations
    final isWriteOperation = [
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
    ].contains(options.method.toUpperCase());

    if (isWriteOperation) {
      final integrityInfo = await _ref
          .read(deviceIntegrityServiceProvider)
          .checkIntegrity();

      if (!integrityInfo.allowPosting) {
        final error = DioException(
          requestOptions: options,
          type: DioExceptionType.unknown,
          message: 'Device integrity violation: ${integrityInfo.reason}',
        );
        handler.reject(error);
        return;
      }

      // Add integrity header for server validation
      options.headers['X-Device-Integrity'] = integrityInfo.status.name;
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Log security-relevant errors
    if (err.response?.statusCode == 403) {
      debugPrint('🚨 SECURITY: Access denied - possible integrity issue');
    }

    handler.next(err);
  }
}

/// Get app version for User-Agent header
String _getAppVersion() {
  // In production, get from package_info_plus or similar
  return kDebugMode ? 'dev' : '1.0.0';
}

/// HTTP client configuration info
class HttpClientConfig {
  final String baseUrl;
  final bool certPinningEnabled;
  final bool integrityChecksEnabled;
  final Duration connectTimeout;
  final Duration receiveTimeout;

  const HttpClientConfig({
    required this.baseUrl,
    required this.certPinningEnabled,
    required this.integrityChecksEnabled,
    required this.connectTimeout,
    required this.receiveTimeout,
  });

  Map<String, dynamic> toJson() => {
    'baseUrl': baseUrl,
    'certPinningEnabled': certPinningEnabled,
    'integrityChecksEnabled': integrityChecksEnabled,
    'connectTimeoutSeconds': connectTimeout.inSeconds,
    'receiveTimeoutSeconds': receiveTimeout.inSeconds,
  };
}

/// Get current HTTP client configuration
HttpClientConfig getHttpClientConfig() {
  const baseUrl = String.fromEnvironment(
    'AZURE_FUNCTION_URL',
    defaultValue: kDebugMode
        ? 'http://10.0.2.2:7072/api'
        : 'https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net/api',
  );

  return HttpClientConfig(
    baseUrl: baseUrl,
    certPinningEnabled: baseUrl.startsWith('https') && kEnableCertPinning,
    integrityChecksEnabled: true,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 30),
  );
}
