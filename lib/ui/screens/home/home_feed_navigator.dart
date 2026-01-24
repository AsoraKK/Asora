// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/state/models/feed_models.dart';
import 'package:asora/state/providers/feed_providers.dart';
import 'package:asora/state/providers/settings_providers.dart';
import 'package:asora/ui/components/asora_top_bar.dart';
import 'package:asora/ui/components/feed_carousel_indicator.dart';
import 'package:asora/ui/components/feed_control_panel.dart';
import 'package:asora/design_system/theme/theme_build_context_x.dart';
import 'package:asora/design_system/tokens/motion.dart';
import 'package:asora/ui/screens/home/custom_feed.dart';
import 'package:asora/ui/screens/home/custom_feed_creation_flow.dart';
import 'package:asora/ui/screens/home/discover_feed.dart';
import 'package:asora/state/providers/moderation_providers.dart';
import 'package:asora/ui/screens/mod/appeal_case.dart';
import 'package:asora/ui/screens/mod/moderation_hub.dart';
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
      MaterialPageRoute<void>(builder: (_) => const ModerationHubScreen()),
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
    final appeals = ref.read(appealsProvider);
    final first = appeals.isNotEmpty ? appeals.first.id : null;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AppealCaseScreen(appealId: first),
      ),
    );
  }
}

class _FeedPage extends ConsumerWidget {
  const _FeedPage({required this.feed});

  final FeedModel feed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncItems = ref.watch(liveFeedItemsProvider(feed));
    return asyncItems.when(
      data: (items) => _buildFeed(items),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) {
        final fallback = ref.read(feedItemsProvider(feed.id));
        return _buildFeed(fallback);
      },
    );
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
