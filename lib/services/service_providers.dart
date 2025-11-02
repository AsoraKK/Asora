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
import '../core/network/dio_client.dart';
import 'auth_service.dart';
import 'post_service.dart';
import 'moderation_service.dart';
import 'oauth2_service.dart';

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
    configEndpoint: 'https://asora-function-dev.azurewebsites.net/api/auth/b2c-config',
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
