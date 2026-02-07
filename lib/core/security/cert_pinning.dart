// ignore_for_file: public_member_api_docs

/// ASORA CERTIFICATE PINNING
///
/// 🎯 Purpose: Pin SHA-256 of server's leaf SPKI, fail closed on mismatch
/// 🔐 Security: Prevents MITM attacks via certificate validation
/// 🚨 Telemetry: Logs cert_pin_violation events for monitoring
/// 📱 Platform: Flutter with Dio HTTP client integration
library;

import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter/foundation.dart';
import 'package:asora/core/security/spki_utils.dart';

/// Enable/disable certificate pinning based on build configuration
const bool kEnableCertPinning = bool.fromEnvironment(
  'ENABLE_CERT_PINNING',
  defaultValue: true,
);

/// SPKI pins for TLS certificate public keys (base64 SHA-256).
/// Include current leaf key and a backup (key rotation).
///
/// To (re)generate pins locally:
///   HOST=asora-function-dev.azurewebsites.net
///   openssl s_client -connect $HOST:443 -servername $HOST </dev/null 2>/dev/null \
///     | openssl x509 -pubkey -noout \
///     | openssl pkey -pubin -outform der \
///     | openssl dgst -sha256 -binary | base64
/// Keep in sync with mobile-expected-pins.json and platform configs.
const Map<String, List<String>> kPinnedDomains = {
  // Dev Function App origin
  'asora-function-dev.azurewebsites.net': [
    'Eii21xSYPiPq5Qk1dN8OSAum+Q5Rm/fVuT0lG6nqBuk=',
    'Z3AiGp9DlTnC3kBo2OuHwOQioV4d2JMmVyTYkhwrGJo=',
    'vJ6M3i+5a+DFTIsiBT8oChn+90/pUsO3qQP9rkv0QdI=',
    'oyz1YegTss9+AE696+KzxtEGe2KMUXvj1XUUGvsr2CA=',
  ],
  // Legacy/dev hostname (if still called by any client)
  'asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net': [
    'sAgmPn4rf81EWKQFg+momPe9NFYswENqbsBnpcm16jM=',
    '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
    'x4RU2Q1zHRX8ud1k4dfVdVS3SnE+v+yU9tFEWH+y5W0=',
  ],
};

/// Guard: never ship with placeholders.
void _assertNoPlaceholders() {
  assert(
    kPinnedDomains.values
        .expand((e) => e)
        .every(
          (p) =>
              p.isNotEmpty &&
              !p.contains('REPLACE_WITH_SPKI_PIN') &&
              !p.toUpperCase().contains('PLACEHOLDER') &&
              !p.toUpperCase().contains('TODO') &&
              !p.toUpperCase().contains('YOUR_SPKI_PIN_HERE'),
        ),
  );
}

String _normalizePin(String pin) {
  if (pin.startsWith('sha256/')) {
    return pin.substring('sha256/'.length);
  }
  return pin;
}

/// Certificate pinning HTTP client adapter
///
/// Validates peer certificates by computing SPKI SHA-256 and comparing
/// against pinned values. Fails closed on mismatch.
class PinnedCertHttpClientAdapter implements HttpClientAdapter {
  final HttpClientAdapter _delegate;
  final IOHttpClientAdapter? _ioAdapter;

  /// Creates a pinned cert adapter.
  ///
  /// If [adapter] is an [IOHttpClientAdapter], certificate validation is
  /// configured on it. Otherwise, the adapter is used as-is for delegation
  /// (useful for testing).
  PinnedCertHttpClientAdapter(HttpClientAdapter adapter)
    : _delegate = adapter,
      _ioAdapter = adapter is IOHttpClientAdapter ? adapter : null {
    _ioAdapter?.validateCertificate = _validateCertificate;
  }

  /// Creates a production adapter with certificate pinning enabled.
  factory PinnedCertHttpClientAdapter.production() {
    final ioAdapter = IOHttpClientAdapter();
    ioAdapter.validateCertificate = _validateCertificate;
    return PinnedCertHttpClientAdapter._(ioAdapter, ioAdapter);
  }

  PinnedCertHttpClientAdapter._(this._delegate, this._ioAdapter);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return _delegate.fetch(options, requestStream, cancelFuture);
  }

  @override
  void close({bool force = false}) => _delegate.close(force: force);
}

