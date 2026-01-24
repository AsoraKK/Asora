import 'package:asora/features/admin/ui/control_panel_shell.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('control panel shell switches tabs', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1400, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: ControlPanelShell())),
    );
    await tester.pumpAndSettle();

    expect(find.text('Flow Selector'), findsOneWidget);

    await tester.tap(find.text('Analytics'));
    await tester.pumpAndSettle();

    expect(find.text('Analytics'), findsWidgets);
    expect(
      find.text('Usage metrics and insights coming soon.'),
      findsOneWidget,
    );
  });
}
