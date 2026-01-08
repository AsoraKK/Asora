import 'package:asora/features/notifications/domain/notification_models.dart';
import 'package:asora/services/push/device_token_service.dart';
import 'package:asora/services/push/push_notification_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockDio extends Mock implements Dio {}

class FakePushNotificationService implements PushNotificationService {
  FakePushNotificationService({this.token, this.platformValue = 'fcm'});

  final String? token;
  final String platformValue;

  @override
  String? get currentToken => token;

  @override
  String get platform => platformValue;

  @override
  Stream<Map<String, dynamic>> get onNotificationTapped => const Stream.empty();

  @override
  Stream<String> get onTokenRefresh => const Stream.empty();

  @override
  Future<void> initialize() async {}

  @override
  Future<void> subscribeToTopic(String topic) async {}

  @override
  Future<void> unsubscribeFromTopic(String topic) async {}

  @override
  void dispose() {}
}

Response<dynamic> _response(Object data, String path, {int? statusCode}) {
  return Response(
    data: data,
    statusCode: statusCode ?? 200,
    requestOptions: RequestOptions(path: path),
  );
}

void main() {
  setUpAll(() {
    registerFallbackValue(Options());
  });

  test('registerDeviceToken throws when token missing', () async {
    final dio = MockDio();
    final service = DeviceTokenService(
      dioClient: dio,
      pushService: FakePushNotificationService(token: null),
    );

    await expectLater(service.registerDeviceToken(), throwsA(isA<Exception>()));
  });

  test('registerDeviceToken posts and returns response data', () async {
    final dio = MockDio();
    final service = DeviceTokenService(
      dioClient: dio,
      pushService: FakePushNotificationService(token: 'token'),
    );

    when(
      () => dio.post('/api/devices/register', data: any(named: 'data')),
    ).thenAnswer(
      (_) async => _response({
        'success': true,
        'evictedDevice': {
          'id': 'd1',
          'userId': 'u1',
          'deviceId': 'device-1',
          'pushToken': 'token',
          'platform': 'fcm',
          'label': 'Pixel',
          'createdAt': '2024-01-01T00:00:00Z',
          'lastSeenAt': '2024-01-01T01:00:00Z',
        },
      }, '/api/devices/register'),
    );

    final result = await service.registerDeviceToken();

    expect(result['success'], isTrue);
    expect(result['evictedDevice'], isNotNull);
  });

  test('getRegisteredDevices parses response list', () async {
    final dio = MockDio();
    final service = DeviceTokenService(
      dioClient: dio,
      pushService: FakePushNotificationService(token: 'token'),
    );

    when(() => dio.get('/api/devices')).thenAnswer(
      (_) async => _response([
        {
          'id': 'd1',
          'userId': 'u1',
          'deviceId': 'device-1',
          'pushToken': 'token',
          'platform': 'fcm',
          'createdAt': '2024-01-01T00:00:00Z',
          'lastSeenAt': '2024-01-01T01:00:00Z',
        },
      ], '/api/devices'),
    );

    final devices = await service.getRegisteredDevices();
    expect(devices.length, 1);
    expect(devices.first, isA<UserDeviceToken>());
  });

  test('revokeDevice posts to revoke endpoint', () async {
    final dio = MockDio();
    final service = DeviceTokenService(
      dioClient: dio,
      pushService: FakePushNotificationService(token: 'token'),
    );

    when(
      () => dio.post('/api/devices/device-1/revoke'),
    ).thenAnswer((_) async => _response({}, '/api/devices/device-1/revoke'));

    await service.revokeDevice('device-1');

    verify(() => dio.post('/api/devices/device-1/revoke')).called(1);
  });
}
