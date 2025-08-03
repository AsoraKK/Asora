/// ASORA MODERATION REPOSITORY
///
/// 🎯 Purpose: Abstract interface for moderation operations
/// 🏗️ Architecture: Domain layer - defines business contracts
/// 🔐 Dependency Rule: Application layer implements this interface
/// 📱 Platform: Flutter with Clean Architecture compliance
library;

import 'appeal.dart';

/// Abstract repository defining moderation domain operations
///
/// This interface follows the Dependency Inversion Principle:
/// - Domain layer defines WHAT operations are needed
/// - Application layer implements HOW they work
/// - UI layer uses providers that depend on this interface
abstract class ModerationRepository {
  /// Retrieve user's appeal submissions
  ///
  /// Returns a list of appeals submitted by the authenticated user
  /// Throws [ModerationException] if user is not authenticated or request fails
  Future<List<Appeal>> getMyAppeals({required String token});

  /// Submit a new appeal for flagged content
  ///
  /// [contentId] - ID of the flagged content
  /// [contentType] - Type of content ('post', 'comment', 'user')
  /// [appealType] - Type of appeal ('false_positive', 'context_missing', 'other')
  /// [appealReason] - Brief reason for the appeal
  /// [userStatement] - Detailed user statement
  /// [token] - User authentication token
  ///
  /// Returns the created [Appeal] object
  /// Throws [ModerationException] on validation or submission failure
  Future<Appeal> submitAppeal({
    required String contentId,
    required String contentType,
    required String appealType,
    required String appealReason,
    required String userStatement,
    required String token,
  });

  /// Flag content for moderation review
  ///
  /// [contentId] - ID of the content to flag
  /// [contentType] - Type of content ('post', 'comment', 'user')
  /// [reason] - Reason for flagging
  /// [additionalDetails] - Optional additional context
  /// [token] - User authentication token
  ///
  /// Returns success status and any relevant metadata
  /// Throws [ModerationException] on failure
  Future<Map<String, dynamic>> flagContent({
    required String contentId,
    required String contentType,
    required String reason,
    String? additionalDetails,
    required String token,
  });

  /// Submit a vote on an appeal
  ///
  /// [appealId] - ID of the appeal to vote on
  /// [vote] - Vote decision ('approve' or 'reject')
  /// [comment] - Optional comment explaining the vote
  /// [token] - User authentication token
  ///
  /// Returns voting result with updated progress if available
  /// Throws [ModerationException] on voting failure or ineligibility
  Future<VoteResult> submitVote({
    required String appealId,
    required String vote,
    String? comment,
    required String token,
  });

  /// Get appeals available for community voting
  ///
  /// [page] - Page number for pagination (defaults to 1)
  /// [pageSize] - Number of appeals per page (defaults to 20)
  /// [filters] - Optional filters for content type, urgency, etc.
  /// [token] - User authentication token
  ///
  /// Returns paginated appeal response with voting eligibility
  /// Throws [ModerationException] on request failure
  Future<AppealResponse> getVotingFeed({
    int page = 1,
    int pageSize = 20,
    AppealFilters? filters,
    required String token,
  });
}

/// Domain exception for moderation operations
class ModerationException implements Exception {
  final String message;
  final String? code;
  final dynamic originalError;

  const ModerationException(this.message, {this.code, this.originalError});

  @override
  String toString() => 'ModerationException: $message';
}
