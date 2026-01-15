import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:asora/design_system/index.dart';

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
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = true;
  });

  testWidgets('LythButton variants - light', (tester) async {
    await _pumpGolden(
      tester,
      LythausTheme.light(),
      const Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            LythButton(label: 'Primary', variant: LythButtonVariant.primary),
            SizedBox(height: 12),
            LythButton(
              label: 'Secondary',
              variant: LythButtonVariant.secondary,
            ),
            SizedBox(height: 12),
            LythButton(label: 'Tertiary', variant: LythButtonVariant.tertiary),
            SizedBox(height: 12),
            LythButton(
              label: 'Destructive',
              variant: LythButtonVariant.destructive,
            ),
            SizedBox(height: 12),
            LythButton(
              label: 'Loading',
              variant: LythButtonVariant.primary,
              isLoading: true,
            ),
          ],
        ),
      ),
    );

    await expectLater(
      find.byType(Scaffold),
      matchesGoldenFile('goldens/lyth_button_light.png'),
    );
  });

  testWidgets('LythButton variants - dark', (tester) async {
    await _pumpGolden(
      tester,
      LythausTheme.dark(),
      const Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            LythButton(label: 'Primary', variant: LythButtonVariant.primary),
            SizedBox(height: 12),
            LythButton(
              label: 'Secondary',
              variant: LythButtonVariant.secondary,
            ),
            SizedBox(height: 12),
            LythButton(label: 'Tertiary', variant: LythButtonVariant.tertiary),
            SizedBox(height: 12),
            LythButton(
              label: 'Destructive',
              variant: LythButtonVariant.destructive,
            ),
            SizedBox(height: 12),
            LythButton(
              label: 'Loading',
              variant: LythButtonVariant.primary,
              isLoading: true,
            ),
          ],
        ),
      ),
    );

    await expectLater(
      find.byType(Scaffold),
      matchesGoldenFile('goldens/lyth_button_dark.png'),
    );
  });
}
