/// ASORA FEED REPOSITORY
///
/// 🎯 Purpose: Abstract interface for feed operations
/// 🏗️ Architecture: Domain layer - defines business contracts
/// 🔐 Dependency Rule: Application layer implements this interface
/// 📱 Platform: Flutter with Clean Architecture compliance
library;

import '../../../features/moderation/domain/appeal.dart';

/// Abstract repository defining feed domain operations
///
/// This interface follows the Dependency Inversion Principle:
/// - Domain layer defines WHAT operations are needed
/// - Application layer implements HOW they work
/// - UI layer uses providers that depend on this interface
abstract class FeedRepository {
  /// Get paginated voting feed for community moderation
  ///
  /// [page] - Page number for pagination (defaults to 1)
  /// [pageSize] - Number of appeals per page (defaults to 20)
  /// [filters] - Optional filters for content type, urgency, etc.
  /// [token] - User authentication token
  ///
  /// Returns paginated appeal response with voting eligibility
  /// Throws [FeedException] on request failure
  Future<AppealResponse> getVotingFeed({
    int page = 1,
    int pageSize = 20,
    AppealFilters? filters,
    required String token,
  });

  /// Get user's voting history
  ///
  /// [token] - User authentication token
  /// [page] - Page number for pagination
  /// [pageSize] - Number of votes per page
  ///
  /// Returns list of user's previous votes with appeal context
  /// Throws [FeedException] on request failure
  Future<List<UserVote>> getVotingHistory({
    required String token,
    int page = 1,
    int pageSize = 20,
  });

  /// Get feed statistics and metrics
  ///
  /// [token] - User authentication token
  ///
  /// Returns metrics like total active appeals, user participation, etc.
  /// Throws [FeedException] on request failure
  Future<FeedMetrics> getFeedMetrics({required String token});
}

/// Feed-specific metrics for dashboard display
class FeedMetrics {
  final int totalActiveAppeals;
  final int userVotesToday;
  final int userTotalVotes;
  final double userParticipationRate;
  final Map<String, int> categoryBreakdown;
  final List<String> featuredAppeals;

  const FeedMetrics({
    required this.totalActiveAppeals,
    required this.userVotesToday,
    required this.userTotalVotes,
    required this.userParticipationRate,
    required this.categoryBreakdown,
    required this.featuredAppeals,
  });

  factory FeedMetrics.fromJson(Map<String, dynamic> json) {
    return FeedMetrics(
      totalActiveAppeals: json['totalActiveAppeals'] ?? 0,
      userVotesToday: json['userVotesToday'] ?? 0,
      userTotalVotes: json['userTotalVotes'] ?? 0,
      userParticipationRate: (json['userParticipationRate'] ?? 0.0).toDouble(),
      categoryBreakdown: Map<String, int>.from(json['categoryBreakdown'] ?? {}),
      featuredAppeals: List<String>.from(json['featuredAppeals'] ?? []),
    );
  }
}

/// Domain exception for feed operations
class FeedException implements Exception {
  final String message;
  final String? code;
  final dynamic originalError;

  const FeedException(this.message, {this.code, this.originalError});

  @override
  String toString() => 'FeedException: $message';
}
