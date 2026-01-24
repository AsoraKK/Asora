import 'package:asora/features/admin/ui/widgets/device_emulator.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('device emulator updates orientation and device selection', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    tester.binding.platformDispatcher.textScaleFactorTestValue = 0.8;
    addTearDown(
      () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: DeviceEmulator(child: SizedBox(key: Key('preview-child'))),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Device Preview'), findsOneWidget);
    expect(find.textContaining('@ 3.0x'), findsOneWidget);

    await tester.tap(find.text('Landscape'));
    await tester.pumpAndSettle();
    expect(find.textContaining('844'), findsOneWidget);

    await tester.tap(find.byType(DropdownButtonFormField<DevicePreset>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Pixel 7').last);
    await tester.pumpAndSettle();

    expect(find.textContaining('@ 2.75x'), findsOneWidget);
  });

  testWidgets('device emulator toggles chrome settings and scale', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    tester.binding.platformDispatcher.textScaleFactorTestValue = 0.8;
    addTearDown(
      () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: DeviceEmulator(child: SizedBox(key: Key('preview-child'))),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final notchSwitch = find.widgetWithText(
      SwitchListTile,
      'Notch / Dynamic Island',
    );
    final homeSwitch = find.widgetWithText(SwitchListTile, 'Home Indicator');

    await tester.tap(notchSwitch);
    await tester.pumpAndSettle();
    await tester.tap(homeSwitch);
    await tester.pumpAndSettle();

    await tester.drag(find.byType(Slider), const Offset(200, 0));
    await tester.pumpAndSettle();

    expect(find.textContaining('Scale:'), findsOneWidget);
  });
}
