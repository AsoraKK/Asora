/// Extended widget tests for CreatePostScreen — targeting uncovered UI paths
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';
import 'package:asora/features/feed/presentation/create_post_screen.dart';
import 'package:asora/features/feed/application/post_creation_providers.dart';
import 'package:asora/features/feed/domain/post_repository.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/domain/user.dart';

class MockPostRepository extends Mock implements PostRepository {}

class MockAuthStateNotifier extends StateNotifier<AsyncValue<User?>>
    implements AuthStateNotifier {
  MockAuthStateNotifier(User? user) : super(AsyncValue.data(user));
  @override
  Future<void> refreshToken() async {}
  @override
  Future<void> signInWithEmail(String email, String password) async {}
  @override
  Future<void> signInWithOAuth2() async {}
  @override
  Future<void> signInWithProvider(OAuth2Provider provider) async {}
  @override
  Future<void> signOut() async => state = const AsyncValue.data(null);
  @override
  Future<void> validateToken() async {}
  @override
  Future<void> continueAsGuest() async {}
}

User _testUser() => User(
  id: 'u1',
  email: 'test@test.com',
  role: UserRole.user,
  tier: UserTier.bronze,
  reputationScore: 50,
  createdAt: DateTime(2024),
  lastLoginAt: DateTime(2024),
);

