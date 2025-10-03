/// ASORA FEED PROVIDERS
///
/// 🎯 Purpose: Riverpod providers for feed feature
/// 🏗️ Architecture: Application layer - manages state and dependencies
/// 🔐 Dependency Rule: UI depends on these providers, not on services directly
/// 📱 Platform: Flutter with Riverpod state management
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/feed_repository.dart';
import '../../moderation/domain/appeal.dart';
import '../../moderation/application/moderation_providers.dart'; // For jwtProvider
import '../../../core/providers/repository_providers.dart';

// Re-export the core repository provider for this feature
// This maintains clean feature boundaries while using shared infrastructure

/// Provider for voting feed appeals
final votingFeedProvider =
    FutureProvider.family<AppealResponse, VotingFeedParams>((
      ref,
      params,
    ) async {
      final repository = ref.watch(feedRepositoryProvider);
      final token = await ref.watch(jwtProvider.future);

      return repository.getVotingFeed(
        page: params.page,
        pageSize: params.pageSize,
        filters: params.filters,
        token: token,
      );
    });

/// Provider for user's voting history
final votingHistoryProvider =
    FutureProvider.family<List<UserVote>, VotingHistoryParams>((
      ref,
      params,
    ) async {
      final repository = ref.watch(feedRepositoryProvider);
      final token = await ref.watch(jwtProvider.future);

      return repository.getVotingHistory(
        token: token,
        page: params.page,
        pageSize: params.pageSize,
      );
    });

/// Provider for feed metrics
final feedMetricsProvider = FutureProvider<FeedMetrics>((ref) async {
  final repository = ref.watch(feedRepositoryProvider);
  final token = await ref.watch(jwtProvider.future);

  return repository.getFeedMetrics(token: token);
});

/// Data classes for provider parameters

class VotingHistoryParams {
  final int page;
  final int pageSize;

  const VotingHistoryParams({this.page = 1, this.pageSize = 20});
}
