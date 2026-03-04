// ignore_for_file: public_member_api_docs

import 'package:dio/dio.dart';

class FollowStatus {
  final bool following;
  final int followerCount;

  const FollowStatus({required this.following, required this.followerCount});

  factory FollowStatus.fromJson(Map<String, dynamic> json) {
    return FollowStatus(
      following: json['following'] as bool? ?? false,
      followerCount: (json['followerCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class FollowService {
  FollowService(this._dio);

  final Dio _dio;

  Future<FollowStatus> getStatus({
    required String targetUserId,
    required String accessToken,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/api/users/$targetUserId/follow',
      options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
    );
    return FollowStatus.fromJson(response.data ?? const {});
  }

  Future<FollowStatus> follow({
    required String targetUserId,
    required String accessToken,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/users/$targetUserId/follow',
      options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
    );
    return FollowStatus.fromJson(response.data ?? const {});
  }

  Future<FollowStatus> unfollow({
    required String targetUserId,
    required String accessToken,
  }) async {
    final response = await _dio.delete<Map<String, dynamic>>(
      '/api/users/$targetUserId/follow',
      options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
    );
    return FollowStatus.fromJson(response.data ?? const {});
  }
}
