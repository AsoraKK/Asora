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

/// **Core HTTP Client Provider**
///
/// Centralized Dio instance with Azure Functions configuration
/// Used by all repository implementations for consistency
final httpClientProvider = Provider<Dio>((ref) {
  return Dio(
    BaseOptions(
      baseUrl: const String.fromEnvironment(
        'AZURE_FUNCTION_URL',
        defaultValue:
            'https://your-secure-azure-function-app.azurewebsites.net',
      ),
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );
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
