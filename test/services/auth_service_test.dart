import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mocktail/mocktail.dart';
import 'package:asora/services/auth_service.dart';

class MockDio extends Mock implements Dio {}

class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

Response<Map<String, dynamic>> _response(
  Object data,
  String path, {
  int? statusCode,
}) {
  final map = Map<String, dynamic>.from(data as Map);
  return Response<Map<String, dynamic>>(
    data: map,
    statusCode: statusCode ?? 200,
    requestOptions: RequestOptions(path: path),
  );
}

void main() {
  setUpAll(() {
    registerFallbackValue(Options());
  });

  test('loginWithEmail stores token when response is successful', () async {
    final dio = MockDio();
    final storage = MockFlutterSecureStorage();
    when(() => dio.options).thenReturn(BaseOptions());

    when(
      () => dio.post<Map<String, dynamic>>(
        '/auth/email/login',
        data: any(named: 'data'),
      ),
    ).thenAnswer(
      (_) async => _response(
        {'access_token': 'jwt-token', 'refresh_token': 'refresh-token'},
        '/auth/email/login',
        statusCode: 200,
      ),
    );

    when(
      () => storage.write(
        key: any(named: 'key'),
        value: any(named: 'value'),
      ),
    ).thenAnswer((_) async => {});

    final service = AuthService(dio: dio, storage: storage);
    final result = await service.loginWithEmail(
      'user@example.com',
      'correct-horse-battery-staple',
    );

    expect(result, true);
    verify(() => storage.write(key: 'jwt_token', value: 'jwt-token')).called(1);
    verify(
      () => storage.write(key: 'refresh_token', value: 'refresh-token'),
    ).called(1);
  });

  test('loginWithEmail returns false when token is missing', () async {
    final dio = MockDio();
    final storage = MockFlutterSecureStorage();
    when(() => dio.options).thenReturn(BaseOptions());

    when(
      () => dio.post<Map<String, dynamic>>(
        '/auth/email/login',
        data: any(named: 'data'),
      ),
    ).thenAnswer(
      (_) async => _response({}, '/auth/email/login', statusCode: 200),
    );

    final service = AuthService(dio: dio, storage: storage);
    final result = await service.loginWithEmail(
      'user@example.com',
      'correct-horse-battery-staple',
    );

    expect(result, false);
  });

  test('loginWithEmail returns false on DioException', () async {
    final dio = MockDio();
    final storage = MockFlutterSecureStorage();
    when(() => dio.options).thenReturn(BaseOptions());

    when(
      () => dio.post<Map<String, dynamic>>(
        '/auth/email/login',
        data: any(named: 'data'),
      ),
    ).thenThrow(
      DioException(requestOptions: RequestOptions(path: '/auth/email/login')),
    );

    final service = AuthService(dio: dio, storage: storage);
    final result = await service.loginWithEmail(
      'user@example.com',
      'correct-horse-battery-staple',
    );

    expect(result, false);
  });

  test('getToken returns stored value and handles errors', () async {
    final dio = MockDio();
    final storage = MockFlutterSecureStorage();
    when(() => dio.options).thenReturn(BaseOptions());

    when(
      () => storage.read(key: 'jwt_token'),
    ).thenAnswer((_) async => 'jwt-token');

    final service = AuthService(dio: dio, storage: storage);
    final token = await service.getToken();
    expect(token, 'jwt-token');

    when(() => storage.read(key: 'jwt_token')).thenThrow(Exception('fail'));
    final fallback = await service.getToken();
    expect(fallback, isNull);
  });

  test('isLoggedIn returns true only for non-empty tokens', () async {
    final dio = MockDio();
    final storage = MockFlutterSecureStorage();
    when(() => dio.options).thenReturn(BaseOptions());

    when(
      () => storage.read(key: 'jwt_token'),
    ).thenAnswer((_) async => 'jwt-token');
    final service = AuthService(dio: dio, storage: storage);
    expect(await service.isLoggedIn(), true);

    when(() => storage.read(key: 'jwt_token')).thenAnswer((_) async => '');
    expect(await service.isLoggedIn(), false);
  });

  test('logout clears stored token', () async {
    final dio = MockDio();
    final storage = MockFlutterSecureStorage();
    when(() => dio.options).thenReturn(BaseOptions());

    when(() => storage.delete(key: 'jwt_token')).thenAnswer((_) async => {});
    when(
      () => storage.delete(key: 'refresh_token'),
    ).thenAnswer((_) async => {});

    final service = AuthService(dio: dio, storage: storage);
    await service.logout();

    verify(() => storage.delete(key: 'jwt_token')).called(1);
    verify(() => storage.delete(key: 'refresh_token')).called(1);
  });

  test('getCurrentUser returns null when token missing', () async {
    final dio = MockDio();
    final storage = MockFlutterSecureStorage();
    when(() => dio.options).thenReturn(BaseOptions());

    when(() => storage.read(key: 'jwt_token')).thenAnswer((_) async => null);

    final service = AuthService(dio: dio, storage: storage);
    expect(await service.getCurrentUser(), isNull);
  });

  test('getCurrentUser returns data on success', () async {
    final dio = MockDio();
    final storage = MockFlutterSecureStorage();
    when(() => dio.options).thenReturn(BaseOptions());

    when(
      () => storage.read(key: 'jwt_token'),
    ).thenAnswer((_) async => 'jwt-token');
    when(
      () => dio.get<Map<String, dynamic>>(
        '/auth/userinfo',
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async =>
          _response({'id': 'user-1'}, '/auth/userinfo', statusCode: 200),
    );

    final service = AuthService(dio: dio, storage: storage);
    final result = await service.getCurrentUser();
    expect(result?['id'], 'user-1');
  });

  test('getCurrentUser returns null on DioException', () async {
    final dio = MockDio();
    final storage = MockFlutterSecureStorage();
    when(() => dio.options).thenReturn(BaseOptions());

    when(
      () => storage.read(key: 'jwt_token'),
    ).thenAnswer((_) async => 'jwt-token');
    when(
      () => dio.get<Map<String, dynamic>>(
        '/auth/userinfo',
        options: any(named: 'options'),
      ),
    ).thenThrow(
      DioException(requestOptions: RequestOptions(path: '/auth/userinfo')),
    );

    final service = AuthService(dio: dio, storage: storage);
    final result = await service.getCurrentUser();
    expect(result, isNull);
  });
}
