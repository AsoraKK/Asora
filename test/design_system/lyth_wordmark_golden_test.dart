import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:asora/design_system/index.dart';
import '../golden_test_utils.dart';

Future<void> _pumpGolden(
  WidgetTester tester,
  ThemeData theme,
  Widget child,
) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: theme,
      home: Scaffold(
        backgroundColor: theme.colorScheme.surface,
        body: Center(child: child),
      ),
    ),
  );
  // Use pump with duration instead of pumpAndSettle to avoid animation timeout
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  setUpAll(() async {
    await loadFontsForGoldenTests();
  });

  testWidgets('LythWordmark static - light', (tester) async {
    await _pumpGolden(
      tester,
      LythausTheme.light(),
      const LythWordmarkStatic(size: LythWordmarkSize.large),
    );

    await expectLater(
      find.byType(Scaffold),
      matchesGoldenFile('goldens/lyth_wordmark_light.png'),
    );
  });

  testWidgets('LythWordmark static - dark', (tester) async {
    await _pumpGolden(
      tester,
      LythausTheme.dark(),
      const LythWordmarkStatic(size: LythWordmarkSize.large),
    );

    await expectLater(
      find.byType(Scaffold),
      matchesGoldenFile('goldens/lyth_wordmark_dark.png'),
    );
  });
}
