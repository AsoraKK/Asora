import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/observability/asora_tracer.dart';

/// ASORA MODERATION CLIENT
///
/// 🎯 Purpose: HTTP client for moderation API calls
/// 📡 Endpoints: flag, appeal, vote, getMyAppeals, reviewAppealedContent
/// 🔐 Authentication: Bearer token from jwtProvider
/// 📱 Platform: Flutter with Riverpod state management

class ModerationClient {
  final Dio _dio;

  ModerationClient(this._dio);

  // Flag content (posts, comments, users)
  Future<Map<String, dynamic>> flagContent({
    required String contentId,
    required String contentType, // 'post', 'comment', 'user'
    required String reason,
    String? additionalDetails,
    required String token,
  }) async {
    return AsoraTracer.traceOperation(
      'ModerationService.flagContent',
      () async {
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
      },
      attributes:
          AsoraTracer.httpRequestAttributes(method: 'POST', url: '/api/flag')
            ..addAll({
              'request.content_id': contentId,
              'request.content_type': contentType,
              'request.reason': reason,
              'request.has_additional_details': additionalDetails != null,
            }),
    );
  }

  // Appeal flagged content
  Future<Map<String, dynamic>> appealContent({
    required String contentId,
    required String contentType,
    required String appealType, // 'false_positive', 'context_missing', 'other'
    required String appealReason,
    required String userStatement,
    required String token,
  }) async {
    return AsoraTracer.traceOperation(
      'ModerationService.appealContent',
      () async {
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

        return response.data;
      },
      attributes:
          AsoraTracer.httpRequestAttributes(
            method: 'POST',
            url: '/api/appealContent',
          )..addAll({
            'request.content_id': contentId,
            'request.content_type': contentType,
            'request.appeal_type': appealType,
            'request.appeal_reason': appealReason,
            'request.user_statement_length': userStatement.length,
          }),
    );
  }

  // Get user's own appeals
  Future<Map<String, dynamic>> getMyAppeals({
    required String token,
    int page = 1,
    int pageSize = 20,
    String? status,
    String? contentType,
    String? reviewQueue,
  }) async {
    return AsoraTracer.traceOperation(
      'ModerationService.getMyAppeals',
      () async {
        final queryParams = <String, dynamic>{
          'page': page,
          'pageSize': pageSize,
          if (status != null) 'status': status,
          if (contentType != null) 'contentType': contentType,
          if (reviewQueue != null) 'reviewQueue': reviewQueue,
        };

        final response = await _dio.get(
          '/api/getMyAppeals',
          queryParameters: queryParams,
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );

        return response.data;
      },
      attributes:
          AsoraTracer.httpRequestAttributes(
            method: 'GET',
            url: '/api/getMyAppeals',
          )..addAll({
            'request.page': page,
            'request.page_size': pageSize,
            if (status != null) 'request.status_filter': status,
            if (contentType != null) 'request.content_type_filter': contentType,
            if (reviewQueue != null) 'request.review_queue_filter': reviewQueue,
          }),
    );
  }

  // Get community appeals to vote on
  Future<Map<String, dynamic>> getAppealedContent({
    required String token,
    int page = 1,
    int pageSize = 20,
    String? contentType,
    String sortBy = 'urgency',
  }) async {
    return AsoraTracer.traceOperation(
      'ModerationService.getAppealedContent',
      () async {
        final response = await _dio.get(
          '/api/reviewAppealedContent',
          queryParameters: {
            'page': page,
            'pageSize': pageSize,
            if (contentType != null) 'contentType': contentType,
            'sortBy': sortBy,
          },
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );

        return response.data;
      },
      attributes:
          AsoraTracer.httpRequestAttributes(
            method: 'GET',
            url: '/api/reviewAppealedContent',
          )..addAll({
            'request.page': page,
            'request.page_size': pageSize,
            'request.sort_by': sortBy,
            if (contentType != null) 'request.content_type_filter': contentType,
          }),
    );
  }

  // Vote on community appeal
  Future<Map<String, dynamic>> voteOnAppeal({
    required String appealId,
    required String vote, // 'approve' or 'reject'
    String? comment,
    required String token,
  }) async {
    return AsoraTracer.traceOperation(
      'ModerationService.voteOnAppeal',
      () async {
        final response = await _dio.post(
          '/api/voteOnAppeal',
          data: {
            'appealId': appealId,
            'vote': vote,
            if (comment != null) 'comment': comment,
          },
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );

        return response.data;
      },
      attributes:
          AsoraTracer.httpRequestAttributes(
            method: 'POST',
            url: '/api/voteOnAppeal',
          )..addAll({
            'request.appeal_id': appealId,
            'request.vote': vote,
            'request.has_comment': comment != null,
            if (comment != null) 'request.comment_length': comment.length,
          }),
    );
  }

  // Helper method to get appeals for voting with proper typing
  Future<Map<String, dynamic>> getAppealsForVoting({
    required String token,
    int page = 1,
    int pageSize = 20,
    String? contentType,
    String? urgency,
    String? category,
    String sortBy = 'urgency',
    String sortOrder = 'desc',
  }) async {
    final response = await getAppealedContent(
      token: token,
      page: page,
      pageSize: pageSize,
      contentType: contentType,
      sortBy: sortBy,
    );

    return response;
  }

