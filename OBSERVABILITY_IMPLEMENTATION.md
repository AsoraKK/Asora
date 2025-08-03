# 📊 OpenTelemetry Instrumentation Implementation

## Overview
Added comprehensive OpenTelemetry tracing to all service methods for production observability, performance monitoring, and error tracking.

## 🎯 Sample Refactor: ModerationService.getMyAppeals()

### **Before (No Instrumentation)**
```dart
Future<Map<String, dynamic>> getMyAppeals({
  required String token,
  int page = 1,
  int pageSize = 20,
  String? status,
  String? contentType,
  String? reviewQueue,
}) async {
  final queryParams = <String, dynamic>{
    'page': page,
    'pageSize': pageSize,
    if (status != null) 'status': status,
    if (contentType != null) 'contentType': contentType,
    if (reviewQueue != null) 'reviewQueue': reviewQueue,
  };

  final response = await _dio.get(
    '/api/getMyAppeals',
    queryParameters: queryParams,
    options: Options(headers: {'Authorization': 'Bearer $token'}),
  );

  return response.data;
}
```

### **After (Full Instrumentation)**
```dart
Future<Map<String, dynamic>> getMyAppeals({
  required String token,
  int page = 1,
  int pageSize = 20,
  String? status,
  String? contentType,
  String? reviewQueue,
}) async {
  return AsoraTracer.traceOperation(
    'ModerationService.getMyAppeals',
    () async {
      final queryParams = <String, dynamic>{
        'page': page,
        'pageSize': pageSize,
        if (status != null) 'status': status,
        if (contentType != null) 'contentType': contentType,
        if (reviewQueue != null) 'reviewQueue': reviewQueue,
      };

      final response = await _dio.get(
        '/api/getMyAppeals',
        queryParameters: queryParams,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      return response.data;
    },
    attributes: AsoraTracer.httpRequestAttributes(
      method: 'GET',
      url: '/api/getMyAppeals',
    )..addAll({
      'request.page': page,
      'request.page_size': pageSize,
      if (status != null) 'request.status_filter': status,
      if (contentType != null) 'request.content_type_filter': contentType,
      if (reviewQueue != null) 'request.review_queue_filter': reviewQueue,
    }),
  );
}
```

## 📈 Instrumented Methods

### **ModerationService**
- ✅ `flagContent()` - Content flagging operations
- ✅ `appealContent()` - Appeal submission
- ✅ `getMyAppeals()` - User's appeal history  
- ✅ `getAppealedContent()` - Community appeals for voting
- ✅ `voteOnAppeal()` - Community voting actions

### **FeedService**  
- ✅ `getVotingFeed()` - Paginated appeal feed
- ✅ `getVotingHistory()` - User's voting history
- ✅ `getFeedMetrics()` - Feed analytics

## 🔍 Trace Attributes Captured

### **HTTP Request Attributes**
```dart
{
  'http.method': 'GET',
  'http.url': '/api/getMyAppeals',
  'http.status_code': 200,
  'service.name': 'asora-mobile',
  'service.version': '1.0.0',
  'component': 'http-client'
}
```

### **Request Context**
```dart
{
  'request.page': 1,
  'request.page_size': 20,
  'request.status_filter': 'pending',
  'request.content_type_filter': 'post',
  'request.appeal_id': 'appeal_123'
}
```

### **Response Metrics**
```dart
{
  'operation.success': true,
  'operation.duration_ms': 245,
  'response.item_count': 15,
  'pagination.page': 1,
  'pagination.total_pages': 3,
  'pagination.total_items': 42
}
```

### **Error Tracking**
```dart
{
  'operation.success': false,
  'error.type': 'DioException',
  'error.message': 'Connection timeout',
  'error.stack_trace': '...',
  'http.status_code': 408
}
```

## 📊 Log Output Examples

### **Successful Operation**
```log
2025-08-02T14:30:25.123Z INFO asora.trace Span: ModerationService.getMyAppeals completed
2025-08-02T14:30:25.124Z INFO asora.metrics SPAN_METRICS: operation=ModerationService.getMyAppeals status=ok duration_ms=245 http_status=200 item_count=15
```

### **Error Scenario**
```log
2025-08-02T14:30:30.456Z ERROR asora.trace Span: FeedService.getVotingFeed completed
2025-08-02T14:30:30.457Z ERROR asora.metrics SPAN_METRICS: operation=FeedService.getVotingFeed status=error duration_ms=5000 error="Connection timeout after 5000ms"
```

## 🎯 Production Benefits

### **Performance Monitoring**
- **Response Times**: Track P50, P95, P99 latencies across all service calls
- **Throughput**: Monitor requests per second for each endpoint
- **Error Rates**: Track success/failure ratios by operation type

### **Distributed Tracing**
- **Request Flow**: Follow user requests across multiple service calls
- **Bottleneck Identification**: Find slow operations in the request chain
- **Dependency Mapping**: Understand service call patterns

### **Error Analysis**
- **Exception Tracking**: Automatic exception capture with stack traces
- **Error Correlation**: Link errors to specific user actions and contexts
- **Failure Pattern Detection**: Identify common failure scenarios

### **Business Intelligence**
- **Feature Usage**: Track which moderation/feed features are used most
- **User Behavior**: Analyze pagination patterns, filter usage, voting trends
- **Operational Metrics**: Monitor appeal processing times, vote completion rates

## 🚀 Integration with Observability Stack

### **Log Aggregation**
```yaml
# Fluentd/Fluent Bit configuration
filters:
  - name: grep
    match: "asora.*"
    regex: "SPAN_METRICS"
```

### **Metrics Export**
```dart
// Example: Export to Prometheus/StatsD
void exportMetrics(Map<String, Object> attributes) {
  final duration = attributes['operation.duration_ms'] as int;
  final operation = attributes['operation'] as String;
  
  // Histogram: operation_duration_ms{operation="ModerationService.getMyAppeals"}
  metricsClient.histogram('operation_duration_ms')
    .labels({'operation': operation})
    .observe(duration);
}
```

### **Alerting Rules**
```yaml
# Example: Prometheus alerting
groups:
  - name: asora_mobile
    rules:
      - alert: HighErrorRate
        expr: rate(asora_operation_errors[5m]) > 0.1
        labels:
          severity: warning
        annotations:
          summary: "High error rate in Asora mobile services"
          
      - alert: SlowResponse
        expr: histogram_quantile(0.95, asora_operation_duration_ms) > 2000
        labels:
          severity: critical
        annotations:
          summary: "95th percentile response time exceeds 2 seconds"
```

## 🔧 Configuration

### **Development vs Production**
```dart
// Development: Verbose logging
const bool isDevelopment = bool.fromEnvironment('FLUTTER_DEV', defaultValue: false);

if (isDevelopment) {
  // Full trace logging to console
  AsoraTracer.enableVerboseLogging();
} else {
  // Production: Export to APM systems
  AsoraTracer.configureExporters([
    JaegerExporter(endpoint: 'https://jaeger.company.com'),
    PrometheusExporter(endpoint: 'https://prometheus.company.com'),
  ]);
}
```

**Result**: Complete observability coverage across all service methods with rich context capture for production monitoring and debugging.
