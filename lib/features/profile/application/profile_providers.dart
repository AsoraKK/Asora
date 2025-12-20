import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/application/auth_providers.dart';
import '../domain/public_user.dart';

/// Provider that fetches a public profile via `/api/users/{id}`.
final publicUserProvider = FutureProvider.autoDispose
    .family<PublicUser, String>((ref, userId) async {
      final dio = ref.watch(secureDioProvider);
      final token = await ref.watch(jwtProvider.future);

      if (token == null || token.isEmpty) {
        throw Exception('Authentication required to view profile');
      }

      final response = await dio.get(
        '/api/users/$userId',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      final data = response.data as Map<String, dynamic>;
      final userJson = data['user'] as Map<String, dynamic>;
      return PublicUser.fromJson(userJson);
    });
