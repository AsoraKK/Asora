import 'package:asora/core/analytics/analytics_client.dart';
import 'package:asora/core/analytics/analytics_providers.dart';
import 'package:asora/features/admin/application/live_test_mode_provider.dart';
import 'package:asora/features/admin/ui/app_preview_screen.dart';
import 'package:asora/features/admin/ui/widgets/preview_flow_wrapper.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/features/profile/application/profile_providers.dart';
import 'package:asora/features/profile/domain/public_user.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthStateNotifier extends StateNotifier<AsyncValue<User?>>
    with Mock
    implements AuthStateNotifier {
  _MockAuthStateNotifier(super.initialState);
}

void main() {
  testWidgets('preview create post blocks spam content', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: PreviewFlowWrapper(flow: PreviewFlow.createPost),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'buy now spam');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Post'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 900));
    await tester.pumpAndSettle();

    expect(find.text('Content Blocked'), findsOneWidget);
    expect(container.read(previewUserPostsProvider), isEmpty);
  });

  testWidgets('preview create post warns and shows moderated profile', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: PreviewFlowWrapper(flow: PreviewFlow.createPost),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'hate');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Post'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 900));
    await tester.pumpAndSettle();

    expect(find.text('Review Suggested'), findsOneWidget);
    await tester.tap(find.text('Post Anyway'));
    await tester.pumpAndSettle();

    expect(container.read(previewUserPostsProvider).length, 1);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: PreviewFlowWrapper(flow: PreviewFlow.profile),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Reviewed'), findsOneWidget);
  });

  testWidgets('preview onboarding flows respond to input', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: PreviewFlowWrapper(flow: PreviewFlow.onboardingModeration),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Content Preferences'), findsOneWidget);

    await tester.drag(find.byType(Slider), const Offset(200, 0));
    await tester.tap(find.widgetWithText(SwitchListTile, 'Hide NSFW content'));
    await tester.tap(
      find.widgetWithText(SwitchListTile, 'Reduce political content'),
    );
    await tester.pumpAndSettle();

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: PreviewFlowWrapper(flow: PreviewFlow.onboardingFeed),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Personalize Your Feed'), findsOneWidget);
    expect(find.textContaining('Continue'), findsOneWidget);

    await tester.tap(find.text('Music'));
    await tester.pumpAndSettle();
    expect(find.textContaining('selected'), findsOneWidget);
  });

  testWidgets('live mode home feed shows banner and switches flow', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1400, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    tester.binding.platformDispatcher.textScaleFactorTestValue = 0.6;
    addTearDown(
      () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
    );

    final container = ProviderContainer(
      overrides: [
        authStateProvider.overrideWith(
          (ref) => _MockAuthStateNotifier(const AsyncValue.data(null)),
        ),
        analyticsClientProvider.overrideWithValue(const NullAnalyticsClient()),
      ],
    );
    container.read(liveTestModeProvider.notifier).enable();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(disableAnimations: true),
            child: child!,
          ),
          home: const PreviewFlowWrapper(flow: PreviewFlow.homeFeed),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('LIVE TEST MODE'), findsOneWidget);
    expect(find.byKey(const Key('live_feed')), findsOneWidget);

    await tester.tap(find.widgetWithIcon(FloatingActionButton, Icons.add));
    await tester.pump();

    expect(container.read(previewFlowProvider), PreviewFlow.createPost);
  });

  testWidgets('live mode create post shows session and closes', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1400, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    tester.binding.platformDispatcher.textScaleFactorTestValue = 0.6;
    addTearDown(
      () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
    );

    final container = ProviderContainer();
    container.read(liveTestModeProvider.notifier).enable();
    container.read(previewFlowProvider.notifier).state = PreviewFlow.createPost;
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: PreviewFlowWrapper(flow: PreviewFlow.createPost),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('LIVE TEST MODE'), findsOneWidget);
    expect(find.textContaining('Session:'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.close));
    await tester.pump();

    expect(container.read(previewFlowProvider), PreviewFlow.homeFeed);
  });

  testWidgets('live mode profile and settings render', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1400, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    tester.binding.platformDispatcher.textScaleFactorTestValue = 0.6;
    addTearDown(
      () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
    );

    const profile = PublicUser(
      id: 'user-1',
      displayName: 'Live User',
      tier: 'gold',
    );

    final container = ProviderContainer(
      overrides: [
        currentUserProvider.overrideWith(
          (ref) => User(
            id: 'user-1',
            email: 'user@example.com',
            role: UserRole.user,
            tier: UserTier.gold,
            reputationScore: 10,
            createdAt: DateTime(2024, 1, 1),
            lastLoginAt: DateTime(2024, 1, 2),
          ),
        ),
        publicUserProvider(
          profile.id,
        ).overrideWith((ref) => Future.value(profile)),
      ],
    );
    container.read(liveTestModeProvider.notifier).enable();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: PreviewFlowWrapper(flow: PreviewFlow.profile),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('LIVE TEST MODE'), findsOneWidget);
    expect(find.text('Live User'), findsWidgets);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: PreviewFlowWrapper(flow: PreviewFlow.settings),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Settings'), findsOneWidget);
  });

  testWidgets('preview auth choice continues to onboarding intro', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    tester.binding.platformDispatcher.textScaleFactorTestValue = 0.8;
    addTearDown(
      () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
    );

    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: PreviewFlowWrapper(flow: PreviewFlow.authChoice),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Sign in with Google'));
    await tester.pump();

    expect(container.read(previewFlowProvider), PreviewFlow.onboardingIntro);
  });

  testWidgets('preview home feed navigates to create post', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: PreviewFlowWrapper(flow: PreviewFlow.homeFeed),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Home'), findsOneWidget);

    await tester.tap(find.widgetWithIcon(FloatingActionButton, Icons.add));
    await tester.pump();

    expect(container.read(previewFlowProvider), PreviewFlow.createPost);
  });

  testWidgets('preview create post allows safe content', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: PreviewFlowWrapper(flow: PreviewFlow.createPost),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'Hello preview');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Post'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 900));

    expect(find.textContaining('Post created! (Preview mode)'), findsOneWidget);
    expect(container.read(previewUserPostsProvider), isNotEmpty);
    expect(container.read(previewFlowProvider), PreviewFlow.homeFeed);
  });

  testWidgets('preview profile empty state routes to create post', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: PreviewFlowWrapper(flow: PreviewFlow.profile),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('No posts yet'), findsOneWidget);
    await tester.tap(find.text('Create your first post'));
    await tester.pump();

    expect(container.read(previewFlowProvider), PreviewFlow.createPost);
  });

  testWidgets('preview settings back button routes to profile', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: PreviewFlowWrapper(flow: PreviewFlow.settings),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.arrow_back));
    await tester.pump();

    expect(container.read(previewFlowProvider), PreviewFlow.profile);
  });
}
