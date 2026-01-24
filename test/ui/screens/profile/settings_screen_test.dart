import 'package:asora/state/providers/settings_providers.dart';
import 'package:asora/ui/screens/profile/settings_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('SettingsScreen toggles update preferences', (tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: SettingsScreen()),
      ),
    );
    await tester.pumpAndSettle();

    final leftHandedTile = find.widgetWithText(
      SwitchListTile,
      'Left-handed mode (mirror nav)',
    );
    final swipeTile = find.widgetWithText(
      SwitchListTile,
      'Horizontal swipe between feeds',
    );
    final hapticsTile = find.widgetWithText(SwitchListTile, 'Haptics');

    expect(tester.widget<SwitchListTile>(leftHandedTile).value, isFalse);
    expect(tester.widget<SwitchListTile>(swipeTile).value, isTrue);
    expect(tester.widget<SwitchListTile>(hapticsTile).value, isTrue);

    await tester.tap(leftHandedTile);
    await tester.tap(swipeTile);
    await tester.tap(hapticsTile);
    await tester.pumpAndSettle();

    final state = container.read(settingsProvider);
    expect(state.leftHandedMode, isTrue);
    expect(state.horizontalSwipeEnabled, isFalse);
    expect(state.hapticsEnabled, isFalse);
  });
}
