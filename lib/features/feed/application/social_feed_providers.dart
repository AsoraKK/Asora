/// 🎯 Purpose: Riverpod providers for social media feed state management
/// 🏗️ Architecture: Application layer - manages state and dependency injection
/// 🔐 Dependency Rule: Depends on domain and application services
/// 📱 Platform: Flutter with Riverpod + AsyncNotifier
library social_feed_providers;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/social_feed_repository.dart';
import '../domain/models.dart';
import '../application/social_feed_service.dart';
import '../../../core/network/dio_client.dart';

/// Provider for the social feed service implementation
final socialFeedServiceProvider = Provider<SocialFeedRepository>((ref) {
  final dio = ref.watch(secureDioProvider);
  return SocialFeedService(dio);
});

/// Provider for general feed with configurable parameters
final feedProvider =
    AsyncNotifierProvider.family<FeedNotifier, FeedResponse, FeedParams>(
      () => FeedNotifier(),
    );

/// Provider for trending feed
final trendingFeedProvider =
    AsyncNotifierProvider<TrendingFeedNotifier, FeedResponse>(
      () => TrendingFeedNotifier(),
    );

/// Provider for local feed
final localFeedProvider =
    AsyncNotifierProvider.family<
      LocalFeedNotifier,
      FeedResponse,
      LocalFeedParams
    >(() => LocalFeedNotifier());

/// Provider for new creators feed
final newCreatorsFeedProvider =
    AsyncNotifierProvider<NewCreatorsFeedNotifier, FeedResponse>(
      () => NewCreatorsFeedNotifier(),
    );

/// Provider for individual posts
final postProvider = AsyncNotifierProvider.family<PostNotifier, Post, String>(
  () => PostNotifier(),
);

/// Provider for post comments
final commentsProvider =
    AsyncNotifierProvider.family<
      CommentsNotifier,
      List<Comment>,
      CommentsParams
    >(() => CommentsNotifier());

/// Parameters for local feed
class LocalFeedParams {
  final String location;
  final double? radius;
  final int page;
  final int pageSize;

