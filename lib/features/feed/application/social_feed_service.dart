library social_feed_service;

/// ASORA SOCIAL FEED SERVICE
///
/// 🎯 Purpose: Implementation of social feed repository interface
/// 🏗️ Architecture: Application layer - implements domain contracts
/// 🔐 Dependency Rule: Depends on domain interfaces, implements concrete behavior
/// 📱 Platform: Flutter with Dio HTTP client

import 'package:dio/dio.dart';
import '../domain/social_feed_repository.dart';
import '../domain/models.dart';
import '../../../core/observability/asora_tracer.dart';

/// Concrete implementation of [SocialFeedRepository]
///
/// This service handles HTTP communication for social media feed operations:
/// - Converting API responses to domain models
/// - Handling pagination and caching
/// - Managing AI moderation data integration
/// - Throwing domain exceptions on failures
class SocialFeedService implements SocialFeedRepository {
  final Dio _dio;
  final String _baseUrl;

  SocialFeedService(this._dio, {String baseUrl = 'http://localhost:7072/api'})
    : _baseUrl = baseUrl;

  Future<FeedResponse> _fetchCursorFeed({
    required String operation,
    required String urlPath,
    int limit = 25,
    String? cursor,
    String? token,
    Map<String, dynamic>? extraQuery,
  }) async {
    return AsoraTracer.traceOperation(
      'SocialFeedService.$operation',
      () async {
        final queryParameters = <String, dynamic>{
          'limit': limit,
          if (cursor != null) 'cursor': cursor,
          if (extraQuery != null) ...extraQuery,
        };

        final response = await _dio.get(
          '$_baseUrl$urlPath',
          queryParameters: queryParameters,
          options: Options(
            headers: token != null ? {'Authorization': 'Bearer $token'} : null,
          ),
        );

        final data = response.data;
        if (data == null || data is! Map<String, dynamic>) {
          throw const SocialFeedException(
            'Invalid feed response',
            code: 'INVALID_RESPONSE',
          );
        }

        final rawItems = data['items'];
        final posts =
            (rawItems as List<dynamic>?)
                ?.whereType<Map<String, dynamic>>()
                .map(Post.fromJson)
                .toList() ??
            [];

        return FeedResponse.fromCursor(
          posts: posts,
          nextCursor: data['nextCursor'] as String?,
          limit: limit,
        );
      },
      attributes: () {
        final attrs =
            AsoraTracer.httpRequestAttributes(
              method: 'GET',
              url: '/api$urlPath',
            )..addAll({
              'request.limit': limit,
              'request.cursor_present': cursor != null,
              'request.has_token': token != null,
            });
        if (extraQuery != null && extraQuery.isNotEmpty) {
          attrs['request.extra_params'] = extraQuery.keys.join(',');
        }
        return attrs;
      }(),
      onError: (error) => _handleError(error),
    );
  }

  @override
  Future<FeedResponse> getDiscoverFeed({
    String? cursor,
    int limit = 25,
    String? token,
  }) {
    return _fetchCursorFeed(
      operation: 'getDiscoverFeed',
      urlPath: '/feed/discover',
      cursor: cursor,
      limit: limit,
      token: token,
    );
  }

  @override
  Future<FeedResponse> getNewsFeed({
    String? cursor,
    int limit = 25,
    String? token,
  }) {
    return _fetchCursorFeed(
      operation: 'getNewsFeed',
      urlPath: '/feed/news',
      cursor: cursor,
      limit: limit,
      token: token,
    );
  }

  @override
  Future<FeedResponse> getUserFeed({
    required String userId,
    String? cursor,
    int limit = 25,
    String? token,
    bool includeReplies = false,
  }) {
    final extra = includeReplies ? {'includeReplies': 'true'} : null;
    return _fetchCursorFeed(
      operation: 'getUserFeed',
      urlPath: '/feed/user/$userId',
      cursor: cursor,
      limit: limit,
      token: token,
      extraQuery: extra,
    );
  }

  @override
  Future<FeedResponse> getFeed({
    required FeedParams params,
    String? token,
  }) async {
    return AsoraTracer.traceOperation(
      'SocialFeedService.getFeed',
      () async {
        final response = await _dio.get(
          '$_baseUrl/feed/get',
          queryParameters: params.toJson(),
          options: Options(
            headers: token != null ? {'Authorization': 'Bearer $token'} : null,
          ),
        );

        if (response.data['success'] == true) {
          return FeedResponse.fromJson(response.data['data']);
        } else {
          throw SocialFeedException(
            response.data['message'] ?? 'Failed to load feed',
            code: 'LOAD_FEED_FAILED',
          );
        }
      },
      attributes:
          AsoraTracer.httpRequestAttributes(method: 'GET', url: '/api/feed/get')
            ..addAll({
              'request.page': params.page,
              'request.page_size': params.pageSize,
              'request.feed_type': params.type.name,
              'request.has_token': token != null,
            }),
      onError: (error) => _handleError(error),
    );
  }

