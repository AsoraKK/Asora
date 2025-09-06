import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:asora/features/moderation/review_queue_screen.dart';

void main() {
  testWidgets('renders empty state for no permission', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: ReviewQueueScreen(baseUrl: 'https://example.com', accessToken: 't', userClaims: {'role': 'user'})));
    expect(find.text('Insufficient permissions.'), findsOneWidget);
  });

  testWidgets('renders title', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: ReviewQueueScreen(baseUrl: 'https://example.com', accessToken: 't', userClaims: {'role': 'moderator'})));
    expect(find.byKey(const Key('moderation-title')), findsOneWidget);
  });
}