  const LocalFeedParams({
    required this.location,
    this.radius,
    this.page = 1,
    this.pageSize = 20,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LocalFeedParams &&
          runtimeType == other.runtimeType &&
          location == other.location &&
          radius == other.radius &&
          page == other.page &&
          pageSize == other.pageSize;

  @override
  int get hashCode =>
      location.hashCode ^ radius.hashCode ^ page.hashCode ^ pageSize.hashCode;
}

/// Parameters for comments
class CommentsParams {
  final String postId;
  final int page;
  final int pageSize;

  const CommentsParams({
    required this.postId,
    this.page = 1,
    this.pageSize = 50,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CommentsParams &&
          runtimeType == other.runtimeType &&
          postId == other.postId &&
          page == other.page &&
          pageSize == other.pageSize;

  @override
  int get hashCode => postId.hashCode ^ page.hashCode ^ pageSize.hashCode;
}

/// Notifier for general feed
class FeedNotifier extends FamilyAsyncNotifier<FeedResponse, FeedParams> {
  @override
  Future<FeedResponse> build(FeedParams arg) async {
    final feedService = ref.read(socialFeedServiceProvider);

    return feedService.getFeed(
      params: arg,
      token: ref.read(authTokenProvider), // Use token from auth provider
    );
  }

  /// Load more pages (pagination)
  Future<void> loadMore() async {
    if (state.isLoading) return;

    final currentData = state.value;
    if (currentData == null || !currentData.hasMore) return;

    final nextParams = FeedParams(
      type: arg.type,
      page: arg.page + 1,
      pageSize: arg.pageSize,
      category: arg.category,
      tags: arg.tags,
    );

    state = const AsyncValue.loading();

    state = await AsyncValue.guard(() async {
      final feedService = ref.read(socialFeedServiceProvider);

      final nextPage = await feedService.getFeed(
        params: nextParams,
        token: null, // TODO: Implement token from auth when ready
      );

      return FeedResponse(
        posts: [...currentData.posts, ...nextPage.posts],
        hasMore: nextPage.hasMore,
        totalCount: nextPage.totalCount,
        page: nextPage.page,
        pageSize: nextPage.pageSize,
      );
    });
  }

  /// Refresh feed (pull to refresh)
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => build(arg));
  }
}

/// Notifier for trending feed
class TrendingFeedNotifier extends AsyncNotifier<FeedResponse> {
  int _currentPage = 1;
  static const _pageSize = 20;

  @override
  Future<FeedResponse> build() async {
    _currentPage = 1;
    final feedService = ref.read(socialFeedServiceProvider);

    return feedService.getTrendingFeed(
      page: _currentPage,
      pageSize: _pageSize,
      token: null, // TODO: Implement token from auth when ready
    );
  }

  Future<void> loadMore() async {
    if (state.isLoading) return;

    final currentData = state.value;
    if (currentData == null || !currentData.hasMore) return;

    final previousState = state;
    state = const AsyncValue.loading();

    state = await AsyncValue.guard(() async {
      final feedService = ref.read(socialFeedServiceProvider);

      final nextPage = await feedService.getTrendingFeed(
        page: _currentPage + 1,
        pageSize: _pageSize,
        token: null, // TODO: Implement token from auth when ready
      );

      _currentPage++;

      return FeedResponse(
        posts: [...currentData.posts, ...nextPage.posts],
        hasMore: nextPage.hasMore,
        totalCount: nextPage.totalCount,
        page: nextPage.page,
        pageSize: nextPage.pageSize,
      );
    });

    if (state.hasError) {
      state = previousState; // Restore previous state on error
    }
  }

  Future<void> refresh() async {
    _currentPage = 1;
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => build());
  }
}

/// Notifier for local feed
class LocalFeedNotifier
    extends FamilyAsyncNotifier<FeedResponse, LocalFeedParams> {
  int _currentPage = 1;

  @override
  Future<FeedResponse> build(LocalFeedParams arg) async {
    _currentPage = arg.page;
    final feedService = ref.read(socialFeedServiceProvider);

    return feedService.getLocalFeed(
      location: arg.location,
      radius: arg.radius,
      page: arg.page,
      pageSize: arg.pageSize,
      token: null, // TODO: Implement token from auth when ready
    );
  }

  Future<void> loadMore() async {
    if (state.isLoading) return;

    final currentData = state.value;
    if (currentData == null || !currentData.hasMore) return;

    state = const AsyncValue.loading();

    state = await AsyncValue.guard(() async {
      final feedService = ref.read(socialFeedServiceProvider);

      final nextPage = await feedService.getLocalFeed(
        location: arg.location,
        radius: arg.radius,
        page: _currentPage + 1,
        pageSize: arg.pageSize,
        token: null, // TODO: Implement token from auth when ready
      );

      _currentPage++;

      return FeedResponse(
        posts: [...currentData.posts, ...nextPage.posts],
        hasMore: nextPage.hasMore,
        totalCount: nextPage.totalCount,
        page: nextPage.page,
        pageSize: nextPage.pageSize,
      );
    });
  }

  Future<void> refresh() async {
    _currentPage = 1;
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => build(arg));
  }
}

/// Notifier for new creators feed
class NewCreatorsFeedNotifier extends AsyncNotifier<FeedResponse> {
  int _currentPage = 1;
  static const _pageSize = 20;

  @override
  Future<FeedResponse> build() async {
    _currentPage = 1;
    final feedService = ref.read(socialFeedServiceProvider);

    return feedService.getNewCreatorsFeed(
      page: _currentPage,
      pageSize: _pageSize,
      token: null, // TODO: Implement token from auth when ready
    );
  }

