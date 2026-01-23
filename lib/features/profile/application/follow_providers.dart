// ignore_for_file: public_member_api_docs

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/core/network/dio_client.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/profile/application/follow_service.dart';

final followServiceProvider = Provider<FollowService>((ref) {
  return FollowService(ref.watch(secureDioProvider));
});

final followStatusProvider = FutureProvider.autoDispose
    .family<FollowStatus, String>((ref, userId) async {
      final token = await ref.watch(jwtProvider.future);
      if (token == null || token.isEmpty) {
        throw Exception('Authentication required');
      }
      final service = ref.watch(followServiceProvider);
      return service.getStatus(targetUserId: userId, accessToken: token);
    });
