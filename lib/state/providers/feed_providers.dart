import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/mock/mock_feeds.dart';
import '../../features/auth/application/auth_providers.dart';
import '../../features/feed/application/social_feed_providers.dart';
import '../../features/feed/domain/models.dart' as domain;
import '../models/feed_models.dart';

final feedListProvider = Provider<List<FeedModel>>((ref) => mockFeeds);

final feedItemsProvider = Provider.family<List<FeedItem>, String>((
  ref,
  feedId,
) {
  return feedItemsFor(feedId);
});

final liveFeedItemsProvider = FutureProvider.family<List<FeedItem>, FeedModel>((
  ref,
  feed,
) async {
  try {
    final service = ref.read(socialFeedServiceProvider);
    final token = await ref.read(jwtProvider.future);
    final authToken = token?.isNotEmpty == true ? token : null;
    List<domain.Post> posts;

    switch (feed.type) {
      case FeedType.discover:
        posts = (await service.getDiscoverFeed(
          limit: 25,
          token: authToken,
        )).posts;
        break;
      case FeedType.news:
        posts = (await service.getNewsFeed(limit: 25, token: authToken)).posts;
        break;
      case FeedType.custom:
        return feedItemsFor(feed.id);
      case FeedType.moderation:
        return const [];
    }

    return posts.map(_mapPostToFeedItem).toList();
  } catch (_) {
    return feedItemsFor(feed.id);
  }
});

final currentFeedIndexProvider = StateProvider<int>((ref) {
  final feeds = ref.read(feedListProvider);
  final homeIndex = feeds.indexWhere((feed) => feed.isHome);
  return homeIndex >= 0 ? homeIndex : 0;
});

final currentFeedProvider = Provider<FeedModel>((ref) {
  final feeds = ref.watch(feedListProvider);
  final index = ref.watch(currentFeedIndexProvider);
  final safeIndex = index.clamp(0, feeds.length - 1);
  return feeds[safeIndex];
});

final newsFeedProvider = Provider<List<FeedItem>>((ref) {
  return ref.watch(feedItemsProvider('news'));
});

class CustomFeedDraftNotifier extends StateNotifier<CustomFeedDraft> {
  CustomFeedDraftNotifier() : super(const CustomFeedDraft());

  void setContentType(ContentType type) {
    state = state.copyWith(contentType: type);
  }

  void setSorting(SortingRule sorting) {
    state = state.copyWith(sorting: sorting);
  }

  void updateRefinements(FeedRefinements refinements) {
    state = state.copyWith(refinements: refinements);
  }

  void setName(String name) {
    state = state.copyWith(name: name);
  }

  void setHome(bool isHome) {
    state = state.copyWith(setAsHome: isHome);
  }

  void reset() {
    state = const CustomFeedDraft();
  }
}

final customFeedDraftProvider =
    StateNotifierProvider<CustomFeedDraftNotifier, CustomFeedDraft>(
      (ref) => CustomFeedDraftNotifier(),
    );

FeedItem _mapPostToFeedItem(domain.Post post) {
  final type = (post.mediaUrls?.isNotEmpty ?? false)
      ? ContentType.image
      : ContentType.text;
  return FeedItem(
    id: post.id,
    feedId: 'live',
    author: post.authorUsername,
    contentType: type,
    title: post.metadata?.category ?? 'Update',
    body: post.text,
    imageUrl: post.mediaUrls?.isNotEmpty == true ? post.mediaUrls!.first : null,
    publishedAt: post.createdAt,
    tags: post.metadata?.tags ?? const [],
    isNews: post.metadata?.category == 'news',
    isPinned: post.metadata?.isPinned ?? false,
  );
}
