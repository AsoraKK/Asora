// lib/features/auth/auth_providers.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'application/auth_service.dart';

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService();
});
