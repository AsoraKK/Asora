// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/feed/application/post_creation_providers.dart';
import 'package:asora/features/feed/domain/post_repository.dart';
import 'package:asora/state/models/feed_models.dart';
import 'package:asora/state/providers/feed_providers.dart';
import 'package:asora/state/providers/settings_providers.dart';
import 'package:asora/ui/components/asora_top_bar.dart';
import 'package:asora/ui/components/feed_carousel_indicator.dart';
import 'package:asora/ui/components/feed_control_panel.dart';
import 'package:asora/design_system/theme/theme_build_context_x.dart';
import 'package:asora/design_system/tokens/motion.dart';
import 'package:asora/features/moderation/presentation/moderation_console/moderation_console_screen.dart';
import 'package:asora/features/moderation/presentation/screens/appeal_history_screen.dart';
import 'package:asora/ui/screens/home/custom_feed.dart';
import 'package:asora/ui/screens/home/custom_feed_creation_flow.dart';
import 'package:asora/ui/screens/home/discover_feed.dart';
import 'package:asora/ui/screens/home/news_feed.dart';
import 'package:asora/ui/screens/home/feed_search_screen.dart';
import 'package:asora/ui/screens/home/trending_feed_screen.dart';

class HomeFeedNavigator extends ConsumerStatefulWidget {
  const HomeFeedNavigator({super.key});

  @override
  ConsumerState<HomeFeedNavigator> createState() => _HomeFeedNavigatorState();
}

class _HomeFeedNavigatorState extends ConsumerState<HomeFeedNavigator> {
  static const double _horizontalParallax = 12;
  late final PageController _pageController;
  late final ProviderSubscription<int> _feedIndexSub;

  @override
  void initState() {
    super.initState();
    final initialIndex = ref.read(currentFeedIndexProvider);
    _pageController = PageController(initialPage: initialIndex);

    _feedIndexSub = ref.listenManual<int>(currentFeedIndexProvider, (
      previous,
      next,
    ) {
      if (_pageController.hasClients &&
          (_pageController.page?.round() ?? _pageController.initialPage) !=
              next) {
        _pageController.animateToPage(
          next,
          duration: LythMotion.standard,
          curve: LythMotion.emphasisCurve,
        );
      }
    });
  }

  @override
  void dispose() {
    _feedIndexSub.close();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final feeds = ref.watch(feedListProvider);
    final activeIndex = ref.watch(currentFeedIndexProvider);
    final activeFeed = feeds[activeIndex];
    final swipeEnabled = ref.watch(horizontalSwipeEnabledProvider);
    final spacing = context.spacing;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            AsoraTopBar(
              title: activeFeed.name,
              onLogoTap: _openFeedControl,
              onTitleTap: _openFeedControl,
              onSearchTap: _openSearch,
              onTrendingTap: _openTrending,
              useWordmark: true,
            ),
            SizedBox(height: spacing.xs),
            FeedCarouselIndicator(
              count: feeds.length,
              activeIndex: activeIndex,
            ),
            SizedBox(height: spacing.xs),
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                physics: swipeEnabled
                    ? const PageScrollPhysics()
                    : const NeverScrollableScrollPhysics(),
                onPageChanged: (index) {
                  ref.read(currentFeedIndexProvider.notifier).state = index;
                },
                itemCount: feeds.length,
                itemBuilder: (context, index) {
                  final feed = feeds[index];
                  return AnimatedBuilder(
                    animation: _pageController,
                    builder: (context, child) {
                      double offset = 0;
                      if (_pageController.hasClients &&
                          _pageController.position.haveDimensions) {
                        final currentPage =
                            _pageController.page ?? index.toDouble();
                        offset = (currentPage - index).toDouble();
                      }
                      return Transform.translate(
                        offset: Offset(offset * _horizontalParallax, 0),
                        child: child,
                      );
                    },
                    child: _FeedPage(feed: feed),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openFeedControl() {
    final feeds = ref.read(feedListProvider);
    showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      builder: (_) => FeedControlPanel(
        onSelect: (feed) {
          final index = feeds.indexWhere((f) => f.id == feed.id);
          if (index != -1) {
            ref.read(currentFeedIndexProvider.notifier).state = index;
            _pageController.animateToPage(
              index,
              duration: LythMotion.standard,
              curve: LythMotion.emphasisCurve,
            );
          }
          Navigator.of(context).maybePop();
        },
        onCreateCustom: () {
          Navigator.of(context).maybePop();
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => const CustomFeedCreationFlow(),
            ),
          );
        },
        onOpenModerationHub: () {
          Navigator.of(context).maybePop();
          _openModerationHub();
        },
        onOpenAppeals: () {
          Navigator.of(context).maybePop();
          _openAppeals();
        },
      ),
    );
  }

