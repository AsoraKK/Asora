/// ASORA REPOSITORY PROVIDERS
///
/// 🎯 Purpose: Centralized repository providers following Dependency Inversion Principle
/// 🏗️ Architecture: Core layer - provides shared repository abstractions
/// 🔐 Dependency Rule: UI layer → Application layer → Domain layer
/// 📱 Platform: Flutter with Riverpod for dependency injection
library;

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/moderation/domain/moderation_repository.dart';
import '../../features/moderation/application/moderation_service.dart';
import '../../features/feed/domain/feed_repository.dart';
import '../../features/feed/application/feed_service.dart';
import '../security/cert_pinning.dart';

/// **Core HTTP Client Provider**
///
/// Centralized Dio instance with Azure Functions configuration and certificate pinning
/// Used by all repository implementations for consistency
final httpClientProvider = Provider<Dio>((ref) {
  const baseUrl = String.fromEnvironment(
    'AZURE_FUNCTION_URL',
    defaultValue:
        'https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net/api',
  );

  // Create Dio with certificate pinning enabled
  final dio = createPinnedDio(baseUrl: baseUrl);

  // Configure timeouts and headers
  dio.options.connectTimeout = const Duration(seconds: 10);
  dio.options.receiveTimeout = const Duration(seconds: 10);
  dio.options.headers.addAll({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  });

  return dio;
});

/// **Moderation Repository Provider**
///
/// Provides ModerationRepository implementation with proper dependency injection
/// UI components should depend on this, not on concrete services
final moderationRepositoryProvider = Provider<ModerationRepository>((ref) {
  final dio = ref.watch(httpClientProvider);
  return ModerationService(dio);
});

/// **Feed Repository Provider**
///
/// Provides FeedRepository implementation with proper dependency injection
/// UI components should depend on this, not on concrete services
final feedRepositoryProvider = Provider<FeedRepository>((ref) {
  final dio = ref.watch(httpClientProvider);
  return FeedService(dio);
});
