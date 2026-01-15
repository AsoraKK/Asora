import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:asora/design_system/index.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('LythWordmarkStatic uses onSurface color', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: LythausTheme.light(),
        // Use LythWordmarkStatic to avoid timer issues in tests
        home: const Scaffold(body: Center(child: LythWordmarkStatic())),
      ),
    );
    await tester.pump();

    // LythWordmarkStatic has a single text widget (no glow layer)
    expect(find.text('Lyt haus'), findsOneWidget);

    final context = tester.element(find.byType(LythWordmarkStatic));
    final expectedColor = Theme.of(
      context,
    ).colorScheme.onSurface.withValues(alpha: 0.9);

    final text = tester.widget<Text>(find.text('Lyt haus'));
    expect(text.style?.color, expectedColor);
  });

  testWidgets('LythButton primary uses colorScheme.primary', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: LythausTheme.light(),
        home: Scaffold(
          body: Center(
            child: LythButton.primary(label: 'Continue', onPressed: () {}),
          ),
        ),
      ),
    );
    await tester.pump();

    final element = tester.element(find.byType(ElevatedButton));
    final scheme = Theme.of(element).colorScheme;
    final style = ElevatedButtonTheme.of(element).style;
    final background = style?.backgroundColor?.resolve(<WidgetState>{});

    expect(background, scheme.primary);
  });
}
