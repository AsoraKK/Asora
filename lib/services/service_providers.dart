/// ASORA SERVICE PROVIDERS
///
/// 🎯 Purpose: Riverpod providers for dependency injection
/// 🔄 Integration: Azure Functions backend services
/// 📡 Network: Secure HTTP clients with proper configuration
/// 🏗️ Architecture: Clean service layer architecture
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/dio_client.dart';
import 'auth_service.dart';
import 'post_service.dart';
import 'moderation_service.dart';

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
