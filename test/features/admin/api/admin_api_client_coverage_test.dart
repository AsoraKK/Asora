// ignore_for_file: public_member_api_docs

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:asora/features/admin/api/admin_api_client.dart';
import 'package:asora/features/admin/domain/admin_config_models.dart';

void main() {
  // ── AdminApiException extended tests ──────────────────────────────────
  group('AdminApiException extended', () {
    test('isVersionConflict by code', () {
      const e = AdminApiException(
        message: 'Conflict',
        code: 'VERSION_CONFLICT',
      );
      expect(e.isVersionConflict, isTrue);
    });

    test('isVersionConflict by 409 status', () {
      const e = AdminApiException(
        message: 'Conflict',
        code: 'OTHER',
        statusCode: 409,
      );
      expect(e.isVersionConflict, isTrue);
    });

    test('isAuthError 401', () {
      const e = AdminApiException(message: '', code: '', statusCode: 401);
      expect(e.isAuthError, isTrue);
    });

    test('isAuthError 403', () {
      const e = AdminApiException(message: '', code: '', statusCode: 403);
      expect(e.isAuthError, isTrue);
    });

    test('isRateLimited 429', () {
      const e = AdminApiException(message: '', code: '', statusCode: 429);
      expect(e.isRateLimited, isTrue);
    });

    test('isServerError 500+', () {
      const e = AdminApiException(message: '', code: '', statusCode: 500);
      expect(e.isServerError, isTrue);
    });

    test('isServerError false for null', () {
      const e = AdminApiException(message: '', code: '');
      expect(e.isServerError, isFalse);
    });

    test('toString format', () {
      const e = AdminApiException(
        message: 'Err',
        code: 'CODE',
        statusCode: 404,
        correlationId: 'corr',
      );
      expect(e.toString(), contains('Err'));
      expect(e.toString(), contains('CODE'));
    });
  });

  // ── AdminApiClient._parseError via getConfig ──────────────────────────
  group('AdminApiClient error parsing via getConfig', () {
    late AdminApiClient client;
    late Dio dio;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      client = AdminApiClient(dio);
    });

    test('connection timeout maps to TIMEOUT', () async {
      dio.httpClientAdapter = _ThrowingAdapter(
        DioException(
          requestOptions: RequestOptions(path: '/api/admin/config'),
          type: DioExceptionType.connectionTimeout,
        ),
      );

      try {
        await client.getConfig();
        fail('Should throw');
      } on AdminApiException catch (e) {
        expect(e.code, 'TIMEOUT');
        expect(e.message, 'Request timed out');
      }
    });

    test('send timeout maps to TIMEOUT', () async {
      dio.httpClientAdapter = _ThrowingAdapter(
        DioException(
          requestOptions: RequestOptions(path: '/api/admin/config'),
          type: DioExceptionType.sendTimeout,
        ),
      );

      try {
        await client.getConfig();
        fail('Should throw');
      } on AdminApiException catch (e) {
        expect(e.code, 'TIMEOUT');
      }
    });

    test('receive timeout maps to TIMEOUT', () async {
      dio.httpClientAdapter = _ThrowingAdapter(
        DioException(
          requestOptions: RequestOptions(path: '/api/admin/config'),
          type: DioExceptionType.receiveTimeout,
        ),
      );

      try {
        await client.getConfig();
        fail('Should throw');
      } on AdminApiException catch (e) {
        expect(e.code, 'TIMEOUT');
      }
    });

    test('connection error maps to CONNECTION_ERROR', () async {
      dio.httpClientAdapter = _ThrowingAdapter(
        DioException(
          requestOptions: RequestOptions(path: '/api/admin/config'),
          type: DioExceptionType.connectionError,
        ),
      );

      try {
        await client.getConfig();
        fail('Should throw');
      } on AdminApiException catch (e) {
        expect(e.code, 'CONNECTION_ERROR');
        expect(e.message, 'Connection failed');
      }
    });

    test('bad response with error body parses details', () async {
      dio.httpClientAdapter = _ThrowingAdapter(
        DioException(
          requestOptions: RequestOptions(path: '/api/admin/config'),
          type: DioExceptionType.badResponse,
          response: Response(
            requestOptions: RequestOptions(path: '/api/admin/config'),
            statusCode: 500,
            data: <String, dynamic>{
              'error': {
                'message': 'Internal error',
                'code': 'INTERNAL_ERROR',
                'correlationId': 'xyz',
              },
            },
          ),
        ),
      );

      try {
        await client.getConfig();
        fail('Should throw');
      } on AdminApiException catch (e) {
        expect(e.message, 'Internal error');
        expect(e.code, 'INTERNAL_ERROR');
        expect(e.correlationId, 'xyz');
        expect(e.statusCode, 500);
      }
    });

    test('bad response without error body uses defaults', () async {
      dio.httpClientAdapter = _ThrowingAdapter(
        DioException(
          requestOptions: RequestOptions(path: '/api/admin/config'),
          type: DioExceptionType.badResponse,
          response: Response(
            requestOptions: RequestOptions(path: '/api/admin/config'),
            statusCode: 502,
            data: 'Bad Gateway',
          ),
        ),
      );

      try {
        await client.getConfig();
        fail('Should throw');
      } on AdminApiException catch (e) {
        expect(e.message, 'Request failed');
        expect(e.code, 'UNKNOWN_ERROR');
        expect(e.statusCode, 502);
      }
    });
  });

  // ── AdminApiClient._applyPatch via updateConfigPatch ──────────────────
  group('AdminApiClient _applyPatch', () {
    late AdminApiClient client;
    late Dio dio;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: ''));
      // Return a simple ok + follow-up GET
      dio.httpClientAdapter = _PutThenGetAdapter(
        putResponse: {'ok': true, 'version': 2},
        getResponse: {
          'version': 2,
          'updatedAt': '2025-01-02T00:00:00Z',
          'updatedBy': 'admin',
          'moderation': {},
          'featureFlags': {},
        },
      );
      client = AdminApiClient(dio);
    });

    test('patches moderation.temperature', () async {
      final r = await client.updateConfigPatch(
        expectedVersion: 1,
        currentConfig: const AdminConfig(),
        patch: {'moderation.temperature': 0.7},
      );
      expect(r, isNotNull);
    });

    test('patches moderation.hiveAutoFlagThreshold', () async {
      final r = await client.updateConfigPatch(
        expectedVersion: 1,
        currentConfig: const AdminConfig(),
        patch: {'moderation.hiveAutoFlagThreshold': 0.6},
      );
      expect(r, isNotNull);
    });

    test('patches moderation.hiveAutoRemoveThreshold', () async {
      final r = await client.updateConfigPatch(
        expectedVersion: 1,
        currentConfig: const AdminConfig(),
        patch: {'moderation.hiveAutoRemoveThreshold': 0.85},
      );
      expect(r, isNotNull);
    });

    test('patches moderation.enableAutoModeration', () async {
      final r = await client.updateConfigPatch(
        expectedVersion: 1,
        currentConfig: const AdminConfig(),
        patch: {'moderation.enableAutoModeration': false},
      );
      expect(r, isNotNull);
    });

    test('patches moderation.enableAzureContentSafety', () async {
      final r = await client.updateConfigPatch(
        expectedVersion: 1,
        currentConfig: const AdminConfig(),
        patch: {'moderation.enableAzureContentSafety': false},
      );
      expect(r, isNotNull);
    });

    test('patches legacy moderation field names', () async {
      final r = await client.updateConfigPatch(
        expectedVersion: 1,
        currentConfig: const AdminConfig(),
        patch: {
          'moderation.toxicityThreshold': 0.6,
          'moderation.autoRejectThreshold': 0.85,
          'moderation.enableHiveAi': false,
        },
      );
      expect(r, isNotNull);
    });

    test('patches featureFlags.appealsEnabled', () async {
      final r = await client.updateConfigPatch(
        expectedVersion: 1,
        currentConfig: const AdminConfig(),
        patch: {'featureFlags.appealsEnabled': false},
      );
      expect(r, isNotNull);
    });

    test('patches featureFlags.communityVotingEnabled', () async {
      final r = await client.updateConfigPatch(
        expectedVersion: 1,
        currentConfig: const AdminConfig(),
        patch: {'featureFlags.communityVotingEnabled': false},
      );
      expect(r, isNotNull);
    });

    test('patches featureFlags.pushNotificationsEnabled', () async {
      final r = await client.updateConfigPatch(
        expectedVersion: 1,
        currentConfig: const AdminConfig(),
        patch: {'featureFlags.pushNotificationsEnabled': false},
      );
      expect(r, isNotNull);
    });

    test('patches featureFlags.maintenanceMode', () async {
      final r = await client.updateConfigPatch(
        expectedVersion: 1,
        currentConfig: const AdminConfig(),
        patch: {'featureFlags.maintenanceMode': true},
      );
      expect(r, isNotNull);
    });
  });
}

// ── Test Adapters ─────────────────────────────────────────────────────────
class _ThrowingAdapter implements HttpClientAdapter {
  _ThrowingAdapter(this._error);
  final DioException _error;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    throw _error;
  }

  @override
  void close({bool force = false}) {}
}

class _PutThenGetAdapter implements HttpClientAdapter {
  _PutThenGetAdapter({required this.putResponse, required this.getResponse});
  final Map<String, dynamic> putResponse;
  final Map<String, dynamic> getResponse;
  int _callCount = 0;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    _callCount++;
    final data = (_callCount == 1) ? putResponse : getResponse;
    final jsonStr = _encodeJson(data);
    return ResponseBody.fromString(
      jsonStr,
      200,
      headers: {
        'content-type': ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

String _encodeJson(dynamic data) {
  if (data is Map) {
    final entries = data.entries
        .map((e) {
          final key = '"${e.key}"';
          final value = _encodeJson(e.value);
          return '$key:$value';
        })
        .join(',');
    return '{$entries}';
  }
  if (data is List) return '[${data.map(_encodeJson).join(',')}]';
  if (data is String) return '"$data"';
  if (data is bool) return data.toString();
  if (data is num) return data.toString();
  if (data == null) return 'null';
  return '"$data"';
}
