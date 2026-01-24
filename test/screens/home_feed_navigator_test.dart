import 'package:asora/state/models/feed_models.dart';
import 'package:asora/state/providers/feed_providers.dart';
import 'package:asora/state/providers/moderation_providers.dart';
import 'package:asora/ui/components/feed_card.dart';
import 'package:asora/ui/screens/home/home_feed_navigator.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

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

    final items = [
      FeedItem(
        id: 'i1',
        feedId: 'discover',
        author: 'Alex',
        contentType: ContentType.text,
        title: 'Title',
        body: 'Body',
        publishedAt: DateTime(2024, 1, 1),
      ),
    ];

    final container = ProviderContainer(
      overrides: [
        feedListProvider.overrideWith((ref) => feeds),
        liveFeedItemsProvider.overrideWith((ref, feed) async => items),
        feedItemsProvider.overrideWith((ref, _) => items),
        appealsProvider.overrideWith((ref) => []),
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
    await tester.pumpAndSettle();

    expect(
      find.text('Hybrid newsroom + high reputation contributors.'),
      findsOneWidget,
    );

    container.read(currentFeedIndexProvider.notifier).state = 2;
    await tester.pumpAndSettle();

    expect(find.text('Custom feed'), findsOneWidget);
  });
}