bool _validateCertificate(X509Certificate? certificate, String host, int port) {
  if (!kEnableCertPinning) {
    return true;
  }

  final pins = kPinnedDomains[host];
  if (pins == null || pins.isEmpty) {
    return true;
  }

  if (certificate == null) {
    _logCertPinViolation(host, 'missing_certificate');
    return false;
  }

  try {
    final spkiBase64 = computeSpkiSha256Base64(certificate);
    final normalizedPins = pins.map(_normalizePin).toSet();
    final matched = normalizedPins.contains(spkiBase64);
    if (!matched) {
      _logCertPinViolation(host, 'pin_mismatch');
    }
    return matched;
  } catch (e) {
    _logCertPinViolation(host, 'validation_error: ${e.toString()}');
    return false;
  }
}

/// Create Dio instance with certificate pinning enabled
Dio createPinnedDio({String? baseUrl}) {
  final dio = Dio();

  if (baseUrl != null) {
    dio.options.baseUrl = baseUrl;
  }

  if (kEnableCertPinning) {
    // Guard against accidental placeholders in pins (debug-only via assert)
    _assertNoPlaceholders();
    // Wrap the default adapter with pinning validation
    dio.httpClientAdapter = PinnedCertHttpClientAdapter(dio.httpClientAdapter);

    // Add certificate validation interceptor
    dio.interceptors.add(_CertPinningInterceptor());
    debugPrint('🔒 Certificate pinning ENABLED');
  } else {
    debugPrint('🔓 Certificate pinning DISABLED');
  }

  return dio;
}

/// Interceptor for certificate pinning validation
class _CertPinningInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (!kEnableCertPinning) {
      return handler.next(options);
    }

    final host = Uri.parse(options.uri.toString()).host;

    if (kPinnedDomains.containsKey(host)) {
      debugPrint('🔍 Certificate pinning check for: $host');
      // SPKI validation runs inside the HttpClientAdapter callback.
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.type == DioExceptionType.connectionError ||
        err.type == DioExceptionType.unknown ||
        err.type == DioExceptionType.badCertificate) {
      final host = Uri.parse(err.requestOptions.uri.toString()).host;
      if (kPinnedDomains.containsKey(host)) {
        _logCertPinViolation(host, 'connection_failed');
        // Map to a user-friendly message when we suspect pin mismatch / TLS error
        err = DioException(
          requestOptions: err.requestOptions,
          response: err.response,
          type: err.type,
          error: err.error,
          message:
              'Secure connection could not be established. Please try again on a trusted network or update the app.',
        );
      }
    }
    handler.next(err);
  }
}

/// Utility to check if an error likely stems from pin validation failure.
bool isPinValidationError(DioException err) {
  if (err.type == DioExceptionType.connectionError ||
      err.type == DioExceptionType.unknown ||
      err.type == DioExceptionType.badCertificate) {
    final host = Uri.parse(err.requestOptions.uri.toString()).host;
    return kPinnedDomains.containsKey(host);
  }
  return false;
}

/// Log certificate pinning violation for telemetry
void _logCertPinViolation(String host, String reason) {
  final event = {
    'event': 'cert_pin_violation',
    'host': host,
    'reason': reason,
    'timestamp': DateTime.now().toIso8601String(),
    'platform': defaultTargetPlatform.name,
  };

  debugPrint(
    '🚨 SECURITY: Certificate pinning violation: ${jsonEncode(event)}',
  );

  // NOTE(asora-telemetry): Route to the central telemetry pipeline once the
  // dedicated security event service is available.
  // TelemetryService.reportSecurityEvent(event);
}

/// Certificate pinning configuration info
class CertPinningInfo {
  final bool enabled;
  final Map<String, List<String>> pins;
  final String buildMode;

  const CertPinningInfo({
    required this.enabled,
    required this.pins,
    required this.buildMode,
  });

  Map<String, dynamic> toJson() => {
    'enabled': enabled,
    'pins': pins,
    'buildMode': buildMode,
    'pinnedDomains': pins.keys.toList(),
  };
}

/// Get current certificate pinning configuration
CertPinningInfo getCertPinningInfo() {
  // Guard in any code path that inspects pins (debug-only via assert)
  _assertNoPlaceholders();
  return const CertPinningInfo(
    enabled: kEnableCertPinning,
    pins: kPinnedDomains,
    buildMode: kDebugMode ? 'debug' : 'release',
  );
}
