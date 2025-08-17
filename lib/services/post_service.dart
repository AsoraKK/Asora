/// ASORA POST SERVICE
///
/// 🎯 Purpose: HTTP client for post management API calls
/// 📡 Endpoints: create, delete, getFeed integrated with Azure Functions
/// 🔐 Authentication: Bearer token from secure storage
/// 📱 Platform: Flutter with Dio HTTP client
library;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../core/observability/asora_tracer.dart';
import '../features/auth/domain/user_models.dart';
import '../core/network/response_models.dart';

/// Post management service for Azure Functions integration
class PostService {
  final Dio _dio;

  PostService(this._dio);

  /// Create a new post with AI moderation
  Future<PostCreateResponse> createPost({
    required String text,
    String? mediaUrl,
    required String token,
  }) async {
    return AsoraTracer.traceOperation(
      'PostService.createPost',
      () async {
        final response = await _dio.post(
          '/api/posts',
          data: {'text': text, if (mediaUrl != null) 'mediaUrl': mediaUrl},
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );

        if (response.statusCode == 201) {
          debugPrint('✅ Post created successfully: ${response.data['postId']}');
          return PostCreateResponse.fromJson(response.data);
        } else {
          throw DioException(
            requestOptions: response.requestOptions,
            response: response,
            message: 'Failed to create post: ${response.data}',
          );
        }
      },
      attributes:
          AsoraTracer.httpRequestAttributes(method: 'POST', url: '/api/posts')
            ..addAll({
              'request.text_length': text.length,
              'request.has_media': mediaUrl != null,
            }),
    );
  }

  /// Delete a post (user can delete own posts, admins can delete any)
  Future<Map<String, dynamic>> deletePost({
    required String postId,
    required String token,
  }) async {
    return AsoraTracer.traceOperation(
      'PostService.deletePost',
      () async {
        final response = await _dio.delete(
          '/api/posts/$postId',
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );

        if (response.statusCode == 200 && response.data['success'] == true) {
          debugPrint('✅ Post deleted successfully: $postId');
          return response.data;
        } else {
          throw DioException(
            requestOptions: response.requestOptions,
            response: response,
            message: 'Failed to delete post: ${response.data}',
          );
        }
      },
      attributes: AsoraTracer.httpRequestAttributes(
        method: 'DELETE',
        url: '/api/posts/$postId',
      )..addAll({'request.post_id': postId}),
    );
  }

  /// Get feed with cursor-based pagination (Azure Functions format)
  Future<FeedResponse> getFeed({
    int limit = 20,
    String? cursor,
    String? token, // Optional for public feed
  }) async {
    return AsoraTracer.traceOperation(
      'PostService.getFeed',
      () async {
        final queryParams = <String, dynamic>{
          'limit': limit,
          if (cursor != null) 'cursor': cursor,
        };

        final response = await _dio.get(
          '/api/feed',
          queryParameters: queryParams,
          options: Options(
            headers: {if (token != null) 'Authorization': 'Bearer $token'},
          ),
        );

        if (response.statusCode == 200) {
          debugPrint(
            '✅ Feed fetched successfully: ${response.data['feed']?.length ?? 0} posts',
          );
          return FeedResponse.fromJson(response.data);
        } else {
          throw DioException(
            requestOptions: response.requestOptions,
            response: response,
            message: 'Failed to fetch feed: ${response.data}',
          );
        }
      },
      attributes:
          AsoraTracer.httpRequestAttributes(method: 'GET', url: '/api/feed')
            ..addAll({
              'request.limit': limit,
              'request.has_cursor': cursor != null,
              'request.authenticated': token != null,
            }),
    );
  }

  /// Get user profile with statistics
  Future<UserProfileResponse> getUserProfile({
    String? userId, // If null, gets own profile
    required String token,
  }) async {
    return AsoraTracer.traceOperation(
      'PostService.getUserProfile',
      () async {
        final url = userId != null ? '/api/user/$userId' : '/api/user';

        final response = await _dio.get(
          url,
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );

        if (response.statusCode == 200) {
          debugPrint(
            '✅ User profile fetched successfully: ${response.data['user']['id']}',
          );
          return UserProfileResponse.fromJson(response.data);
        } else {
          throw DioException(
            requestOptions: response.requestOptions,
            response: response,
            message: 'Failed to fetch user profile: ${response.data}',
          );
        }
      },
      attributes:
          AsoraTracer.httpRequestAttributes(
            method: 'GET',
            url: userId != null ? '/api/user/$userId' : '/api/user',
          )..addAll({
            'request.is_own_profile': userId == null,
            'request.target_user_id': userId ?? 'self',
          }),
    );
  }

  /// Check health of the Azure Functions backend
  Future<Map<String, dynamic>> checkHealth() async {
    return AsoraTracer.traceOperation(
      'PostService.checkHealth',
      () async {
        final response = await _dio.get('/api/health');

        if (response.statusCode == 200) {
          debugPrint('✅ Backend health check successful');
          return response.data;
        } else {
          throw DioException(
            requestOptions: response.requestOptions,
            response: response,
            message: 'Health check failed: ${response.data}',
          );
        }
      },
      attributes: AsoraTracer.httpRequestAttributes(
        method: 'GET',
        url: '/api/health',
      ),
    );
  }
}
