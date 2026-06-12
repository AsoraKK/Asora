import 'package:asora/core/config/environment_config.dart';
import 'package:asora/core/network/dio_client.dart';
import 'package:asora/services/auth_service.dart';
import 'package:asora/services/moderation_service.dart';
import 'package:asora/services/oauth2_service.dart';
import 'package:asora/services/post_service.dart';
import 'package:asora/services/push/device_token_service.dart';
import 'package:asora/services/push/push_notification_service.dart';
import 'package:asora/services/service_providers.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _MockPushNotificationService extends Mock
    implements PushNotificationService {}

class _MockStorage extends Mock implements FlutterSecureStorage {}

void main() {
  test('service providers create expected instances', () {
    final mockPush = _MockPushNotificationService();
    final container = ProviderContainer(
      overrides: [
        secureDioProvider.overrideWithValue(Dio()),
        pushNotificationServiceProvider.overrideWithValue(mockPush),
      ],
    );
    addTearDown(container.dispose);

    expect(container.read(secureStorageProvider), isNotNull);
    expect(container.read(oauth2ServiceProvider), isA<OAuth2Service>());
    expect(container.read(authServiceProvider), isA<AuthService>());
    expect(container.read(postServiceProvider), isA<PostService>());
    expect(container.read(moderationServiceProvider), isA<ModerationClient>());
    expect(
      container.read(deviceTokenServiceProvider),
      isA<DeviceTokenService>(),
    );
  });

  test('b2cConfigServiceProvider uses the configured API base URL', () async {
    final mockDio = _MockDio();
    final mockStorage = _MockStorage();
    final expectedBaseUrl = EnvironmentConfig.fromEnvironment().apiBaseUrl;
    final expectedEndpoint = Uri.parse(expectedBaseUrl)
        .replace(
          pathSegments: [
            ...Uri.parse(
              expectedBaseUrl,
            ).pathSegments.where((segment) => segment.isNotEmpty),
            'auth',
            'b2c-config',
          ],
        )
        .toString();

    when(
      () => mockStorage.read(key: any(named: 'key')),
    ).thenAnswer((_) async => null);
    when(
      () => mockDio.get<Map<String, dynamic>>(
        any(),
        options: any(named: 'options'),
      ),
    ).thenThrow(
      DioException(
        requestOptions: RequestOptions(path: '/api/auth/b2c-config'),
        type: DioExceptionType.connectionTimeout,
      ),
    );

    final container = ProviderContainer(
      overrides: [
        secureDioProvider.overrideWithValue(mockDio),
        secureStorageProvider.overrideWithValue(mockStorage),
      ],
    );
    addTearDown(container.dispose);

    final service = container.read(b2cConfigServiceProvider);
    await service.load();

    verify(
      () => mockDio.get<Map<String, dynamic>>(
        expectedEndpoint,
        options: any(named: 'options'),
      ),
    ).called(1);
  });
}