  void _openModerationHub() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const ModerationConsoleScreen()),
    );
  }

  void _openTrending() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const TrendingFeedScreen()));
  }

  void _openSearch() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const FeedSearchScreen()));
  }

  void _openAppeals() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const AppealHistoryScreen()),
    );
  }
}

class _FeedPage extends ConsumerWidget {
  const _FeedPage({required this.feed});

  final FeedModel feed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (feed.type == FeedType.discover ||
        feed.type == FeedType.news ||
        feed.type == FeedType.custom) {
      final liveState = ref.watch(liveFeedStateProvider(feed));
      if (liveState.isInitialLoading) {
        return const Center(child: CircularProgressIndicator());
      }
      if (liveState.errorMessage != null && liveState.items.isEmpty) {
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(liveState.errorMessage!, textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () =>
                      ref.read(liveFeedStateProvider(feed).notifier).refresh(),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        );
      }
      return _buildLiveFeed(
        context,
        ref,
        items: liveState.items,
        hasMore: liveState.hasMore,
        isLoadingMore: liveState.isLoadingMore,
      );
    }

    final asyncItems = ref.watch(liveFeedItemsProvider(feed));
    return asyncItems.when(
      data: (items) => _buildFeed(items),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => _buildFeed(ref.read(feedItemsProvider(feed.id))),
    );
  }

  Widget _buildLiveFeed(
    BuildContext context,
    WidgetRef ref, {
    required List<FeedItem> items,
    required bool hasMore,
    required bool isLoadingMore,
  }) {
    final currentUserId = ref.watch(currentUserProvider)?.id;

    switch (feed.type) {
      case FeedType.discover:
        return DiscoverFeed(
          feed: feed,
          items: items,
          currentUserId: currentUserId,
          onEditItem: (item) => _showEditPostDialog(context, ref, item),
          hasMore: hasMore,
          isLoadingMore: isLoadingMore,
          onLoadMore: () =>
              ref.read(liveFeedStateProvider(feed).notifier).loadMore(),
          onRefresh: () =>
              ref.read(liveFeedStateProvider(feed).notifier).refresh(),
        );
      case FeedType.news:
        return NewsFeed(
          feed: feed,
          items: items,
          currentUserId: currentUserId,
          onEditItem: (item) => _showEditPostDialog(context, ref, item),
          hasMore: hasMore,
          isLoadingMore: isLoadingMore,
          onLoadMore: () =>
              ref.read(liveFeedStateProvider(feed).notifier).loadMore(),
          onRefresh: () =>
              ref.read(liveFeedStateProvider(feed).notifier).refresh(),
        );
      case FeedType.custom:
        return CustomFeedView(
          feed: feed,
          items: items,
          currentUserId: currentUserId,
          onEditItem: (item) => _showEditPostDialog(context, ref, item),
          hasMore: hasMore,
          isLoadingMore: isLoadingMore,
          onLoadMore: () =>
              ref.read(liveFeedStateProvider(feed).notifier).loadMore(),
          onRefresh: () =>
              ref.read(liveFeedStateProvider(feed).notifier).refresh(),
        );
      case FeedType.moderation:
        return const Center(child: Text('Moderation feed not in carousel.'));
    }
  }

  Future<void> _showEditPostDialog(
    BuildContext context,
    WidgetRef ref,
    FeedItem item,
  ) async {
    final token = await ref.read(jwtProvider.future);
    if (token == null || token.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Sign in to edit your post.')),
        );
      }
      return;
    }

    final controller = TextEditingController(text: item.body);
    final submitted = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit post'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 6,
          minLines: 3,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: 'Update your post text',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    controller.dispose();

    final updatedText = submitted?.trim();
    if (updatedText == null ||
        updatedText.isEmpty ||
        updatedText == item.body.trim()) {
      return;
    }

    final repository = ref.read(postRepositoryProvider);
    final result = await repository.updatePost(
      postId: item.id,
      request: UpdatePostRequest(
        text: updatedText,
        mediaUrl: item.imageUrl,
        contentType: switch (item.contentType) {
          ContentType.image => 'image',
          ContentType.video => 'video',
          _ => 'text',
        },
      ),
      token: token,
    );

    if (!context.mounted) {
      return;
    }

    switch (result) {
      case CreatePostSuccess():
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Post updated')));
        await ref.read(liveFeedStateProvider(feed).notifier).refresh();
      case CreatePostBlocked(:final message):
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(message)));
      case CreatePostLimitExceeded(:final message):
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(message)));
      case CreatePostError(:final message):
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  Widget _buildFeed(List<FeedItem> items) {
    switch (feed.type) {
      case FeedType.discover:
        return DiscoverFeed(feed: feed, items: items);
      case FeedType.news:
        return NewsFeed(feed: feed, items: items);
      case FeedType.custom:
        return CustomFeedView(feed: feed, items: items);
      case FeedType.moderation:
        return const Center(child: Text('Moderation feed not in carousel.'));
    }
  }
}