  @override
  Future<FeedResponse> getTrendingFeed({
    int page = 1,
    int pageSize = 20,
    String? token,
  }) async {
    return AsoraTracer.traceOperation(
      'SocialFeedService.getTrendingFeed',
      () async {
        final response = await _dio.get(
          '$_baseUrl/feed/trending',
          queryParameters: {'page': page, 'pageSize': pageSize},
          options: Options(
            headers: token != null ? {'Authorization': 'Bearer $token'} : null,
          ),
        );

        return _handleFeedResponse(response);
      },
      attributes: AsoraTracer.httpRequestAttributes(
        method: 'GET',
        url: '/api/feed/trending',
      )..addAll({'request.page': page, 'request.page_size': pageSize}),
      onError: (error) => _handleError(error),
    );
  }

  @override
  Future<FeedResponse> getLocalFeed({
    required String location,
    double? radius,
    int page = 1,
    int pageSize = 20,
    String? token,
  }) async {
    return AsoraTracer.traceOperation(
      'SocialFeedService.getLocalFeed',
      () async {
        final queryParams = <String, Object>{
          'location': location,
          'page': page,
          'pageSize': pageSize,
          if (radius != null) 'radius': radius,
        };

        final response = await _dio.get(
          '$_baseUrl/feed/local',
          queryParameters: queryParams,
          options: Options(
            headers: token != null ? {'Authorization': 'Bearer $token'} : null,
          ),
        );

        return _handleFeedResponse(response);
      },
      attributes:
          AsoraTracer.httpRequestAttributes(
            method: 'GET',
            url: '/api/feed/local',
          )..addAll({
            'request.location': location,
            'request.radius': radius?.toString() ?? 'null',
            'request.page': page,
            'request.page_size': pageSize,
          }),
      onError: (error) => _handleError(error),
    );
  }

  @override
  Future<FeedResponse> getNewCreatorsFeed({
    int page = 1,
    int pageSize = 20,
    String? token,
  }) async {
    return AsoraTracer.traceOperation(
      'SocialFeedService.getNewCreatorsFeed',
      () async {
        final response = await _dio.get(
          '$_baseUrl/feed/new-creators',
          queryParameters: {'page': page, 'pageSize': pageSize},
          options: Options(
            headers: token != null ? {'Authorization': 'Bearer $token'} : null,
          ),
        );

        return _handleFeedResponse(response);
      },
      attributes: AsoraTracer.httpRequestAttributes(
        method: 'GET',
        url: '/api/feed/new-creators',
      )..addAll({'request.page': page, 'request.page_size': pageSize}),
      onError: (error) => _handleError(error),
    );
  }

  @override
  Future<FeedResponse> getFollowingFeed({
    int page = 1,
    int pageSize = 20,
    required String token,
  }) async {
    return AsoraTracer.traceOperation(
      'SocialFeedService.getFollowingFeed',
      () async {
        final response = await _dio.get(
          '$_baseUrl/feed/following',
          queryParameters: {'page': page, 'pageSize': pageSize},
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );

        return _handleFeedResponse(response);
      },
      attributes: AsoraTracer.httpRequestAttributes(
        method: 'GET',
        url: '/api/feed/following',
      )..addAll({'request.page': page, 'request.page_size': pageSize}),
      onError: (error) => _handleError(error),
    );
  }

  @override
  Future<Post> getPost({required String postId, String? token}) async {
    return AsoraTracer.traceOperation(
      'SocialFeedService.getPost',
      () async {
        final response = await _dio.get(
          '$_baseUrl/posts/$postId',
          options: Options(
            headers: token != null ? {'Authorization': 'Bearer $token'} : null,
          ),
        );

        if (response.data['success'] == true) {
          return Post.fromJson(response.data['post']);
        } else {
          throw SocialFeedException(
            response.data['message'] ?? 'Post not found',
            code: 'POST_NOT_FOUND',
          );
        }
      },
      attributes:
          AsoraTracer.httpRequestAttributes(
            method: 'GET',
            url: '/api/posts/$postId',
          )..addAll({
            'request.post_id': postId,
            'request.has_token': token != null,
          }),
      onError: (error) => _handleError(error),
    );
  }

