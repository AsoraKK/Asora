import 'package:asora/core/routing/deeplink_router.dart';
import 'package:asora/features/auth/presentation/invite_redeem_screen.dart';
import 'package:asora/features/notifications/presentation/notifications_settings_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Future<void> pumpRouterHost(WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: Scaffold(body: Text('Home host')),
        ),
      ),
    );
  }

  testWidgets('navigates to notification settings deep-link', (tester) async {
    await pumpRouterHost(tester);

    final context = tester.element(find.text('Home host'));
    DeeplinkRouter.navigate(context, '/settings/notifications');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.byType(NotificationsSettingsScreen), findsOneWidget);
  });

  testWidgets('navigates to invite redemption deep-link', (tester) async {
    await pumpRouterHost(tester);

    final context = tester.element(find.text('Home host'));
    DeeplinkRouter.navigate(context, '/invite/ABCD1234');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.byType(InviteRedeemScreen), findsOneWidget);
  });

  testWidgets('unknown deep-link does not navigate', (tester) async {
    await pumpRouterHost(tester);

    final context = tester.element(find.text('Home host'));
    DeeplinkRouter.navigate(context, '/unsupported/path');
    await tester.pump();

    expect(find.text('Home host'), findsOneWidget);
    expect(find.byType(Scaffold), findsOneWidget);
  });

  testWidgets('handleNotificationTap routes using deeplink payload', (
    tester,
  ) async {
    await pumpRouterHost(tester);

    final context = tester.element(find.text('Home host'));
    DeeplinkRouter.handleNotificationTap(context, const {
      'deeplink': '/settings/notifications',
    });
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.byType(NotificationsSettingsScreen), findsOneWidget);
  });
}
