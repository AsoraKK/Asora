import 'package:asora/features/admin/application/live_test_mode_provider.dart';
import 'package:asora/features/admin/ui/app_preview_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('app preview screen switches flows and resets state', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1400, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    tester.binding.platformDispatcher.textScaleFactorTestValue = 0.5;
    addTearDown(
      () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
    );

    final container = ProviderContainer();
    container.read(previewFlowProvider.notifier).state =
        PreviewFlow.onboardingFeed;
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: AppPreviewScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Flow Selector'), findsOneWidget);

    await tester.tap(find.text('Create Post').first);
    await tester.pumpAndSettle();
    expect(container.read(previewFlowProvider), PreviewFlow.createPost);
    expect(
      find.textContaining('Simulating Hive AI moderation'),
      findsOneWidget,
    );

    final beforeReset = container.read(previewResetKeyProvider);
    await tester.tap(find.byTooltip('Reset preview state'));
    await tester.pumpAndSettle();
    final afterReset = container.read(previewResetKeyProvider);
    expect(afterReset, greaterThan(beforeReset));
    expect(find.text('Preview state reset'), findsOneWidget);
  });

  testWidgets('live mode toggle updates provider and shows snackbar', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1400, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    tester.binding.platformDispatcher.textScaleFactorTestValue = 0.5;
    addTearDown(
      () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
    );

    final container = ProviderContainer();
    container.read(previewFlowProvider.notifier).state =
        PreviewFlow.onboardingFeed;
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: AppPreviewScreen()),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Live Test Mode'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Enable Live Mode'));
    await tester.pumpAndSettle();

    expect(container.read(liveTestModeProvider).isEnabled, isTrue);
    expect(find.textContaining('Live Test Mode enabled'), findsOneWidget);
  });
}
