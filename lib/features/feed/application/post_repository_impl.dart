/// ASORA POST SERVICE IMPLEMENTATION
///
/// 🎯 Purpose: HTTP client implementation for post repository
/// 🏗️ Architecture: Application layer - implements domain contracts
/// 📡 Endpoints: POST /post, DELETE /posts/{id}, GET /posts/{id}
/// 🔐 Authentication: Bearer token from secure storage
/// 📱 Platform: Flutter with Dio HTTP client
library;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../core/observability/asora_tracer.dart';
import '../domain/post_repository.dart';
import '../domain/models.dart';

/// Post repository implementation using Dio HTTP client
class PostRepositoryImpl implements PostRepository {
  final Dio _dio;

  PostRepositoryImpl(this._dio);

  @override
  Future<CreatePostResult> createPost({
    required CreatePostRequest request,
    required String token,
  }) async {
    return AsoraTracer.traceOperation(
      'PostRepository.createPost',
      () async {
        try {
          final response = await _dio.post(
            '/api/post',
            data: request.toJson(),
            options: Options(headers: {'Authorization': 'Bearer $token'}),
          );

          if (response.statusCode == 201) {
            debugPrint('✅ Post created successfully');
            final data = response.data as Map<String, dynamic>;
            final postData = data['post'] as Map<String, dynamic>;
            return CreatePostSuccess(_parsePost(postData));
          }

          // Shouldn't reach here normally, but handle unexpected success codes
          return CreatePostError(
            message: 'Unexpected response status: ${response.statusCode}',
            code: 'unexpected_status',
          );
        } on DioException catch (e) {
          return _handleDioError(e);
        } catch (e) {
          debugPrint('❌ Post creation failed: $e');
          return CreatePostError(
            message: 'Failed to create post: ${e.toString()}',
            originalError: e,
          );
        }
      },
      attributes:
          AsoraTracer.httpRequestAttributes(method: 'POST', url: '/api/post')
            ..addAll({
              'request.text_length': request.text.length,
              'request.has_media': request.mediaUrl != null,
            }),
    );
  }

  @override
  Future<bool> deletePost({
    required String postId,
    required String token,
  }) async {
    return AsoraTracer.traceOperation(
      'PostRepository.deletePost',
      () async {
        try {
          final response = await _dio.delete(
            '/api/posts/$postId',
            options: Options(headers: {'Authorization': 'Bearer $token'}),
          );

          if (response.statusCode == 200) {
            final data = response.data as Map<String, dynamic>;
            return data['success'] == true;
          }

          throw PostException(
            'Failed to delete post: ${response.statusCode}',
            code: 'delete_failed',
          );
        } on DioException catch (e) {
          final message = _extractErrorMessage(e);
          throw PostException(message, code: 'network_error', originalError: e);
        }
      },
      attributes: AsoraTracer.httpRequestAttributes(
        method: 'DELETE',
        url: '/api/posts/$postId',
      )..addAll({'request.post_id': postId}),
    );
  }

  @override
  Future<Post> getPost({required String postId, String? token}) async {
    return AsoraTracer.traceOperation(
      'PostRepository.getPost',
      () async {
        try {
          final response = await _dio.get(
            '/api/posts/$postId',
            options: Options(
              headers: {if (token != null) 'Authorization': 'Bearer $token'},
            ),
          );

          if (response.statusCode == 200) {
            final data = response.data as Map<String, dynamic>;
            return _parsePost(data['post'] ?? data);
          }

          throw PostException(
            'Failed to fetch post: ${response.statusCode}',
            code: 'fetch_failed',
          );
        } on DioException catch (e) {
          if (e.response?.statusCode == 404) {
            throw const PostException('Post not found', code: 'not_found');
          }
          final message = _extractErrorMessage(e);
          throw PostException(message, code: 'network_error', originalError: e);
        }
      },
      attributes:
          AsoraTracer.httpRequestAttributes(
            method: 'GET',
            url: '/api/posts/$postId',
          )..addAll({
            'request.post_id': postId,
            'request.authenticated': token != null,
          }),
    );
  }

