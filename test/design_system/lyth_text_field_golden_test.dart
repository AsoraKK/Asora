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

  testWidgets('LythTextField states - light', (tester) async {
    await _pumpGolden(
      tester,
      LythausTheme.light(),
      Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            LythTextField(label: 'Email', placeholder: 'you@lythaus.co'),
            const SizedBox(height: 16),
            LythTextField(
              label: 'Email',
              placeholder: 'you@lythaus.co',
              errorText: 'Invalid email',
            ),
            const SizedBox(height: 16),
            LythTextField(
              label: 'Email',
              placeholder: 'you@lythaus.co',
              disabled: true,
            ),
          ],
        ),
      ),
    );

    await expectLater(
      find.byType(Scaffold),
      matchesGoldenFile('goldens/lyth_text_field_light.png'),
    );
  });

  testWidgets('LythTextField states - dark', (tester) async {
    await _pumpGolden(
      tester,
      LythausTheme.dark(),
      Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            LythTextField(label: 'Email', placeholder: 'you@lythaus.co'),
            const SizedBox(height: 16),
            LythTextField(
              label: 'Email',
              placeholder: 'you@lythaus.co',
              errorText: 'Invalid email',
            ),
            const SizedBox(height: 16),
            LythTextField(
              label: 'Email',
              placeholder: 'you@lythaus.co',
              disabled: true,
            ),
          ],
        ),
      ),
    );

    await expectLater(
      find.byType(Scaffold),
      matchesGoldenFile('goldens/lyth_text_field_dark.png'),
    );
  });
}
