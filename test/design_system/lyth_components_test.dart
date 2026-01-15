import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:asora/design_system/index.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('LythWordmark uses onSurface and glow layer', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: LythausTheme.light(),
        home: const Scaffold(body: Center(child: LythWordmark())),
      ),
    );
    await tester.pump();

    final texts = tester.widgetList<Text>(find.text('Lyt haus')).toList();
    expect(texts.length, 2);

    final context = tester.element(find.byType(LythWordmark));
    final expectedColor = Theme.of(
      context,
    ).colorScheme.onSurface.withValues(alpha: 0.9);
    expect(texts.last.style?.color, expectedColor);

    expect(texts.first.style?.shadows, isNotEmpty);
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
