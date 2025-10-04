import 'package:asora/core/logging/app_logger.dart';
import 'package:asora/core/network/api_endpoints.dart';
import 'package:asora/services/privacy_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _MockLogger extends Mock implements AppLogger {}

void main() {
  late Dio dio;
  late AppLogger logger;
  late PrivacyService service;
  String? token;
  Options? capturedOptions;

  setUpAll(() {
    registerFallbackValue(RequestOptions(path: ''));
    registerFallbackValue(Options());
  });

  setUp(() {
    dio = _MockDio();
    logger = _MockLogger();
    token = 'test-token';
    capturedOptions = null;

    when(() => logger.info(any(), any(), any())).thenReturn(null);
    when(() => logger.warning(any(), any(), any())).thenReturn(null);
    when(() => logger.error(any(), any(), any())).thenReturn(null);
    when(() => logger.debug(any(), any(), any())).thenReturn(null);

    service = PrivacyService(dio, logger, tokenResolver: () async => token);
  });

  group('exportUserData', () {
    test('returns unauthorized when token is missing', () async {
      token = null;

      final result = await service.exportUserData();

      expect(result.result, PrivacyOperationResult.unauthorized);
      expect(result.data, isNull);
      expect(
        result.errorMessage,
        equals('Please sign in to export your data.'),
      );
      verify(() => logger.warning(any(), any(), any())).called(1);
      verifyNever(() => dio.get(any(), options: any(named: 'options')));
    });

    test('attaches auth headers and returns data on success', () async {
      when(() => dio.get(any(), options: any(named: 'options'))).thenAnswer((
        invocation,
      ) async {
        capturedOptions = invocation.namedArguments[#options] as Options?;
        return Response<Map<String, dynamic>>(
          requestOptions: RequestOptions(path: '/privacy/exportUser'),
          statusCode: 200,
          data: {
            'metadata': {'exportId': 'exp_123'},
          },
        );
      });

      final result = await service.exportUserData();

      expect(result.result, PrivacyOperationResult.success);
      expect(result.data, isNotNull);
      expect(result.errorMessage, isNull);
      expect(capturedOptions, isNotNull);
      final headers = capturedOptions!.headers ?? {};
      expect(headers['Authorization'], 'Bearer test-token');
      expect(headers.containsKey('x-functions-key'), isFalse);
      verify(
        () => dio.get(ApiEndpoints.exportUser, options: any(named: 'options')),
      ).called(1);
    });

    test('adds x-functions-key header when configured', () async {
      service = PrivacyService(
        dio,
        logger,
        tokenResolver: () async => token,
        functionKey: 'abc123',
      );

      when(() => dio.get(any(), options: any(named: 'options'))).thenAnswer((
        invocation,
      ) async {
        capturedOptions = invocation.namedArguments[#options] as Options?;
        return Response<Map<String, dynamic>>(
          requestOptions: RequestOptions(path: '/privacy/exportUser'),
          statusCode: 200,
          data: {
            'metadata': {'exportId': 'exp_456'},
          },
        );
      });

      await service.exportUserData();

      expect(capturedOptions, isNotNull);
      final headers = capturedOptions!.headers ?? {};
      expect(headers['Authorization'], 'Bearer test-token');
      expect(headers['x-functions-key'], 'abc123');
    });

    test('maps rate limit responses to rateLimited result', () async {
      when(() => dio.get(any(), options: any(named: 'options'))).thenThrow(
        DioException(
          requestOptions: RequestOptions(path: '/privacy/exportUser'),
          response: Response<Map<String, dynamic>>(
            requestOptions: RequestOptions(path: '/privacy/exportUser'),
            statusCode: 429,
            data: {
              'code': 'rate_limit_exceeded',
              'message': 'You can only export once per day',
            },
          ),
          type: DioExceptionType.badResponse,
        ),
      );

      final result = await service.exportUserData();

      expect(result.result, PrivacyOperationResult.rateLimited);
      expect(result.errorMessage, 'You can only export once per day');
    });
  });

  group('deleteAccount', () {
    test('returns unauthorized when token is missing', () async {
      token = null;

      final result = await service.deleteAccount();

      expect(result.result, PrivacyOperationResult.unauthorized);
      expect(
        result.errorMessage,
        equals('Please sign in to delete your account.'),
      );
      verify(() => logger.warning(any(), any(), any())).called(1);
      verifyNever(
        () => dio.post(
          any(),
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      );
    });

    test('adds confirm header and returns success', () async {
      when(
        () => dio.post(
          any(),
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).thenAnswer((invocation) async {
        capturedOptions = invocation.namedArguments[#options] as Options?;
        return Response<void>(
          requestOptions: RequestOptions(path: '/privacy/deleteUser'),
          statusCode: 200,
        );
      });

      final result = await service.deleteAccount();

      expect(result.result, PrivacyOperationResult.success);
      expect(capturedOptions, isNotNull);
      final headers = capturedOptions!.headers ?? {};
      expect(headers['Authorization'], equals('Bearer test-token'));
      expect(headers['X-Confirm-Delete'], 'true');
      verify(
        () => dio.post(
          ApiEndpoints.deleteUser,
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).called(1);
    });

    test('treats 202 accepted response as async success', () async {
      when(
        () => dio.post(
          any(),
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).thenAnswer((_) async {
        return Response<void>(
          requestOptions: RequestOptions(path: '/privacy/deleteUser'),
          statusCode: 202,
        );
      });

      final result = await service.deleteAccount();

      expect(result.result, PrivacyOperationResult.success);
      verify(
        () => logger.info('Account deletion successful', any(), any()),
      ).called(1);
    });

    test('maps rate limit response to rateLimited result', () async {
      when(
        () => dio.post(
          any(),
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).thenThrow(
        DioException(
          requestOptions: RequestOptions(path: '/privacy/deleteUser'),
          response: Response<Map<String, dynamic>>(
            requestOptions: RequestOptions(path: '/privacy/deleteUser'),
            statusCode: 429,
            data: {'message': 'Please wait before retrying'},
          ),
          type: DioExceptionType.badResponse,
        ),
      );

      final result = await service.deleteAccount();

      expect(result.result, PrivacyOperationResult.rateLimited);
      expect(result.errorMessage, 'Please wait before retrying');
    });

    test('maps network errors to networkError result', () async {
      when(
        () => dio.post(
          any(),
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).thenThrow(
        DioException.connectionError(
          requestOptions: RequestOptions(path: '/privacy/deleteUser'),
          reason: 'Socket error',
        ),
      );

      final result = await service.deleteAccount();

      expect(result.result, PrivacyOperationResult.networkError);
      expect(result.errorMessage, isNotEmpty);
    });
  });
}
