import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/mock/mock_feeds.dart';
import '../models/feed_models.dart';

final feedListProvider = Provider<List<FeedModel>>((ref) => mockFeeds);

final feedItemsProvider = Provider.family<List<FeedItem>, String>((
  ref,
  feedId,
) {
  return feedItemsFor(feedId);
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