  /// Handle Dio errors and convert to appropriate CreatePostResult
  CreatePostResult _handleDioError(DioException e) {
    final response = e.response;

    if (response == null) {
      return CreatePostError(
        message: 'Network error: ${e.message}',
        code: 'network_error',
        originalError: e,
      );
    }

    final statusCode = response.statusCode;
    final data = response.data;

    // Handle content blocked (422)
    if (statusCode == 422 && data is Map<String, dynamic>) {
      final code = data['code'] as String?;
      if (code == 'content_blocked') {
        debugPrint('⚠️ Post blocked by content moderation');
        return CreatePostBlocked(
          message:
              data['error'] as String? ??
              'Content violates community guidelines',
          categories: List<String>.from(data['categories'] ?? []),
          code: code ?? 'content_blocked',
        );
      }
    }

    // Handle daily limit exceeded (429)
    if (statusCode == 429 && data is Map<String, dynamic>) {
      final code = data['code'] as String?;
      if (code == 'daily_post_limit_reached') {
        debugPrint('⚠️ Daily post limit exceeded');
        final retryAfterStr = response.headers.value('retry-after');
        final retryAfterSeconds =
            int.tryParse(retryAfterStr ?? '86400') ?? 86400;

        return CreatePostLimitExceeded(
          message: data['message'] as String? ?? 'Daily post limit reached',
          limit: data['limit'] as int? ?? 10,
          currentCount: data['current'] as int? ?? 10,
          tier: data['tier'] as String? ?? 'free',
          retryAfter: Duration(seconds: retryAfterSeconds),
        );
      }
    }

    // Handle validation errors (400)
    if (statusCode == 400 && data is Map<String, dynamic>) {
      final error = data['error'] as String? ?? 'Invalid request';
      return CreatePostError(
        message: error,
        code: 'validation_error',
        originalError: e,
      );
    }

    // Handle auth errors (401)
    if (statusCode == 401) {
      return CreatePostError(
        message: 'Authentication required',
        code: 'auth_required',
        originalError: e,
      );
    }

    // Handle forbidden (403)
    if (statusCode == 403) {
      return CreatePostError(
        message: 'You are not allowed to create posts',
        code: 'forbidden',
        originalError: e,
      );
    }

    // Generic error
    final errorMessage = _extractErrorMessage(e);
    return CreatePostError(
      message: errorMessage,
      code: 'api_error',
      originalError: e,
    );
  }

  /// Extract error message from DioException
  String _extractErrorMessage(DioException e) {
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      return data['error'] as String? ??
          data['message'] as String? ??
          'Request failed';
    }
    return e.message ?? 'Request failed';
  }

  /// Parse post from JSON response
  Post _parsePost(Map<String, dynamic> json) {
    // Handle response format from createPost endpoint
    return Post(
      id: json['postId'] as String? ?? json['id'] as String,
      authorId: json['authorId'] as String,
      authorUsername: json['authorUsername'] as String? ?? 'Unknown',
      text: json['text'] as String,
      createdAt: _parseDateTime(json['createdAt']),
      updatedAt: json['updatedAt'] != null
          ? _parseDateTime(json['updatedAt'])
          : null,
      likeCount:
          (json['stats']?['likes'] as int?) ?? (json['likeCount'] as int?) ?? 0,
      dislikeCount:
          (json['stats']?['dislikes'] as int?) ??
          (json['dislikeCount'] as int?) ??
          0,
      commentCount:
          (json['stats']?['comments'] as int?) ??
          (json['commentCount'] as int?) ??
          0,
      mediaUrls: json['mediaUrl'] != null ? [json['mediaUrl'] as String] : null,
      moderation: json['moderation'] != null
          ? PostModerationData.fromJson(
              json['moderation'] as Map<String, dynamic>,
            )
          : null,
    );
  }

  DateTime _parseDateTime(dynamic value) {
    if (value is int) {
      return DateTime.fromMillisecondsSinceEpoch(value);
    }
    if (value is String) {
      return DateTime.parse(value);
    }
    return DateTime.now();
  }
}
