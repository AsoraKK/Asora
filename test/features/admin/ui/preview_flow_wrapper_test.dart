import 'package:asora/features/admin/ui/app_preview_screen.dart';
import 'package:asora/features/admin/ui/widgets/preview_flow_wrapper.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('preview create post blocks spam content', (tester) async {
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
}
