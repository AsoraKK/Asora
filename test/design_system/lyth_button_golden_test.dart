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
  // Use pump with duration instead of pumpAndSettle to avoid animation timeout
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets(
    'LythButton variants - light',
    (tester) async {
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
              LythButton(
                label: 'Tertiary',
                variant: LythButtonVariant.tertiary,
              ),
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
    },
    skip: true, // Golden tests require fonts bundled in assets - skipped in CI
  );

  testWidgets(
    'LythButton variants - dark',
    (tester) async {
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
              LythButton(
                label: 'Tertiary',
                variant: LythButtonVariant.tertiary,
              ),
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
    },
    skip: true, // Golden tests require fonts bundled in assets - skipped in CI
  );
}
