import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../state/models/feed_models.dart';
import '../../../state/providers/feed_providers.dart';
import '../../../state/providers/settings_providers.dart';
import '../../components/asora_top_bar.dart';
import '../../components/feed_carousel_indicator.dart';
import '../../components/feed_control_panel.dart';
import '../../theme/spacing.dart';
import '../../utils/motion.dart';
import 'custom_feed.dart';
import 'custom_feed_creation_flow.dart';
import 'discover_feed.dart';
import 'news_feed.dart';

class HomeFeedNavigator extends ConsumerStatefulWidget {
  const HomeFeedNavigator({super.key});

  @override
  ConsumerState<HomeFeedNavigator> createState() => _HomeFeedNavigatorState();
}

class _HomeFeedNavigatorState extends ConsumerState<HomeFeedNavigator> {
  late final PageController _pageController;

  @override
  void initState() {
    super.initState();
    final initialIndex = ref.read(currentFeedIndexProvider);
    _pageController = PageController(initialPage: initialIndex);

    ref.listen<int>(currentFeedIndexProvider, (previous, next) {
      if (_pageController.hasClients &&
          (_pageController.page?.round() ?? _pageController.initialPage) !=
              next) {
        _pageController.animateToPage(
          next,
          duration: baseMotion,
          curve: emphasizedDecelerate,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final feeds = ref.watch(feedListProvider);
    final activeIndex = ref.watch(currentFeedIndexProvider);
    final activeFeed = feeds[activeIndex];
    final swipeEnabled = ref.watch(horizontalSwipeEnabledProvider);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            AsoraTopBar(
              title: activeFeed.name,
              onLogoTap: _openFeedControl,
              onTitleTap: _openFeedControl,
              onSearchTap: () {},
              onTrendingTap: () {},
            ),
            const SizedBox(height: Spacing.xs),
            FeedCarouselIndicator(
              count: feeds.length,
              activeIndex: activeIndex,
            ),
            const SizedBox(height: Spacing.xs),
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
                        offset: Offset(offset * horizontalParallax, 0),
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
    showModalBottomSheet(
      context: context,
      useSafeArea: true,
      builder: (_) => FeedControlPanel(
        onSelect: (feed) {
          final index = feeds.indexWhere((f) => f.id == feed.id);
          if (index != -1) {
            ref.read(currentFeedIndexProvider.notifier).state = index;
            _pageController.animateToPage(
              index,
              duration: baseMotion,
              curve: emphasizedDecelerate,
            );
          }
          Navigator.of(context).maybePop();
        },
        onCreateCustom: () {
          Navigator.of(context).maybePop();
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const CustomFeedCreationFlow()),
          );
        },
      ),
    );
  }
}

class _FeedPage extends ConsumerWidget {
  const _FeedPage({required this.feed});

  final FeedModel feed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(feedItemsProvider(feed.id));
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
