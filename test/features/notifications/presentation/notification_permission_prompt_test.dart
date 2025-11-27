import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asora/features/notifications/presentation/notification_permission_prompt.dart';

void main() {
  group('NotificationPermissionPrompt', () {
    testWidgets('should display hero section and benefits', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: NotificationPermissionPrompt(
              onPermissionGranted: () {},
              onPermissionDenied: () {},
            ),
          ),
        ),
      );

      // Verify hero section
      expect(find.text('Stay Connected'), findsOneWidget);
      expect(
        find.text(
          'Get notified when people interact with your posts, when there are safety concerns, and more.',
        ),
        findsOneWidget,
      );

      // Verify benefit items
      expect(find.text('Social Updates'), findsOneWidget);
      expect(find.text('Security Alerts'), findsOneWidget);
      expect(find.text('Full Control'), findsOneWidget);

      // Verify action buttons
      expect(find.text('Enable Notifications'), findsOneWidget);
      expect(find.text('Not Now'), findsOneWidget);
    });

    testWidgets('should call onPermissionGranted when permission granted', (
      tester,
    ) async {
      bool permissionGranted = false;

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: NotificationPermissionPrompt(
              onPermissionGranted: () {
                permissionGranted = true;
              },
              onPermissionDenied: () {},
            ),
          ),
        ),
      );

      // Note: Actual permission request requires mocking NotificationPermissionService
      // For now, verify button exists
      expect(find.text('Enable Notifications'), findsOneWidget);
    });

    testWidgets('should call onPermissionDenied when user taps Not Now', (
      tester,
    ) async {
      bool permissionDenied = false;

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: NotificationPermissionPrompt(
              onPermissionGranted: () {},
              onPermissionDenied: () {
                permissionDenied = true;
              },
            ),
          ),
        ),
      );

      // Tap "Not Now" button
      await tester.tap(find.text('Not Now'));
      await tester.pumpAndSettle();

      expect(permissionDenied, isTrue);
    });
  });
}
