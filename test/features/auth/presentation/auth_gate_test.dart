import 'package:asora/core/analytics/analytics_client.dart';
import 'package:asora/core/analytics/analytics_event_tracker.dart';
import 'package:asora/core/analytics/analytics_events.dart';
import 'package:asora/core/analytics/analytics_providers.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/features/auth/presentation/auth_gate.dart';
import 'package:asora/features/auth/presentation/auth_choice_screen.dart';
import 'package:asora/features/profile/application/profile_providers.dart';
import 'package:asora/features/profile/domain/public_user.dart';
import 'package:asora/state/models/feed_models.dart';
import 'package:asora/state/providers/feed_providers.dart';
import 'package:asora/state/providers/moderation_providers.dart';
import 'package:asora/ui/screens/app_shell.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _FakeAnalyticsClient implements AnalyticsClient {
  final List<String> loggedEvents = [];
  final List<String?> userIds = [];

  @override
  Future<void> logEvent(String name, {Map<String, Object?>? properties}) async {
    loggedEvents.add(name);
  }

  @override
  Future<void> setUserId(String? userId) async {
    userIds.add(userId);
  }

  @override
  Future<void> setUserProperties(Map<String, Object?> properties) async {}

  @override
  Future<void> reset() async {}
}

class _FakeAnalyticsEventTracker implements AnalyticsEventTracker {
  final List<String> loggedOnce = [];

  @override
  Future<bool> logEventOnce(
    AnalyticsClient client,
    String eventName, {
    String? userId,
    Map<String, Object?>? properties,
  }) async {
    loggedOnce.add(eventName);
    return true;
  }

  @override
  Future<bool> wasLogged(String eventName, {String? userId}) async {
    return loggedOnce.contains(eventName);
  }
}

class _MockAuthStateNotifier extends StateNotifier<AsyncValue<User?>>
    with Mock
    implements AuthStateNotifier {
  _MockAuthStateNotifier(super.initialState);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('shows auth choice and logs onboarding start', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    tester.binding.platformDispatcher.textScaleFactorTestValue = 0.8;
    addTearDown(
      () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
    );

    final analytics = _FakeAnalyticsClient();
    final tracker = _FakeAnalyticsEventTracker();
    final notifier = _MockAuthStateNotifier(const AsyncValue.data(null));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authStateProvider.overrideWith((ref) => notifier),
          analyticsClientProvider.overrideWithValue(analytics),
          analyticsEventTrackerProvider.overrideWithValue(tracker),
        ],
        child: const MaterialApp(home: AuthGate()),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 10));

    expect(find.byType(AuthChoiceScreen), findsOneWidget);
    expect(analytics.loggedEvents, contains(AnalyticsEvents.appStarted));
    expect(tracker.loggedOnce, contains(AnalyticsEvents.onboardingStart));
    expect(analytics.userIds.isEmpty ? null : analytics.userIds.last, isNull);
  });

  testWidgets('renders app shell and sets analytics user id', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    tester.binding.platformDispatcher.textScaleFactorTestValue = 0.8;
    addTearDown(
      () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
    );

    final analytics = _FakeAnalyticsClient();
    final tracker = _FakeAnalyticsEventTracker();
    final notifier = _MockAuthStateNotifier(const AsyncValue.loading());
    final user = User(
      id: 'u1',
      email: 'test@example.com',
      role: UserRole.user,
      tier: UserTier.bronze,
      reputationScore: 0,
      createdAt: DateTime.utc(2024, 1, 1),
      lastLoginAt: DateTime.utc(2024, 1, 2),
      isTemporary: false,
    );
    const profile = PublicUser(id: 'u1', displayName: 'Tester', tier: 'bronze');

    final feeds = [
      FeedModel(
        id: 'discover',
        name: 'Discover',
        type: FeedType.discover,
        contentFilters: const ContentFilters(allowedTypes: {ContentType.mixed}),
        sorting: SortingRule.hot,
        refinements: const FeedRefinements(),
        subscriptionLevelRequired: 0,
        isHome: true,
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

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authStateProvider.overrideWith((ref) => notifier),
          analyticsClientProvider.overrideWithValue(analytics),
          analyticsEventTrackerProvider.overrideWithValue(tracker),
          feedListProvider.overrideWith((ref) => feeds),
          liveFeedItemsProvider.overrideWith((ref, _) async => items),
          feedItemsProvider.overrideWith((ref, _) => items),
          appealsProvider.overrideWith((ref) => []),
          publicUserProvider('u1').overrideWith((ref) => Future.value(profile)),
        ],
        child: MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(disableAnimations: true),
            child: child!,
          ),
          home: const AuthGate(),
        ),
      ),
    );

    await tester.pump();

    notifier.state = AsyncValue.data(user);
    await tester.pumpAndSettle();

    expect(find.byType(AsoraAppShell), findsOneWidget);
    expect(analytics.userIds.isEmpty ? null : analytics.userIds.last, user.id);
  });
}