  Future<void> loadMore() async {
    if (state.isLoading) return;

    final currentData = state.value;
    if (currentData == null || !currentData.hasMore) return;

    state = const AsyncValue.loading();

    state = await AsyncValue.guard(() async {
      final feedService = ref.read(socialFeedServiceProvider);

      final nextPage = await feedService.getNewCreatorsFeed(
        page: _currentPage + 1,
        pageSize: _pageSize,
        token: null, // TODO: Implement token from auth when ready
      );

      _currentPage++;

      return FeedResponse(
        posts: [...currentData.posts, ...nextPage.posts],
        hasMore: nextPage.hasMore,
        totalCount: nextPage.totalCount,
        page: nextPage.page,
        pageSize: nextPage.pageSize,
      );
    });
  }

  Future<void> refresh() async {
    _currentPage = 1;
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => build());
  }
}

/// Notifier for individual posts
class PostNotifier extends FamilyAsyncNotifier<Post, String> {
  @override
  Future<Post> build(String arg) async {
    final feedService = ref.read(socialFeedServiceProvider);

    return feedService.getPost(
      postId: arg,
      token: null, // TODO: Implement token from auth when ready
    );
  }

  /// Toggle like status (requires authentication when implemented)
  Future<void> toggleLike() async {
    final currentPost = state.value;
    if (currentPost == null) return;

    // TODO: Implement authentication check
    const token = null; // Placeholder

    if (token == null) {
      throw const SocialFeedException(
        'Authentication required to like posts',
        code: 'AUTH_REQUIRED',
      );
    }

    state = const AsyncValue.loading();

    state = await AsyncValue.guard(() async {
      final feedService = ref.read(socialFeedServiceProvider);

      return feedService.likePost(
        postId: arg,
        isLike: !currentPost.userLiked,
        token: token,
      );
    });
  }

  /// Toggle dislike status (requires authentication when implemented)
  Future<void> toggleDislike() async {
    final currentPost = state.value;
    if (currentPost == null) return;

    // TODO: Implement authentication check
    const token = null; // Placeholder

    if (token == null) {
      throw const SocialFeedException(
        'Authentication required to dislike posts',
        code: 'AUTH_REQUIRED',
      );
    }

    state = const AsyncValue.loading();

    state = await AsyncValue.guard(() async {
      final feedService = ref.read(socialFeedServiceProvider);

      return feedService.dislikePost(
        postId: arg,
        isDislike: !currentPost.userDisliked,
        token: token,
      );
    });
  }

  /// Flag post for moderation (requires authentication when implemented)
  Future<void> flagPost({required String reason, String? details}) async {
    // TODO: Implement authentication check
    const token = null; // Placeholder

    if (token == null) {
      throw const SocialFeedException(
        'Authentication required to flag posts',
        code: 'AUTH_REQUIRED',
      );
    }

    final feedService = ref.read(socialFeedServiceProvider);

    await feedService.flagPost(
      postId: arg,
      reason: reason,
      details: details,
      token: token,
    );
  }
}

/// Notifier for post comments
class CommentsNotifier
    extends FamilyAsyncNotifier<List<Comment>, CommentsParams> {
  int _currentPage = 1;

  @override
  Future<List<Comment>> build(CommentsParams arg) async {
    _currentPage = arg.page;
    final feedService = ref.read(socialFeedServiceProvider);

    return feedService.getComments(
      postId: arg.postId,
      page: arg.page,
      pageSize: arg.pageSize,
      token: null, // TODO: Implement token from auth when ready
    );
  }

  Future<void> loadMore() async {
    if (state.isLoading) return;

    final currentComments = state.value;
    if (currentComments == null) return;

    state = const AsyncValue.loading();

    state = await AsyncValue.guard(() async {
      final feedService = ref.read(socialFeedServiceProvider);

      final nextPageComments = await feedService.getComments(
        postId: arg.postId,
        page: _currentPage + 1,
        pageSize: arg.pageSize,
        token: null, // TODO: Implement token from auth when ready
      );

      _currentPage++;

      return [...currentComments, ...nextPageComments];
    });
  }

  Future<void> refresh() async {
    _currentPage = 1;
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => build(arg));
  }
}