  @override
  Future<Post> likePost({
    required String postId,
    required bool isLike,
    required String token,
  }) async {
    return AsoraTracer.traceOperation(
      'SocialFeedService.likePost',
      () async {
        final response = await _dio.post(
          '$_baseUrl/posts/$postId/like',
          data: {'action': isLike ? 'like' : 'unlike'},
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );

        if (response.data['success'] == true) {
          return Post.fromJson(response.data['post']);
        } else {
          throw SocialFeedException(
            response.data['message'] ?? 'Failed to update like',
            code: 'LIKE_FAILED',
          );
        }
      },
      attributes:
          AsoraTracer.httpRequestAttributes(
            method: 'POST',
            url: '/api/posts/$postId/like',
          )..addAll({
            'request.post_id': postId,
            'request.action': isLike ? 'like' : 'unlike',
          }),
      onError: (error) => _handleError(error),
    );
  }

  @override
  Future<Post> dislikePost({
    required String postId,
    required bool isDislike,
    required String token,
  }) async {
    return AsoraTracer.traceOperation(
      'SocialFeedService.dislikePost',
      () async {
        final response = await _dio.post(
          '$_baseUrl/posts/$postId/dislike',
          data: {'action': isDislike ? 'dislike' : 'remove_dislike'},
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );

        if (response.data['success'] == true) {
          return Post.fromJson(response.data['post']);
        } else {
          throw SocialFeedException(
            response.data['message'] ?? 'Failed to update dislike',
            code: 'DISLIKE_FAILED',
          );
        }
      },
      attributes:
          AsoraTracer.httpRequestAttributes(
            method: 'POST',
            url: '/api/posts/$postId/dislike',
          )..addAll({
            'request.post_id': postId,
            'request.action': isDislike ? 'dislike' : 'remove_dislike',
          }),
      onError: (error) => _handleError(error),
    );
  }

  @override
  Future<List<Comment>> getComments({
    required String postId,
    int page = 1,
    int pageSize = 50,
    String? token,
  }) async {
    return AsoraTracer.traceOperation(
      'SocialFeedService.getComments',
      () async {
        final response = await _dio.get(
          '$_baseUrl/posts/$postId/comments',
          queryParameters: {'page': page, 'pageSize': pageSize},
          options: Options(
            headers: token != null ? {'Authorization': 'Bearer $token'} : null,
          ),
        );

        if (response.data['success'] == true) {
          return (response.data['comments'] as List)
              .map((comment) => Comment.fromJson(comment))
              .toList();
        } else {
          throw SocialFeedException(
            response.data['message'] ?? 'Failed to load comments',
            code: 'LOAD_COMMENTS_FAILED',
          );
        }
      },
      attributes:
          AsoraTracer.httpRequestAttributes(
            method: 'GET',
            url: '/api/posts/$postId/comments',
          )..addAll({
            'request.post_id': postId,
            'request.page': page,
            'request.page_size': pageSize,
          }),
      onError: (error) => _handleError(error),
    );
  }

  @override
  Future<void> flagPost({
    required String postId,
    required String reason,
    String? details,
    required String token,
  }) async {
    return AsoraTracer.traceOperation(
      'SocialFeedService.flagPost',
      () async {
        final response = await _dio.post(
          '$_baseUrl/posts/$postId/flag',
          data: {'reason': reason, if (details != null) 'details': details},
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );

        if (response.data['success'] != true) {
          throw SocialFeedException(
            response.data['message'] ?? 'Failed to flag post',
            code: 'FLAG_FAILED',
          );
        }
      },
      attributes:
          AsoraTracer.httpRequestAttributes(
            method: 'POST',
            url: '/api/posts/$postId/flag',
          )..addAll({
            'request.post_id': postId,
            'request.reason': reason,
            'request.has_details': details != null,
          }),
      onError: (error) => _handleError(error),
    );
  }

  /// Helper method to handle feed response parsing
  FeedResponse _handleFeedResponse(Response response) {
    if (response.data['success'] == true) {
      return FeedResponse.fromJson(response.data['data']);
    } else {
      throw SocialFeedException(
        response.data['message'] ?? 'Failed to load feed',
        code: 'LOAD_FEED_FAILED',
      );
    }
  }

  /// Helper method to handle and convert errors
  Never _handleError(dynamic error) {
    if (error is DioException) {
      throw SocialFeedException(
        'Network error: ${error.message}',
        code: 'NETWORK_ERROR',
        originalError: error,
      );
    }
    throw SocialFeedException(
      'Unexpected error: $error',
      code: 'UNKNOWN_ERROR',
      originalError: error,
    );
  }
}
