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
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockPushNotificationService extends Mock
    implements PushNotificationService {}

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
}
