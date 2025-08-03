/// ASORA FEED SERVICE
///
/// 🎯 Purpose: Implementation of feed repository interface
/// 🏗️ Architecture: Application layer - implements domain contracts
/// 🔐 Dependency Rule: Depends on domain interfaces, implements concrete behavior
/// 📱 Platform: Flutter with Dio HTTP client
library;

import 'package:dio/dio.dart';
import '../domain/feed_repository.dart';
import '../../moderation/domain/appeal.dart';
import '../../../core/observability/asora_tracer.dart';

/// Concrete implementation of [FeedRepository]
///
/// This service implements the repository pattern by:
/// - Depending on domain interfaces (implements FeedRepository)
/// - Handling HTTP communication and data mapping
/// - Converting API responses to domain models
/// - Throwing domain exceptions on failures
class FeedService implements FeedRepository {
  final Dio _dio;

  FeedService(this._dio);

  @override
  Future<AppealResponse> getVotingFeed({
    int page = 1,
    int pageSize = 20,
    AppealFilters? filters,
    required String token,
  }) async {
    return AsoraTracer.traceOperation(
      'FeedService.getVotingFeed',
      () async {
        final queryParams = <String, dynamic>{
          'page': page,
          'pageSize': pageSize,
          if (filters != null) ...filters.toJson(),
        };

        final response = await _dio.get(
          '/api/reviewAppealedContent',
          queryParameters: queryParams,
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );

        if (response.data['success'] == true) {
          return AppealResponse.fromJson(response.data);
        } else {
          throw FeedException(
            response.data['message'] ?? 'Failed to load voting feed',
            code: 'LOAD_FEED_FAILED',
          );
        }
      },
      attributes:
          AsoraTracer.httpRequestAttributes(
            method: 'GET',
            url: '/api/reviewAppealedContent',
          )..addAll({
            'request.page': page,
            'request.page_size': pageSize,
            'request.has_filters': filters != null,
            if (filters != null)
              'request.filter_count': filters.toJson().length,
          }),
      onError: (error) {
        if (error is DioException) {
          throw FeedException(
            'Network error: ${error.message}',
            code: 'NETWORK_ERROR',
            originalError: error,
          );
        }
        throw FeedException(
          'Unexpected error: $error',
          code: 'UNKNOWN_ERROR',
          originalError: error,
        );
      },
    );
  }

  @override
  Future<List<UserVote>> getVotingHistory({
    required String token,
    int page = 1,
    int pageSize = 20,
  }) async {
    return AsoraTracer.traceOperation(
      'FeedService.getVotingHistory',
      () async {
        final response = await _dio.get(
          '/api/getMyVotes',
          queryParameters: {'page': page, 'pageSize': pageSize},
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );

        if (response.data['success'] == true &&
            response.data['votes'] != null) {
          return (response.data['votes'] as List)
              .map((data) => UserVote.fromJson(data))
              .toList();
        } else {
          throw FeedException(
            response.data['message'] ?? 'Failed to load voting history',
            code: 'LOAD_HISTORY_FAILED',
          );
        }
      },
      attributes: AsoraTracer.httpRequestAttributes(
        method: 'GET',
        url: '/api/getMyVotes',
      )..addAll({'request.page': page, 'request.page_size': pageSize}),
      onError: (error) {
        if (error is DioException) {
          throw FeedException(
            'Network error: ${error.message}',
            code: 'NETWORK_ERROR',
            originalError: error,
          );
        }
        throw FeedException(
          'Unexpected error: $error',
          code: 'UNKNOWN_ERROR',
          originalError: error,
        );
      },
    );
  }

  @override
  Future<FeedMetrics> getFeedMetrics({required String token}) async {
    try {
      final response = await _dio.get(
        '/api/getFeedMetrics',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.data['success'] == true &&
          response.data['metrics'] != null) {
        return FeedMetrics.fromJson(response.data['metrics']);
      } else {
        throw FeedException(
          response.data['message'] ?? 'Failed to load feed metrics',
          code: 'LOAD_METRICS_FAILED',
        );
      }
    } on DioException catch (e) {
      throw FeedException(
        'Network error: ${e.message}',
        code: 'NETWORK_ERROR',
        originalError: e,
      );
    } catch (e) {
      throw FeedException(
        'Unexpected error: $e',
        code: 'UNKNOWN_ERROR',
        originalError: e,
      );
    }
  }
}
