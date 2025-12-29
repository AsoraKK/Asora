import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:asora/core/security/device_security_service.dart';
import 'package:asora/screens/security_debug_screen.dart';

void main() {
  testWidgets('security debug screen renders dev controls', (tester) async {
    final state = DeviceSecurityState(
      isRootedOrJailbroken: false,
      isEmulator: true,
      isDebugBuild: true,
      lastCheckedAt: DateTime(2024, 1, 1),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          deviceSecurityStateProvider.overrideWith((ref) async => state),
        ],
        child: const MaterialApp(home: SecurityDebugScreen()),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Security Debug'), findsWidgets);
    expect(find.text('Device Security State'), findsOneWidget);

    await tester.tap(
      find.widgetWithText(SwitchListTile, 'Simulate Rooted Device'),
    );
    await tester.pump();
    expect(find.textContaining('Rooted simulation'), findsOneWidget);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Test TLS Pinning'));
    await tester.pumpAndSettle();
    expect(find.text('TLS Pinning Status'), findsOneWidget);

    await tester.tap(find.text('Close'));
    await tester.pumpAndSettle();
  });
}
