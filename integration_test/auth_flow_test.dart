import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

// NOTE: This is a scaffold for interactive, end-to-end auth tests.
// It is intentionally skipped by default because it requires a configured
// emulator/simulator, valid CIAM (B2C) configuration, and user interaction
// or seeded test accounts. See the README notes in this file.

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Auth E2E (B2C/CIAM)', () {
    testWidgets(
      'sign-in (email or Google) happy path updates state',
      (tester) async {
        // TODO: Implement full app boot and drive SignInPage flow.
        // Suggested approach:
        // 1. Pump the app with a mock config endpoint or real dev backend.
        // 2. Tap "Continue with Email" or "Continue with Google".
        // 3. Complete the hosted UI flow in emulator.
        // 4. Verify authenticated UI is shown and token persisted.
        expect(true, isTrue);
      },
      skip:
          true, // Requires device/emulator, configured redirect URIs, and test user
    );

    testWidgets('sign-out clears session and returns to auth gate', (
      tester,
    ) async {
      // TODO: After sign-in, navigate to settings/profile screen and trigger sign-out.
      // Verify that the auth gate is displayed and token storage is cleared.
      expect(true, isTrue);
    }, skip: true);
  });
}
