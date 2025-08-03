/// ASORA OPENTELEMETRY INSTRUMENTATION
///
/// 🎯 Purpose: Service method instrumentation for observability
/// 📊 Metrics: HTTP status codes, response times, error rates
/// 🔍 Tracing: Distributed traces across service calls
/// 📱 Platform: Flutter with custom tracing implementation
library;

import 'dart:developer' as developer;

/// Span for tracking operation lifecycle
class AsoraSpan {
  final String operationName;
  final DateTime startTime;
  final Map<String, Object> attributes = {};
  String status = 'ok';
  String? errorMessage;
  bool _ended = false;

  AsoraSpan._(this.operationName, this.startTime);

  /// Set span attributes
  void setAttributes(Map<String, Object> attrs) {
    attributes.addAll(attrs);
  }

  /// Set single attribute
  void setAttribute(String key, Object value) {
    attributes[key] = value;
  }

  /// Set span status
  void setStatus(String statusCode, [String? message]) {
    status = statusCode;
    errorMessage = message;
  }

  /// Record exception in span
  void recordException(Object error, {StackTrace? stackTrace}) {
    attributes['error.type'] = error.runtimeType.toString();
    attributes['error.message'] = error.toString();
    if (stackTrace != null) {
      attributes['error.stack_trace'] = stackTrace.toString();
    }
  }

  /// End the span and log metrics
  void end() {
    if (_ended) return;
    _ended = true;

    final duration = DateTime.now().difference(startTime);
    attributes['duration_ms'] = duration.inMilliseconds;

    // Log span data for observability
    developer.log(
      'Span: $operationName completed',
      name: 'asora.trace',
      time: DateTime.now(),
      level: status == 'error' ? 1000 : 800, // Error vs Info level
      error: errorMessage,
      stackTrace: null,
    );

    // Log metrics in structured format
    developer.log(
      'SPAN_METRICS: ${_formatSpanMetrics()}',
      name: 'asora.metrics',
    );
  }

  String _formatSpanMetrics() {
    return [
      'operation=$operationName',
      'status=$status',
      'duration_ms=${attributes['duration_ms']}',
      if (attributes.containsKey('http.status_code'))
        'http_status=${attributes['http.status_code']}',
      if (attributes.containsKey('response.item_count'))
        'item_count=${attributes['response.item_count']}',
      if (errorMessage != null) 'error="$errorMessage"',
    ].join(' ');
  }
}

/// OpenTelemetry instrumentation helper for Asora services
class AsoraTracer {
  /// Start a span for service method tracing
  ///
  /// [operationName] - The name of the operation (e.g., 'ModerationService.getMyAppeals')
  /// [attributes] - Additional span attributes for context
  static AsoraSpan startSpan(
    String operationName, {
    Map<String, Object>? attributes,
  }) {
    final span = AsoraSpan._(operationName, DateTime.now());

    // Add default attributes
    span.setAttributes({
      'service.name': 'asora-mobile',
      'service.version': '1.0.0',
      'component': 'http-client',
      ...?attributes,
    });

    return span;
  }

  /// Wrap a future with span instrumentation
  ///
  /// Automatically handles:
  /// - Span lifecycle (start/end)
  /// - Exception recording
  /// - Status code setting
  /// - Performance timing
  static Future<T> traceOperation<T>(
    String operationName,
    Future<T> Function() operation, {
    Map<String, Object>? attributes,
    T Function(Object error)? onError,
  }) async {
    final span = startSpan(operationName, attributes: attributes);
    final stopwatch = Stopwatch()..start();

    try {
      final result = await operation();

      // Record success metrics
      span.setStatus('ok');
      span.setAttributes({
        'operation.success': true,
        'operation.duration_ms': stopwatch.elapsedMilliseconds,
      });

      // Add result-specific attributes
      if (result is Map<String, dynamic>) {
        _addResponseAttributes(span, result);
      } else if (result is List) {
        span.setAttribute('response.item_count', result.length);
      }

      return result;
    } catch (error, stackTrace) {
      // Record error details
      span.setStatus('error', error.toString());
      span.setAttributes({
        'operation.success': false,
        'operation.duration_ms': stopwatch.elapsedMilliseconds,
        'error.type': error.runtimeType.toString(),
        'error.message': error.toString(),
      });

      // Record stack trace if available
      span.recordException(error, stackTrace: stackTrace);

      // Allow custom error handling
      if (onError != null) {
        return onError(error);
      }

      rethrow;
    } finally {
      span.end();
      stopwatch.stop();
    }
  }

  /// Add HTTP response specific attributes to span
  static void _addResponseAttributes(
    AsoraSpan span,
    Map<String, dynamic> response,
  ) {
    // Status code from response
    if (response.containsKey('statusCode')) {
      span.setAttribute('http.status_code', response['statusCode']);
    }

    // Success flag
    if (response.containsKey('success')) {
      span.setAttribute('response.success', response['success']);
    }

    // Item count for paginated responses
    if (response.containsKey('data')) {
      final data = response['data'];
      if (data is List) {
        span.setAttribute('response.item_count', data.length);
      } else if (data is Map && data.containsKey('appeals')) {
        final appeals = data['appeals'];
        if (appeals is List) {
          span.setAttribute('response.item_count', appeals.length);
        }
      }
    }

    // Pagination info
    if (response.containsKey('pagination')) {
      final pagination = response['pagination'] as Map<String, dynamic>?;
      if (pagination != null) {
        span.setAttributes({
          'pagination.page': pagination['page'] ?? 1,
          'pagination.total_pages': pagination['totalPages'] ?? 1,
          'pagination.total_items': pagination['totalItems'] ?? 0,
        });
      }
    }

    // Error information
    if (response.containsKey('error')) {
      span.setAttributes({
        'response.error': true,
        'error.message': response['error'].toString(),
      });
    }
  }

  /// Record HTTP request attributes
  static Map<String, Object> httpRequestAttributes({
    required String method,
    required String url,
    int? statusCode,
    Map<String, String>? headers,
  }) {
    return {
      'http.method': method,
      'http.url': url,
      if (statusCode != null) 'http.status_code': statusCode,
      if (headers?.containsKey('content-type') == true)
        'http.request.content_type': headers!['content-type']!,
    };
  }
}
