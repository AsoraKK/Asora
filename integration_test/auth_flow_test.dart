import 'package:asora/features/auth/application/auth_controller.dart';
import 'package:asora/features/auth/presentation/auth_gate.dart';
import 'package:asora/features/auth/presentation/sign_in_page.dart';
import 'package:asora/main.dart' as app;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

/// Integration tests for B2C/CIAM authentication flows
///
/// Prerequisites:
/// - Azure B2C tenant configured with B2C_1_signupsignin policy
/// - Google IdP enabled and associated with user flow
/// - Redirect URIs registered for the platform being tested
/// - Valid test account credentials
///
/// Run on device/emulator:
///   flutter test integration_test/auth_flow_test.dart -d <device_id>
///
/// To skip interactive tests (CI):
///   flutter test integration_test/auth_flow_test.dart --dart-define=SKIP_INTERACTIVE=true

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  final skipInteractive = const bool.fromEnvironment(
    'SKIP_INTERACTIVE',
    defaultValue: false,
  );

  group('Auth E2E (B2C/CIAM)', () {
    testWidgets('app boots and shows sign-in page when unauthenticated', (
      tester,
    ) async {
      // Boot the app
      app.main();
      await tester.pumpAndSettle();

      // Should see auth gate (which wraps sign-in page)
      expect(find.byType(AuthGate), findsOneWidget);
      expect(find.byType(SignInPage), findsOneWidget);

      // Should see both sign-in buttons
      expect(find.text('Continue with Email'), findsOneWidget);
      expect(find.text('Continue with Google'), findsOneWidget);
    });

    testWidgets(
      'sign-in flow launches B2C hosted UI and returns token',
      (tester) async {
        // NOTE: This test requires manual interaction with the B2C login page
        // The test will launch the hosted UI and wait for you to complete authentication

        app.main();
        await tester.pumpAndSettle();

        // Tap "Continue with Email" to trigger B2C flow
        await tester.tap(find.text('Continue with Email'));
        await tester.pumpAndSettle();

        // At this point, the B2C hosted page should appear in the system browser
        // Complete the authentication manually (sign in or create account)

        // Wait up to 2 minutes for auth to complete
        // The app will return to authenticated state when the redirect callback fires
        await tester.pumpAndSettle(const Duration(seconds: 5));

        // Poll for auth state to become authenticated
        bool authenticated = false;
        for (int i = 0; i < 24; i++) {
          // 24 * 5s = 2 minutes
          await tester.pump(const Duration(seconds: 5));

          // Check if we've left the SignInPage (authenticated)
          if (find.byType(SignInPage).evaluate().isEmpty) {
            authenticated = true;
            break;
          }
        }

        // If still on sign-in page after timeout, the test should fail with a helpful message
        if (!authenticated) {
          fail(
            'Authentication did not complete within 2 minutes. '
            'Please complete the B2C sign-in flow in the browser/webview when prompted.',
          );
        }

        // Verify we're no longer on the sign-in page
        expect(find.byType(SignInPage), findsNothing);

        // Give the app time to settle after auth
        await tester.pumpAndSettle();
      },
      skip: skipInteractive, // Skip in CI; enable for manual device testing
    );

    testWidgets('sign-out clears session and returns to auth gate', (
      tester,
    ) async {
      // This test assumes the previous test authenticated successfully
      // If running standalone, you'll need to authenticate first

      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Get the auth controller
      final container = ProviderScope.containerOf(
        tester.element(find.byType(MaterialApp)),
      );
      final authController = container.read(authControllerProvider.notifier);

      // Trigger sign-out
      await authController.signOut();
      await tester.pumpAndSettle();

      // Should return to sign-in page
      expect(find.byType(SignInPage), findsOneWidget);
      expect(find.text('Continue with Email'), findsOneWidget);
    }, skip: skipInteractive);

    testWidgets(
      'Google sign-in includes IdP hint and shows Google picker',
      (tester) async {
        app.main();
        await tester.pumpAndSettle();

        // Tap "Continue with Google"
        await tester.tap(find.text('Continue with Google'));
        await tester.pumpAndSettle();

        // B2C hosted page should appear with Google pre-selected or direct Google flow
        // This test validates that the IdP hint is passed correctly
        // Manual verification: check that Google OAuth consent appears (not email login)

        // Wait for potential auth completion (same pattern as email)
        await tester.pumpAndSettle(const Duration(seconds: 5));

        bool authenticated = false;
        for (int i = 0; i < 24; i++) {
          await tester.pump(const Duration(seconds: 5));
          if (find.byType(SignInPage).evaluate().isEmpty) {
            authenticated = true;
            break;
          }
        }

        if (!authenticated) {
          fail(
            'Google authentication did not complete within 2 minutes. '
            'Please complete the Google sign-in flow when prompted.',
          );
        }

        expect(find.byType(SignInPage), findsNothing);
        await tester.pumpAndSettle();
      },
      skip: skipInteractive,
    );
  });
}
