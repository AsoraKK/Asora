import 'package:asora/features/feed/application/post_creation_providers.dart';
import 'package:asora/features/feed/presentation/create_post_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('guest users can view create screen but cannot submit', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [canCreatePostProvider.overrideWithValue(false)],
        child: const MaterialApp(home: CreatePostScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Please sign in to create a post.'), findsOneWidget);
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton).first).onPressed,
      isNull,
    );
  });

  testWidgets('authenticated users can compose and submit when valid', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [canCreatePostProvider.overrideWithValue(true)],
        child: const MaterialApp(home: CreatePostScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Please sign in to create a post.'), findsNothing);
    await tester.enterText(find.byType(TextField).first, 'Hello Lythaus');
    await tester.pump();

    final postButton = find.widgetWithText(FilledButton, 'Post');
    expect(postButton, findsOneWidget);
    expect(tester.widget<FilledButton>(postButton).onPressed, isNotNull);
  });
}
