/// ASORA SERVICE PROVIDERS
///
/// 🎯 Purpose: Riverpod providers for dependency injection
/// 🔄 Integration: Azure Functions backend services
/// 📡 Network: Secure HTTP clients with proper configuration
/// 🏗️ Architecture: Clean service layer architecture
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:opentelemetry/api.dart';
import 'package:asora/core/network/dio_client.dart';
import 'package:asora/services/auth_service.dart';
import 'package:asora/services/post_service.dart';
import 'package:asora/services/moderation_service.dart';
import 'package:asora/services/oauth2_service.dart';
import 'package:asora/services/push/push_notification_service.dart';
import 'package:asora/services/push/device_token_service.dart';
import 'package:asora/services/media/media_upload_service.dart';
import 'package:asora/services/subscription/subscription_service.dart';

/// Flutter secure storage provider
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

/// OAuth2 service provider for B2C authentication
final oauth2ServiceProvider = Provider<OAuth2Service>((ref) {
  final dio = ref.watch(secureDioProvider);
  final storage = ref.watch(secureStorageProvider);
  return OAuth2Service(
    dio: dio,
    secureStorage: storage,
    configEndpoint:
        'https://asora-function-dev.azurewebsites.net/api/auth/b2c-config',
    tracer: globalTracerProvider.getTracer('oauth2_service'),
  );
});

/// Authentication service provider
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(); // No constructor parameters
});

/// Post service provider
final postServiceProvider = Provider<PostService>((ref) {
  final dio = ref.watch(secureDioProvider);
  return PostService(dio);
});

/// Moderation service provider
final moderationServiceProvider = Provider<ModerationClient>((ref) {
  final dio = ref.watch(secureDioProvider);
  return ModerationClient(dio);
});

/// Push notification service provider (singleton)
final pushNotificationServiceProvider = Provider<PushNotificationService>((
  ref,
) {
  return PushNotificationService();
});

/// Device token service provider
final deviceTokenServiceProvider = Provider<DeviceTokenService>((ref) {
  final dio = ref.watch(secureDioProvider);
  final pushService = ref.watch(pushNotificationServiceProvider);
  final storage = ref.watch(secureStorageProvider);

  return DeviceTokenService(
    dioClient: dio,
    pushService: pushService,
    storage: storage,
  );
});

/// Media upload service provider
final mediaUploadServiceProvider = Provider<MediaUploadService>((ref) {
  final dio = ref.watch(secureDioProvider);
  return MediaUploadService(apiDio: dio);
});

/// Subscription service provider (backend-only until IAP is wired)
final subscriptionServiceProvider = Provider<BackendSubscriptionService>((ref) {
  final dio = ref.watch(secureDioProvider);
  return BackendSubscriptionService(dio: dio);
});