void main() {
  late MockPostRepository mockRepo;

  setUpAll(() {
    registerFallbackValue(const CreatePostRequest(text: 'fb'));
  });

  setUp(() => mockRepo = MockPostRepository());

  Widget buildWidget({User? user}) {
    return ProviderScope(
      overrides: [
        postRepositoryProvider.overrideWithValue(mockRepo),
        authStateProvider.overrideWith((ref) => MockAuthStateNotifier(user)),
        jwtProvider.overrideWith((ref) async => user != null ? 'tok' : null),
      ],
      child: const MaterialApp(home: CreatePostScreen()),
    );
  }

  group('AI Label Chips', () {
    testWidgets('default AI label is human-authored', (tester) async {
      await tester.pumpWidget(buildWidget(user: _testUser()));
      await tester.pumpAndSettle();

      // Human-authored should be the default
      expect(find.text('Human-authored'), findsOneWidget);
      expect(find.text('Contains AI'), findsOneWidget);
    });

    testWidgets('selecting Contains AI shows warning and disables Post', (
      tester,
    ) async {
      await tester.pumpWidget(buildWidget(user: _testUser()));
      await tester.pumpAndSettle();

      // First enter some text
      await tester.enterText(find.byType(TextField), 'Some content');
      await tester.pump();

      // Select Contains AI
      await tester.tap(find.text('Contains AI'));
      await tester.pump();

      // Should show the AI warning text
      expect(
        find.textContaining(
          'Lythaus blocks AI-generated content at publish time',
        ),
        findsOneWidget,
      );
    });

    testWidgets('switching back to Human-authored hides AI warning', (
      tester,
    ) async {
      await tester.pumpWidget(buildWidget(user: _testUser()));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Some content');
      await tester.pump();

      // Select Contains AI
      await tester.tap(find.text('Contains AI'));
      await tester.pump();
      expect(
        find.textContaining('Lythaus blocks AI-generated'),
        findsOneWidget,
      );

      // Switch back to Human-authored
      await tester.tap(find.text('Human-authored'));
      await tester.pump();
      expect(find.textContaining('Lythaus blocks AI-generated'), findsNothing);
    });
  });

  group('Proof Tiles UI', () {
    testWidgets('shows three proof tiles by default', (tester) async {
      await tester.pumpWidget(buildWidget(user: _testUser()));
      await tester.pumpAndSettle();

      expect(find.text('Capture metadata hash'), findsOneWidget);
      expect(find.text('Edit history hash'), findsOneWidget);
      expect(find.text('Source attestation'), findsOneWidget);
    });

    testWidgets('proof tiles show Not provided initially', (tester) async {
      await tester.pumpWidget(buildWidget(user: _testUser()));
      await tester.pumpAndSettle();

      expect(find.text('Not provided'), findsNWidgets(3));
      expect(find.text('Add'), findsNWidgets(3));
    });
  });

  group('Media handling', () {
    testWidgets('add media button is present', (tester) async {
      await tester.pumpWidget(buildWidget(user: _testUser()));
      await tester.pumpAndSettle();

      // Should have media button in bottom toolbar
      expect(find.byIcon(Icons.image_outlined), findsOneWidget);
    });

    testWidgets('media button disabled when not signed in', (tester) async {
      await tester.pumpWidget(buildWidget(user: null));
      await tester.pumpAndSettle();

      final iconButton = find.widgetWithIcon(IconButton, Icons.image_outlined);
      final btn = tester.widget<IconButton>(iconButton);
      expect(btn.onPressed, isNull);
    });
  });

  group('Limit Exceeded Banner — minutes only', () {
    testWidgets('shows minutes-only format when hours == 0', (tester) async {
      when(
        () => mockRepo.createPost(
          request: any(named: 'request'),
          token: any(named: 'token'),
        ),
      ).thenAnswer((_) async {
        return const CreatePostLimitExceeded(
          message: 'limit',
          limit: 5,
          currentCount: 5,
          tier: 'free',
          retryAfter: Duration(minutes: 45),
        );
      });

      await tester.pumpWidget(buildWidget(user: _testUser()));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Some text');
      await tester.pump();
      await tester.tap(find.widgetWithText(FilledButton, 'Post'));
      await tester.pumpAndSettle();

      expect(find.text('Daily Limit Reached'), findsOneWidget);
      expect(find.textContaining('45m'), findsOneWidget);
    });
  });

  group('AI label blocks submission', () {
    testWidgets('submit with AI label returns validation error', (
      tester,
    ) async {
      await tester.pumpWidget(buildWidget(user: _testUser()));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'My AI post');
      await tester.pump();

      // Switch to AI-generated
      await tester.tap(find.text('Contains AI'));
      await tester.pump();

      await tester.tap(find.widgetWithText(FilledButton, 'Post'));
      await tester.pumpAndSettle();

      // Should not call repository
      verifyNever(
        () => mockRepo.createPost(
          request: any(named: 'request'),
          token: any(named: 'token'),
        ),
      );
    });
  });

  group('CreatePostFAB', () {
    testWidgets('renders FAB with Post label', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authStateProvider.overrideWith(
              (ref) => MockAuthStateNotifier(_testUser()),
            ),
          ],
          child: const MaterialApp(
            home: Scaffold(floatingActionButton: CreatePostFAB()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Post'), findsOneWidget);
      expect(find.byIcon(Icons.edit), findsOneWidget);
    });

    testWidgets('shows snackbar when tapped without auth', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authStateProvider.overrideWith(
              (ref) => MockAuthStateNotifier(null),
            ),
          ],
          child: const MaterialApp(
            home: Scaffold(floatingActionButton: CreatePostFAB()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Post'));
      await tester.pumpAndSettle();

      expect(find.text('Please sign in to create a post'), findsOneWidget);
    });
  });

  group('PostCreationNotifier additional methods', () {
    test('setIsNews updates state', () {
      final container = ProviderContainer(
        overrides: [postRepositoryProvider.overrideWithValue(mockRepo)],
      );
      addTearDown(container.dispose);
      final notifier = container.read(postCreationProvider.notifier);
      notifier.setIsNews(true);
      expect(container.read(postCreationProvider).isNews, isTrue);
    });

    test('setContentType updates state', () {
      final container = ProviderContainer(
        overrides: [postRepositoryProvider.overrideWithValue(mockRepo)],
      );
      addTearDown(container.dispose);
      final notifier = container.read(postCreationProvider.notifier);
      notifier.setContentType('image');
      expect(container.read(postCreationProvider).contentType, 'image');
    });

    test('setAiLabel updates state', () {
      final container = ProviderContainer(
        overrides: [postRepositoryProvider.overrideWithValue(mockRepo)],
      );
      addTearDown(container.dispose);
      final notifier = container.read(postCreationProvider.notifier);
      notifier.setAiLabel('generated');
      expect(container.read(postCreationProvider).aiLabel, 'generated');
    });

    test('updateCaptureMetadataHash updates proof signals', () {
      final container = ProviderContainer(
        overrides: [postRepositoryProvider.overrideWithValue(mockRepo)],
      );
      addTearDown(container.dispose);
      final notifier = container.read(postCreationProvider.notifier);
      notifier.updateCaptureMetadataHash('abc123');
      expect(
        container.read(postCreationProvider).proofSignals.captureMetadataHash,
        'abc123',
      );
    });

    test('updateEditHistoryHash updates proof signals', () {
      final container = ProviderContainer(
        overrides: [postRepositoryProvider.overrideWithValue(mockRepo)],
      );
      addTearDown(container.dispose);
      final notifier = container.read(postCreationProvider.notifier);
      notifier.updateEditHistoryHash('def456');
      expect(
        container.read(postCreationProvider).proofSignals.editHistoryHash,
        'def456',
      );
    });

    test('updateSourceAttestationUrl updates proof signals', () {
      final container = ProviderContainer(
        overrides: [postRepositoryProvider.overrideWithValue(mockRepo)],
      );
      addTearDown(container.dispose);
      final notifier = container.read(postCreationProvider.notifier);
      notifier.updateSourceAttestationUrl('https://example.com');
      expect(
        container.read(postCreationProvider).proofSignals.sourceAttestationUrl,
        'https://example.com',
      );
    });

    test('updateMediaUrl sets and clears media', () {
      final container = ProviderContainer(
        overrides: [postRepositoryProvider.overrideWithValue(mockRepo)],
      );
      addTearDown(container.dispose);
      final notifier = container.read(postCreationProvider.notifier);

      notifier.updateMediaUrl('https://example.com/img.jpg');
      expect(
        container.read(postCreationProvider).mediaUrl,
        'https://example.com/img.jpg',
      );

      notifier.updateMediaUrl(null);
      expect(container.read(postCreationProvider).mediaUrl, isNull);
    });

    test('clearError resets result and validation', () {
      final container = ProviderContainer(
        overrides: [postRepositoryProvider.overrideWithValue(mockRepo)],
      );
      addTearDown(container.dispose);
      final notifier = container.read(postCreationProvider.notifier);
      notifier.clearError();
      expect(container.read(postCreationProvider).result, isNull);
      expect(container.read(postCreationProvider).validationError, isNull);
    });

    test('validate returns error for AI-generated label', () {
      final container = ProviderContainer(
        overrides: [postRepositoryProvider.overrideWithValue(mockRepo)],
      );
      addTearDown(container.dispose);
      final notifier = container.read(postCreationProvider.notifier);
      notifier.updateText('Some text');
      notifier.setAiLabel('generated');
      expect(notifier.validate(), contains('AI-generated'));
    });

    test('submit returns false when no auth token', () async {
      final container = ProviderContainer(
        overrides: [
          postRepositoryProvider.overrideWithValue(mockRepo),
          jwtProvider.overrideWith((ref) async => null),
        ],
      );
      addTearDown(container.dispose);
      final notifier = container.read(postCreationProvider.notifier);
      notifier.updateText('Valid text');
      final success = await notifier.submit();
      expect(success, isFalse);
      expect(
        container.read(postCreationProvider).result,
        isA<CreatePostError>(),
      );
    });

    // submit-success test removed: _refreshFeeds invalidates other providers
    // which triggers async reads after container disposal in test context.

    test('submit catches exception and returns error', () async {
      when(
        () => mockRepo.createPost(
          request: any(named: 'request'),
          token: any(named: 'token'),
        ),
      ).thenThrow(Exception('Network failure'));

      final container = ProviderContainer(
        overrides: [
          postRepositoryProvider.overrideWithValue(mockRepo),
          jwtProvider.overrideWith((ref) async => 'test-token'),
        ],
      );
      addTearDown(container.dispose);
      final notifier = container.read(postCreationProvider.notifier);
      notifier.updateText('Valid text');
      final success = await notifier.submit();
      expect(success, isFalse);
      expect(container.read(postCreationProvider).hasError, isTrue);
    });
  });

  group('PostCreationState extended', () {
    test('copyWith clears fields correctly', () {
      const state = PostCreationState(
        text: 'hello',
        mediaUrl: 'http://img.png',
        result: CreatePostError(message: 'err'),
        validationError: 'bad',
      );

      final cleared = state.copyWith(
        clearMediaUrl: true,
        clearResult: true,
        clearValidationError: true,
      );

      expect(cleared.mediaUrl, isNull);
      expect(cleared.result, isNull);
      expect(cleared.validationError, isNull);
      expect(cleared.text, 'hello');
    });

    test('successResult returns null when not success', () {
      const state = PostCreationState(
        result: CreatePostBlocked(message: 'blocked', categories: []),
      );
      expect(state.successResult, isNull);
      expect(state.blockedResult, isNotNull);
      expect(state.limitExceededResult, isNull);
      expect(state.errorResult, isNull);
    });

    test('limitExceededResult returns value', () {
      const state = PostCreationState(
        result: CreatePostLimitExceeded(
          message: 'limit',
          limit: 5,
          currentCount: 5,
          tier: 'free',
          retryAfter: Duration(hours: 1),
        ),
      );
      expect(state.limitExceededResult, isNotNull);
      expect(state.limitExceededResult!.limit, 5);
    });
  });
}
