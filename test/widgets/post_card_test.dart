import 'package:asora/features/feed/application/post_insights_providers.dart';
import 'package:asora/features/moderation/domain/appeal.dart';
import 'package:asora/widgets/post_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

Post _buildPost({
  required String id,
  required ModerationStatus status,
  String? appealStatus,
  DateTime? createdAt,
  List<String> mediaUrls = const [],
}) {
  return Post(
    id: id,
    title: 'Title',
    content: 'Post content',
    author: const Author(id: 'a1', displayName: 'Alice', reputationScore: 10),
    createdAt: createdAt ?? DateTime.now(),
    moderationStatus: status,
    appealStatus: appealStatus,
    mediaUrls: mediaUrls,
  );
}

void main() {
  testWidgets('shows moderation banner and time for own flagged post', (
    tester,
  ) async {
    final post = _buildPost(
      id: 'p1',
      status: ModerationStatus.flagged,
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          postInsightsProvider(
            post.id,
          ).overrideWith((ref) => Future.value(InsightsAccessDenied())),
        ],
        child: MaterialApp(
          home: Scaffold(body: PostCard(post: post, isOwnPost: true)),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('flagged by the community'), findsOneWidget);
    expect(find.text('2h ago'), findsOneWidget);
    expect(find.text('Appeal decision'), findsOneWidget);
    expect(find.text('Flagged'), findsOneWidget);
  });

  testWidgets('shows pending appeal message for hidden own post', (
    tester,
  ) async {
    final post = _buildPost(
      id: 'p2',
      status: ModerationStatus.hidden,
      appealStatus: 'pending',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          postInsightsProvider(
            post.id,
          ).overrideWith((ref) => Future.value(InsightsAccessDenied())),
        ],
        child: MaterialApp(
          home: Scaffold(body: PostCard(post: post, isOwnPost: true)),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.textContaining('blocked pending an appeal outcome'),
      findsOneWidget,
    );
    expect(find.text('Appeal Pending'), findsOneWidget);
  });

  testWidgets('shows hidden placeholder for non-own hidden post', (
    tester,
  ) async {
    final post = _buildPost(id: 'p3', status: ModerationStatus.hidden);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: PostCard(
            post: Post(
              id: 'p3',
              title: 'Title',
              content: 'Hidden content',
              author: Author(id: 'a1', displayName: 'Alice'),
              createdAt: DateTime(2024, 1, 1),
              moderationStatus: ModerationStatus.hidden,
            ),
            isOwnPost: false,
          ),
        ),
      ),
    );

    expect(find.text('Content Hidden'), findsOneWidget);
    expect(find.text('Hidden content'), findsNothing);
  });

  testWidgets('renders media gallery for multiple images', (tester) async {
    final post = _buildPost(
      id: 'p4',
      status: ModerationStatus.clean,
      mediaUrls: const [
        'https://example.com/a.jpg',
        'https://example.com/b.jpg',
      ],
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: PostCard(post: post)),
      ),
    );

    expect(find.byType(Image), findsNWidgets(2));
  });
}
