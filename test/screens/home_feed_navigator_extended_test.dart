/// Extended tests for HomeFeedNavigator — targeting uncovered widget code paths
library;

import 'package:asora/state/models/feed_models.dart';
import 'package:asora/state/providers/feed_providers.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/features/feed/domain/post_repository.dart';
import 'package:asora/features/feed/application/post_creation_providers.dart';
import 'package:asora/ui/screens/home/home_feed_navigator.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockPostRepository extends Mock implements PostRepository {}

class _StaticLiveFeedNotifier extends LiveFeedController {
  _StaticLiveFeedNotifier(super.s);
  @override
  Future<void> loadMore() async {}
  @override
  Future<void> refresh() async {}
}

class MockAuthStateNotifier extends StateNotifier<AsyncValue<User?>>
    implements AuthStateNotifier {
  MockAuthStateNotifier(User? u) : super(AsyncValue.data(u));
  @override
  Future<void> refreshToken() async {}
  @override
  Future<void> signInWithEmail(String e, String p) async {}
  @override
  Future<void> signInWithOAuth2() async {}
  @override
  Future<void> signInWithProvider(OAuth2Provider provider) async {}
  @override
  Future<void> signOut() async => state = const AsyncValue.data(null);
  @override
  Future<void> validateToken() async {}
}

final _feeds = [
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
    id: 'mod',
    name: 'Moderation',
    type: FeedType.moderation,
    contentFilters: ContentFilters(allowedTypes: {ContentType.mixed}),
    sorting: SortingRule.newest,
    refinements: FeedRefinements(),
    subscriptionLevelRequired: 0,
  ),
];

void main() {
  setUpAll(() {
    registerFallbackValue(const CreatePostRequest(text: 'fb'));
  });

  Widget buildWithState({
    required LiveFeedState Function(FeedModel) stateForFeed,
    User? user,
  }) {
    final container = ProviderContainer(
      overrides: [
        feedListProvider.overrideWith((ref) => _feeds),
        liveFeedStateProvider.overrideWith(
          (ref, feed) => _StaticLiveFeedNotifier(stateForFeed(feed)),
        ),
        if (user != null) ...[
          authStateProvider.overrideWith((ref) => MockAuthStateNotifier(user)),
          jwtProvider.overrideWith((ref) async => 'test-token'),
        ],
      ],
    );

    return UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: true),
          child: child!,
        ),
        home: const HomeFeedNavigator(),
      ),
    );
  }

  group('_FeedPage states', () {
    testWidgets('shows loading indicator during initial load', (tester) async {
      tester.binding.platformDispatcher.textScaleFactorTestValue = 0.8;
      addTearDown(
        () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
      );

      await tester.pumpWidget(
        buildWithState(
          stateForFeed: (feed) => const LiveFeedState(isInitialLoading: true),
        ),
      );
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows error message with retry button on error', (
      tester,
    ) async {
      tester.binding.platformDispatcher.textScaleFactorTestValue = 0.8;
      addTearDown(
        () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
      );

      await tester.pumpWidget(
        buildWithState(
          stateForFeed: (feed) => const LiveFeedState(
            errorMessage: 'Unable to load feed right now.',
            items: [],
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Unable to load feed right now.'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('moderation feed type shows placeholder text', (tester) async {
      tester.binding.platformDispatcher.textScaleFactorTestValue = 0.8;
      addTearDown(
        () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
      );

      final container = ProviderContainer(
        overrides: [
          feedListProvider.overrideWith(
            (ref) => [
              const FeedModel(
                id: 'mod',
                name: 'Moderation',
                type: FeedType.moderation,
                contentFilters: ContentFilters(
                  allowedTypes: {ContentType.mixed},
                ),
                sorting: SortingRule.newest,
                refinements: FeedRefinements(),
                subscriptionLevelRequired: 0,
                isHome: true,
              ),
            ],
          ),
          liveFeedStateProvider.overrideWith(
            (ref, feed) =>
                _StaticLiveFeedNotifier(const LiveFeedState(items: [])),
          ),
        ],
      );

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
      await tester.pump();

      expect(find.text('Moderation feed not in carousel.'), findsOneWidget);
    });
  });

  group('Feed switching via PageView', () {
    testWidgets('PageView onPageChanged updates currentFeedIndex', (
      tester,
    ) async {
      tester.binding.platformDispatcher.textScaleFactorTestValue = 0.8;
      addTearDown(
        () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
      );

      final container = ProviderContainer(
        overrides: [
          feedListProvider.overrideWith((ref) => _feeds.sublist(0, 2)),
          liveFeedStateProvider.overrideWith(
            (ref, feed) => _StaticLiveFeedNotifier(
              LiveFeedState(
                items: [
                  FeedItem(
                    id: '${feed.id}-1',
                    feedId: feed.id,
                    author: 'Alex',
                    contentType: ContentType.text,
                    title: 'T',
                    body: 'B',
                    publishedAt: DateTime(2024),
                  ),
                ],
              ),
            ),
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

      // Swipe left to go to News
      await tester.fling(find.byType(PageView), const Offset(-300, 0), 800);
      await tester.pumpAndSettle();

      expect(container.read(currentFeedIndexProvider), 1);
    });
  });
}
