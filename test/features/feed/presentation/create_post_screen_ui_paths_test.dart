/// Widget tests for CreatePostScreen — targeting uncovered UI paths like
/// blocked banner, limit-exceeded banner, error banner, media URL chips,
/// auth-required card, proof tiles, and CreatePostFAB.
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

class _MockPostCreationNotifier extends StateNotifier<PostCreationState>
    implements PostCreationNotifier {
  _MockPostCreationNotifier(super.initial);

  @override
  void updateText(String text) {}
  @override
  void updateMediaUrl(String? url) {}
  @override
  void setIsNews(bool value) {}
  @override
  void setContentType(String value) {}
  @override
  void setAiLabel(String value) {}
  @override
  void updateCaptureMetadataHash(String? value) {}
  @override
  void updateEditHistoryHash(String? value) {}
  @override
  void updateSourceAttestationUrl(String? value) {}
  @override
  String? validate() => null;
  @override
  Future<bool> submit() async => false;
  @override
  void reset() {}
  @override
  void clearError() {}
}

class _MockAuthStateNotifier extends StateNotifier<AsyncValue<User?>>
    implements AuthStateNotifier {
  _MockAuthStateNotifier(User? user) : super(AsyncValue.data(user));
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

  Widget buildWithState(PostCreationState state, {User? user}) {
    final canCreate = user != null;
    return ProviderScope(
      overrides: [
        postRepositoryProvider.overrideWithValue(mockRepo),
        postCreationProvider.overrideWith(
          (ref) => _MockPostCreationNotifier(state),
        ),
        canCreatePostProvider.overrideWithValue(canCreate),
        authStateProvider.overrideWith((ref) => _MockAuthStateNotifier(user)),
        jwtProvider.overrideWith(
          (ref) async => user != null ? 'test-token' : null,
        ),
      ],
      child: const MaterialApp(home: CreatePostScreen()),
    );
  }

  group('_ContentBlockedBanner', () {
    testWidgets('renders blocked banner with categories', (tester) async {
      await tester.pumpWidget(
        buildWithState(
          const PostCreationState(
            text: 'Bad content',
            result: CreatePostBlocked(
              message: 'Content violates community guidelines',
              categories: ['hate_speech', 'harassment'],
            ),
          ),
          user: _testUser(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Content Blocked'), findsOneWidget);
      expect(
        find.text('Content violates community guidelines'),
        findsOneWidget,
      );
      expect(find.text('hate_speech'), findsOneWidget);
      expect(find.text('harassment'), findsOneWidget);
    });

    testWidgets('renders blocked banner without categories', (tester) async {
      await tester.pumpWidget(
        buildWithState(
          const PostCreationState(
            text: 'Bad content',
            result: CreatePostBlocked(
              message: 'Blocked by moderation',
              categories: [],
            ),
          ),
          user: _testUser(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Content Blocked'), findsOneWidget);
      expect(find.text('Blocked by moderation'), findsOneWidget);
    });
  });

  group('_LimitExceededBanner', () {
    testWidgets('renders limit exceeded banner with hours', (tester) async {
      await tester.pumpWidget(
        buildWithState(
          const PostCreationState(
            text: 'Some post text',
            result: CreatePostLimitExceeded(
              message: 'Daily limit reached',
              limit: 5,
              currentCount: 5,
              tier: 'free',
              retryAfter: Duration(hours: 2, minutes: 30),
            ),
          ),
          user: _testUser(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Daily Limit Reached'), findsOneWidget);
      expect(find.textContaining('2h 30m'), findsOneWidget);
      expect(find.textContaining('free tier'), findsOneWidget);
    });

    testWidgets('renders limit exceeded with minutes only', (tester) async {
      await tester.pumpWidget(
        buildWithState(
          const PostCreationState(
            text: 'Some post text',
            result: CreatePostLimitExceeded(
              message: 'Daily limit reached',
              limit: 3,
              currentCount: 3,
              tier: 'bronze',
              retryAfter: Duration(minutes: 45),
            ),
          ),
          user: _testUser(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Daily Limit Reached'), findsOneWidget);
      expect(find.textContaining('45m'), findsOneWidget);
    });
  });

  group('_ErrorBanner', () {
    testWidgets('renders error banner for generic error', (tester) async {
      await tester.pumpWidget(
        buildWithState(
          const PostCreationState(
            text: 'content',
            result: CreatePostError(
              message: 'Network connection failed',
              code: 'network_error',
            ),
          ),
          user: _testUser(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Network connection failed'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });
  });

  group('_AuthRequiredCard', () {
    testWidgets('shows auth required card when user is null', (tester) async {
      await tester.pumpWidget(buildWithState(const PostCreationState()));
      await tester.pumpAndSettle();

      expect(find.text('Please sign in to create a post.'), findsOneWidget);
      expect(find.byIcon(Icons.lock_outline), findsOneWidget);
    });
  });

  group('Media URL chip', () {
    testWidgets('shows media URL chip when mediaUrl is set', (tester) async {
      tester.view.physicalSize = const Size(1200, 3000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        buildWithState(
          const PostCreationState(
            text: 'Hello world',
            mediaUrl: 'https://example.com/image.png',
            contentType: 'image',
          ),
          user: _testUser(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.image_outlined), findsAtLeastNWidgets(1));
      // The text may be ellipsized in a SizedBox, so check by widget type
      expect(
        find.byWidgetPredicate(
          (w) => w is Text && (w.data ?? '').contains('example.com'),
        ),
        findsAtLeastNWidgets(1),
      );
    });
  });

  group('Proof tiles', () {
    testWidgets('renders proof tiles with not-provided state', (tester) async {
      tester.view.physicalSize = const Size(1200, 3000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        buildWithState(
          const PostCreationState(
            text: 'Hello world',
            proofSignals: ProofSignals(),
          ),
          user: _testUser(),
        ),
      );
      await tester.pumpAndSettle();

      // Should show proof tile titles
      expect(find.text('Capture metadata hash'), findsOneWidget);
      expect(find.text('Edit history hash'), findsOneWidget);
      expect(find.text('Source attestation'), findsOneWidget);

      // All should be "Not provided"
      expect(find.text('Not provided'), findsNWidgets(3));
      expect(find.text('Add'), findsNWidgets(3));
    });

    testWidgets('renders proof tiles with provided state', (tester) async {
      tester.view.physicalSize = const Size(1200, 3000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        buildWithState(
          const PostCreationState(
            text: 'Hello world',
            proofSignals: ProofSignals(
              captureMetadataHash: 'abc123def456ghi789',
              editHistoryHash: 'xyz987uvw654',
              sourceAttestationUrl: 'https://source.example.com/proof',
            ),
          ),
          user: _testUser(),
        ),
      );
      await tester.pumpAndSettle();

      // Should show "Provided" and "View details" for each
      expect(find.text('Provided'), findsNWidgets(3));
      expect(find.text('View details'), findsNWidgets(3));
    });
  });

  group('CreatePostFAB', () {
    testWidgets('renders FAB with Post label', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [canCreatePostProvider.overrideWithValue(true)],
          child: const MaterialApp(
            home: Scaffold(floatingActionButton: CreatePostFAB()),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Post'), findsOneWidget);
      expect(find.byIcon(Icons.edit), findsOneWidget);
    });

    testWidgets('shows snackbar when not signed in', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [canCreatePostProvider.overrideWithValue(false)],
          child: const MaterialApp(
            home: Scaffold(floatingActionButton: CreatePostFAB()),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Post'));
      await tester.pumpAndSettle();

      expect(find.text('Please sign in to create a post'), findsOneWidget);
    });
  });

  group('Submitting state', () {
    testWidgets('shows spinner in Post button while submitting', (
      tester,
    ) async {
      await tester.pumpWidget(
        buildWithState(
          const PostCreationState(text: 'Valid text', isSubmitting: true),
          user: _testUser(),
        ),
      );
      // Don't use pumpAndSettle — CircularProgressIndicator never settles
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });

  group('Character counter', () {
    testWidgets('shows character count', (tester) async {
      await tester.pumpWidget(
        buildWithState(
          const PostCreationState(text: 'Hello'),
          user: _testUser(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('5/5000'), findsOneWidget);
    });
  });
}
