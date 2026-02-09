import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/core/network/dio_client.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/profile/domain/public_user.dart';
import 'package:asora/features/profile/domain/trust_passport.dart';

/// Provider that fetches a public profile via `/api/users/{id}`.
final publicUserProvider = FutureProvider.autoDispose
    .family<PublicUser, String>((ref, userId) async {
      final dio = ref.watch(secureDioProvider);
      final token = await ref.watch(jwtProvider.future);

      if (token == null || token.isEmpty) {
        throw Exception('Authentication required to view profile');
      }

      final response = await dio.get<Map<String, dynamic>>(
        '/api/users/$userId',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      final data = response.data;
      if (data == null) {
        throw Exception('Invalid profile response');
      }
      final userJson = data['user'];
      if (userJson is! Map) {
        throw Exception('Invalid profile response');
      }
      return PublicUser.fromJson(Map<String, dynamic>.from(userJson));
    });

final trustPassportProvider = FutureProvider.autoDispose
    .family<TrustPassport, String>((ref, userId) async {
      final dio = ref.watch(secureDioProvider);
      final token = await ref.watch(jwtProvider.future);

      if (token == null || token.isEmpty) {
        throw Exception('Authentication required to view trust passport');
      }

      final response = await dio.get<Map<String, dynamic>>(
        '/api/users/$userId/trust-passport',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      final data = response.data;
      if (data == null) {
        throw Exception('Invalid trust passport response');
      }

      final payload = data['data'];
      if (payload is Map<String, dynamic>) {
        return TrustPassport.fromJson(payload);
      }
      if (payload is Map) {
        return TrustPassport.fromJson(Map<String, dynamic>.from(payload));
      }
      return TrustPassport.fromJson(data);
    });
