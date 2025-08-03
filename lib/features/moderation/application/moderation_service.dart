/// ASORA MODERATION SERVICE
///
/// 🎯 Purpose: Implementation of moderation repository interface
/// 🏗️ Architecture: Application layer - implements domain contracts
/// 🔐 Dependency Rule: Depends on domain interfaces, implements concrete behavior
/// 📱 Platform: Flutter with Dio HTTP client
library;

import 'package:dio/dio.dart';
import '../domain/moderation_repository.dart';
import '../domain/appeal.dart';

/// Concrete implementation of [ModerationRepository]
///
/// This service implements the repository pattern by:
/// - Depending on domain interfaces (implements ModerationRepository)
/// - Handling HTTP communication and data mapping
/// - Converting API responses to domain models
/// - Throwing domain exceptions on failures
class ModerationService implements ModerationRepository {
  final Dio _dio;

  ModerationService(this._dio);

  @override
  Future<List<Appeal>> getMyAppeals({required String token}) async {
    try {
      final response = await _dio.get(
        '/api/getMyAppeals',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.data['success'] == true &&
          response.data['appeals'] != null) {
        return (response.data['appeals'] as List)
            .map((data) => Appeal.fromJson(data))
            .toList();
      } else {
        throw ModerationException(
          response.data['message'] ?? 'Failed to load appeals',
          code: 'LOAD_APPEALS_FAILED',
        );
      }
    } on DioException catch (e) {
      throw ModerationException(
        'Network error: ${e.message}',
        code: 'NETWORK_ERROR',
        originalError: e,
      );
    } catch (e) {
      throw ModerationException(
        'Unexpected error: $e',
        code: 'UNKNOWN_ERROR',
        originalError: e,
      );
    }
  }

  @override
  Future<Appeal> submitAppeal({
    required String contentId,
    required String contentType,
    required String appealType,
    required String appealReason,
    required String userStatement,
    required String token,
  }) async {
    try {
      final response = await _dio.post(
        '/api/appealContent',
        data: {
          'contentId': contentId,
          'contentType': contentType,
          'appealType': appealType,
          'appealReason': appealReason,
          'userStatement': userStatement,
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.data['success'] == true && response.data['appeal'] != null) {
        return Appeal.fromJson(response.data['appeal']);
      } else {
        throw ModerationException(
          response.data['message'] ?? 'Failed to submit appeal',
          code: 'SUBMIT_APPEAL_FAILED',
        );
      }
    } on DioException catch (e) {
      throw ModerationException(
        'Network error: ${e.message}',
        code: 'NETWORK_ERROR',
        originalError: e,
      );
    } catch (e) {
      throw ModerationException(
        'Unexpected error: $e',
        code: 'UNKNOWN_ERROR',
        originalError: e,
      );
    }
  }

  @override
  Future<Map<String, dynamic>> flagContent({
    required String contentId,
    required String contentType,
    required String reason,
    String? additionalDetails,
    required String token,
  }) async {
    try {
      final response = await _dio.post(
        '/api/flag',
        data: {
          'contentId': contentId,
          'contentType': contentType,
          'reason': reason,
          if (additionalDetails != null) 'details': additionalDetails,
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      return response.data;
    } on DioException catch (e) {
      throw ModerationException(
        'Network error: ${e.message}',
        code: 'NETWORK_ERROR',
        originalError: e,
      );
    } catch (e) {
      throw ModerationException(
        'Unexpected error: $e',
        code: 'UNKNOWN_ERROR',
        originalError: e,
      );
    }
  }

  @override
  Future<VoteResult> submitVote({
    required String appealId,
    required String vote,
    String? comment,
    required String token,
  }) async {
    try {
      final response = await _dio.post(
        '/api/voteOnAppeal',
        data: {
          'appealId': appealId,
          'vote': vote,
          if (comment != null) 'comment': comment,
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      return VoteResult.fromJson(response.data);
    } on DioException catch (e) {
      throw ModerationException(
        'Network error: ${e.message}',
        code: 'NETWORK_ERROR',
        originalError: e,
      );
    } catch (e) {
      throw ModerationException(
        'Unexpected error: $e',
        code: 'UNKNOWN_ERROR',
        originalError: e,
      );
    }
  }

  @override
  Future<AppealResponse> getVotingFeed({
    int page = 1,
    int pageSize = 20,
    AppealFilters? filters,
    required String token,
  }) async {
    try {
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
        throw ModerationException(
          response.data['message'] ?? 'Failed to load voting feed',
          code: 'LOAD_FEED_FAILED',
        );
      }
    } on DioException catch (e) {
      throw ModerationException(
        'Network error: ${e.message}',
        code: 'NETWORK_ERROR',
        originalError: e,
      );
    } catch (e) {
      throw ModerationException(
        'Unexpected error: $e',
        code: 'UNKNOWN_ERROR',
        originalError: e,
      );
    }
  }
}
