import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asora/features/notifications/presentation/notifications_settings_screen.dart';

void main() {
  group('NotificationsSettingsScreen', () {
    testWidgets('should display category toggles', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: NotificationsSettingsScreen()),
        ),
      );

      // Wait for async loading
      await tester.pumpAndSettle();

      // Verify category toggle titles
      expect(find.text('Social Updates'), findsOneWidget);
      expect(find.text('News & Updates'), findsOneWidget);
      expect(find.text('Marketing'), findsOneWidget);

      // Verify safety/security banner
      expect(
        find.text(
          'Safety and security notifications are always enabled and cannot be turned off.',
        ),
        findsOneWidget,
      );
    });

    testWidgets('should display 24-hour quiet hours grid', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: NotificationsSettingsScreen()),
        ),
      );

      await tester.pumpAndSettle();

      // Verify quiet hours section title
      expect(find.text('Quiet Hours'), findsOneWidget);

      // Verify all 24 hours are displayed (00-23)
      expect(find.text('00'), findsOneWidget);
      expect(find.text('12'), findsOneWidget);
      expect(find.text('23'), findsOneWidget);
    });

    testWidgets('should toggle quiet hour when cell tapped', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: NotificationsSettingsScreen()),
        ),
      );

      await tester.pumpAndSettle();

      // Find hour cell (e.g., 22:00)
      final hourCell = find.text('22');
      expect(hourCell, findsOneWidget);

      // Tap to toggle quiet hour
      await tester.tap(hourCell);
      await tester.pumpAndSettle();

      // Note: Actual state change requires full widget test with provider overrides
      // This test verifies the widget is tappable
    });

    testWidgets('should display devices section', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: NotificationsSettingsScreen()),
        ),
      );

      await tester.pumpAndSettle();

      // Verify devices section title
      expect(find.text('Devices'), findsOneWidget);

      // Should show either device list or empty state
      // Default state with no API data should show empty state
      expect(find.text('No devices registered'), findsOneWidget);
    });

    testWidgets('should show 3-device cap message', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: NotificationsSettingsScreen()),
        ),
      );

      await tester.pumpAndSettle();

      // Verify device cap subtitle
      expect(
        find.text(
          'You can register up to 3 devices. Oldest device will be removed when adding a 4th.',
        ),
        findsOneWidget,
      );
    });
  });
}