  // Helper method to submit vote with proper typing
  Future<Map<String, dynamic>> submitVote({
    required String appealId,
    required String vote,
    String? comment,
    required String token,
  }) async {
    try {
      final response = await voteOnAppeal(
        appealId: appealId,
        vote: vote,
        comment: comment,
        token: token,
      );

      return {
        'success': response['success'] ?? true,
        'message': response['message'],
        'tallyTriggered': response['tallyTriggered'] ?? false,
        'updatedProgress': response['updatedProgress'],
      };
    } catch (error) {
      return {
        'success': false,
        'tallyTriggered': false,
        'message': 'Failed to submit vote: ${error.toString()}',
      };
    }
  }
}

// Provider for moderation client
final moderationClientProvider = Provider<ModerationClient>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: const String.fromEnvironment(
        'AZURE_FUNCTION_URL',
        defaultValue:
            'https://your-secure-azure-function-app.azurewebsites.net',
      ), // SECURITY: Use environment variable for production URL
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ),
  );

  return ModerationClient(dio);
});

// Moderation state models
class FlagResult {
  final bool success;
  final String? message;
  final String? flagId;

  const FlagResult({required this.success, this.message, this.flagId});
}

class AppealResult {
  final bool success;
  final String? message;
  final String? appealId;

  const AppealResult({required this.success, this.message, this.appealId});
}

class VoteResult {
  final bool success;
  final String? message;
  final bool? tallyTriggered;

  const VoteResult({required this.success, this.message, this.tallyTriggered});
}

// Appeal status enum
enum AppealStatus { pending, underReview, resolved, expired }

// Content moderation status
enum ModerationStatus {
  clean,
  flagged,
  hidden,
  communityApproved,
  communityRejected,
  underReview,
}

// Voting progress model
class VotingProgress {
  final int totalVotes;
  final int approveVotes;
  final int rejectVotes;
  final double approvalRate;
  final bool quorumMet;
  final String? timeRemaining;
  final String? estimatedResolution;

  const VotingProgress({
    required this.totalVotes,
    required this.approveVotes,
    required this.rejectVotes,
    required this.approvalRate,
    required this.quorumMet,
    this.timeRemaining,
    this.estimatedResolution,
  });

  factory VotingProgress.fromJson(Map<String, dynamic> json) {
    return VotingProgress(
      totalVotes: json['totalVotes'] ?? 0,
      approveVotes: json['approveVotes'] ?? 0,
      rejectVotes: json['rejectVotes'] ?? 0,
      approvalRate: (json['approvalRate'] ?? 0.0).toDouble(),
      quorumMet: json['quorumMet'] ?? false,
      timeRemaining: json['timeRemaining'],
      estimatedResolution: json['estimatedResolution'],
    );
  }
}

// Appeal history item model
class AppealHistoryItem {
  final String appealId;
  final String contentId;
  final String contentType;
  final String? contentTitle;
  final String appealType;
  final AppealStatus status;
  final String reviewQueue;
  final String? outcome;

  final DateTime submittedAt;
  final DateTime? resolvedAt;
  final DateTime expiresAt;

  final String appealReason;
  final String userStatement;

  final VotingProgress? votingProgress;
  final Map<String, dynamic>? resolutionDetails;

  final bool canAppeal;
  final bool isExpired;
  final bool isUrgent;
  final List<String> nextSteps;

  const AppealHistoryItem({
    required this.appealId,
    required this.contentId,
    required this.contentType,
    this.contentTitle,
    required this.appealType,
    required this.status,
    required this.reviewQueue,
    this.outcome,
    required this.submittedAt,
    this.resolvedAt,
    required this.expiresAt,
    required this.appealReason,
    required this.userStatement,
    this.votingProgress,
    this.resolutionDetails,
    required this.canAppeal,
    required this.isExpired,
    required this.isUrgent,
    required this.nextSteps,
  });

  factory AppealHistoryItem.fromJson(Map<String, dynamic> json) {
    return AppealHistoryItem(
      appealId: json['appealId'],
      contentId: json['contentId'],
      contentType: json['contentType'],
      contentTitle: json['contentTitle'],
      appealType: json['appealType'],
      status: AppealStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => AppealStatus.pending,
      ),
      reviewQueue: json['reviewQueue'],
      outcome: json['outcome'],
      submittedAt: DateTime.parse(json['submittedAt']),
      resolvedAt: json['resolvedAt'] != null
          ? DateTime.parse(json['resolvedAt'])
          : null,
      expiresAt: DateTime.parse(json['expiresAt']),
      appealReason: json['appealReason'],
      userStatement: json['userStatement'],
      votingProgress: json['votingProgress'] != null
          ? VotingProgress.fromJson(json['votingProgress'])
          : null,
      resolutionDetails: json['resolutionDetails'],
      canAppeal: json['canAppeal'] ?? false,
      isExpired: json['isExpired'] ?? false,
      isUrgent: json['isUrgent'] ?? false,
      nextSteps: List<String>.from(json['nextSteps'] ?? []),
    );
  }
}
