import 'package:asora/state/models/feed_models.dart';
import 'package:asora/state/providers/feed_providers.dart';
import 'package:asora/ui/components/feed_card.dart';
import 'package:asora/ui/screens/home/home_feed_navigator.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _StaticLiveFeedNotifier extends LiveFeedController {
  _StaticLiveFeedNotifier(List<FeedItem> items)
    : super(
        LiveFeedState(
          items: items,
          isInitialLoading: false,
          isLoadingMore: false,
        ),
      );

  @override
  Future<void> loadMore() async {}

  @override
  Future<void> refresh() async {}
}

void main() {
  testWidgets('home feed navigator switches feeds and renders views', (
    tester,
  ) async {
    tester.binding.platformDispatcher.textScaleFactorTestValue = 0.8;
    addTearDown(
      () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
    );

    final feeds = [
      const FeedModel(
        id: 'discover',
        name: 'Discover',
        type: FeedType.discover,
        contentFilters: ContentFilters(allowedTypes: {ContentType.mixed}),
        sorting: SortingRule.hot,
        refinements: FeedRefinements(),
        subscriptionLevelRequired: 0,
        isHome: true,
      ),
      const FeedModel(
        id: 'news',
        name: 'News',
        type: FeedType.news,
        contentFilters: ContentFilters(allowedTypes: {ContentType.mixed}),
        sorting: SortingRule.newest,
        refinements: FeedRefinements(),
        subscriptionLevelRequired: 0,
      ),
      const FeedModel(
        id: 'custom',
        name: 'Custom',
        type: FeedType.custom,
        contentFilters: ContentFilters(allowedTypes: {ContentType.mixed}),
        sorting: SortingRule.relevant,
        refinements: FeedRefinements(includeKeywords: ['health']),
        subscriptionLevelRequired: 0,
        isCustom: true,
      ),
    ];

    final container = ProviderContainer(
      overrides: [
        feedListProvider.overrideWith((ref) => feeds),
        liveFeedStateProvider.overrideWith(
          (ref, feed) => _StaticLiveFeedNotifier([
            FeedItem(
              id: '${feed.id}-1',
              feedId: feed.id,
              author: 'Alex',
              contentType: ContentType.text,
              title: 'Title',
              body: 'Body',
              publishedAt: DateTime(2024, 1, 1),
            ),
          ]),
        ),
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(disableAnimations: true),
            child: child!,
          ),
          home: const HomeFeedNavigator(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.text('Discover calm, trustworthy updates tailored to you.'),
      findsOneWidget,
    );
    expect(find.byType(FeedCard), findsWidgets);

    container.read(currentFeedIndexProvider.notifier).state = 1;
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 400));

    expect(
      find.text('Hybrid newsroom + high reputation contributors.'),
      findsOneWidget,
    );

    container.read(currentFeedIndexProvider.notifier).state = 2;
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 400));

    expect(container.read(currentFeedProvider).id, 'custom');
  });
}
