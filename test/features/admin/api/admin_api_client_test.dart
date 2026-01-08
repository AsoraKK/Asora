import 'package:asora/features/admin/api/admin_api_client.dart';
import 'package:asora/features/admin/domain/admin_config_models.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockDio extends Mock implements Dio {}

Response<Map<String, dynamic>> _response(
  Map<String, dynamic> data,
  String path, {
  int? statusCode,
}) {
  return Response(
    data: data,
    statusCode: statusCode ?? 200,
    requestOptions: RequestOptions(path: path),
  );
}

AdminConfig _config() {
  return const AdminConfig(
    schemaVersion: 1,
    moderation: ModerationConfig(
      temperature: 0.3,
      hiveAutoFlagThreshold: 0.7,
      hiveAutoRemoveThreshold: 0.9,
      enableAutoModeration: true,
      enableAzureContentSafety: false,
    ),
    featureFlags: FeatureFlagsConfig(
      appealsEnabled: true,
      communityVotingEnabled: false,
      pushNotificationsEnabled: true,
      maintenanceMode: false,
    ),
  );
}

Map<String, dynamic> _configEnvelopeJson() {
  return {
    'version': 2,
    'updatedAt': '2024-01-01T00:00:00Z',
    'updatedBy': {'id': 'admin@asora.co.za', 'displayName': 'Admin'},
    'payload': _config().toJson(),
  };
}

void main() {
  setUpAll(() {
    registerFallbackValue(Options());
  });

  test('getConfig returns parsed envelope', () async {
    final dio = MockDio();
    final client = AdminApiClient(dio);

    when(
      () => dio.get<Map<String, dynamic>>(
        '/api/admin/config',
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => _response(_configEnvelopeJson(), '/api/admin/config'),
    );

    final result = await client.getConfig();
    expect(result.version, 2);
    expect(result.config.moderation.temperature, 0.3);
  });

  test('updateConfig returns envelope from response', () async {
    final dio = MockDio();
    final client = AdminApiClient(dio);

    when(
      () => dio.put<Map<String, dynamic>>(
        '/api/admin/config',
        data: any(named: 'data'),
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => _response(_configEnvelopeJson(), '/api/admin/config'),
    );

    final result = await client.updateConfig(
      expectedVersion: 1,
      config: _config(),
    );

    expect(result.config.featureFlags.maintenanceMode, isFalse);
  });

  test(
    'updateConfig falls back to getConfig when response is minimal',
    () async {
      final dio = MockDio();
      final client = AdminApiClient(dio);

      when(
        () => dio.put<Map<String, dynamic>>(
          '/api/admin/config',
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).thenAnswer((_) async => _response({'ok': true}, '/api/admin/config'));

      when(
        () => dio.get<Map<String, dynamic>>(
          '/api/admin/config',
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => _response(_configEnvelopeJson(), '/api/admin/config'),
      );

      final result = await client.updateConfig(
        expectedVersion: 1,
        config: _config(),
      );

      expect(result.version, 2);
      verify(
        () => dio.get<Map<String, dynamic>>(
          '/api/admin/config',
          options: any(named: 'options'),
        ),
      ).called(1);
    },
  );

  test('updateConfigPatch applies patch fields', () async {
    final dio = MockDio();
    final client = AdminApiClient(dio);

    when(
      () => dio.put<Map<String, dynamic>>(
        '/api/admin/config',
        data: any(named: 'data'),
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => _response(_configEnvelopeJson(), '/api/admin/config'),
    );

    await client.updateConfigPatch(
      expectedVersion: 1,
      currentConfig: _config(),
      patch: {
        'moderation.hiveAutoFlagThreshold': 0.5,
        'featureFlags.maintenanceMode': true,
      },
    );

    final captured =
        verify(
              () => dio.put<Map<String, dynamic>>(
                '/api/admin/config',
                data: captureAny(named: 'data'),
                options: any(named: 'options'),
              ),
            ).captured.single
            as Map<String, dynamic>;

    final payload = captured['payload'] as Map<String, dynamic>;
    final moderation = payload['moderation'] as Map<String, dynamic>;
    final featureFlags = payload['featureFlags'] as Map<String, dynamic>;

    expect(moderation['hiveAutoFlagThreshold'], 0.5);
    expect(featureFlags['maintenanceMode'], isTrue);
  });

  test('getAuditLog parses entries', () async {
    final dio = MockDio();
    final client = AdminApiClient(dio);

    when(
      () => dio.get<Map<String, dynamic>>(
        '/api/admin/audit',
        queryParameters: any(named: 'queryParameters'),
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => _response({
        'limit': 10,
        'entries': [
          {
            'id': 'a1',
            'timestamp': '2024-01-01T00:00:00Z',
            'actor': 'admin',
            'action': 'update',
            'resource': 'config',
          },
        ],
      }, '/api/admin/audit'),
    );

    final result = await client.getAuditLog(limit: 10);
    expect(result.entries.length, 1);
    expect(result.limit, 10);
  });

  test('getConfig surfaces ApiException from error payload', () async {
    final dio = MockDio();
    final client = AdminApiClient(dio);

    when(
      () => dio.get<Map<String, dynamic>>(
        '/api/admin/config',
        options: any(named: 'options'),
      ),
    ).thenThrow(
      DioException(
        requestOptions: RequestOptions(path: '/api/admin/config'),
        response: Response(
          requestOptions: RequestOptions(path: '/api/admin/config'),
          statusCode: 409,
          data: {
            'error': {
              'message': 'Version conflict',
              'code': 'VERSION_CONFLICT',
              'correlationId': 'corr-1',
            },
          },
        ),
        type: DioExceptionType.badResponse,
      ),
    );

    await expectLater(
      client.getConfig(),
      throwsA(
        isA<AdminApiException>()
            .having((e) => e.isVersionConflict, 'conflict', isTrue)
            .having((e) => e.code, 'code', 'VERSION_CONFLICT')
            .having((e) => e.correlationId, 'corr', 'corr-1'),
      ),
    );
  });
}
