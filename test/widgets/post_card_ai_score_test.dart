import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:asora/widgets/post_card.dart';
import 'package:asora/features/moderation/domain/appeal.dart';

void main() {
  testWidgets('PostCard does not render AI score badges', (tester) async {
    final post = Post(
      id: 'post-1',
      title: 'Test Post',
      content: 'Test content',
      author: const Author(
        id: 'author-1',
        displayName: 'Tester',
        reputationScore: 120,
      ),
      createdAt: DateTime(2025, 1, 1),
      moderationStatus: ModerationStatus.flagged,
      aiScore: 0.92,
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          home: Scaffold(body: PostCard(post: post, showAiScores: true)),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.textContaining('AI'), findsNothing);
    expect(find.textContaining('%'), findsNothing);
  });
}
