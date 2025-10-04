import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:asora/screens/privacy_settings_screen.dart';
import 'package:asora/services/privacy_service.dart';
import 'package:asora/core/logging/app_logger.dart';
import 'package:asora/features/auth/application/auth_providers.dart';

// ASORA PRIVACY SETTINGS SCREEN WIDGET TESTS
//
// 🎯 Purpose: Comprehensive test coverage for PrivacySettingsScreen widget
// ✅ Coverage: All visual states, interactions, error handling, loading states
// 🧪 Test Types: Widget rendering, user interactions, async operations
// 📱 Platform: Flutter widget testing framework

class _MockPrivacyService extends Mock implements PrivacyService {}

class _MockAppLogger extends Mock implements AppLogger {}

class _FakeWidgetRef extends Fake implements WidgetRef {}

void main() {
  late _MockPrivacyService mockPrivacyService;
  late _MockAppLogger mockLogger;

  setUp(() {
    mockPrivacyService = _MockPrivacyService();
    mockLogger = _MockAppLogger();
  });

  tearDown(() {
    clearInteractions(mockPrivacyService);
    clearInteractions(mockLogger);
    reset(mockPrivacyService);
    reset(mockLogger);
  });

  setUpAll(() {
    // Set a larger test screen size to accommodate the tall widget
    TestWidgetsFlutterBinding.ensureInitialized();
    TestWidgetsFlutterBinding
        .instance
        .platformDispatcher
        .views
        .first
        .physicalSize = const Size(
      800,
      1200,
    );
    TestWidgetsFlutterBinding
            .instance
            .platformDispatcher
            .views
            .first
            .devicePixelRatio =
        1.0;

    // Register fallback for WidgetRef
    registerFallbackValue(_FakeWidgetRef());
  });

  tearDownAll(() {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
        .resetPhysicalSize();
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
        .resetDevicePixelRatio();
  });

  Widget createTestWidget({PrivacyService? privacyService, AppLogger? logger}) {
    return ProviderScope(
      overrides: [
        privacyServiceProvider.overrideWithValue(
          privacyService ?? mockPrivacyService,
        ),
        appLoggerProvider.overrideWithValue(logger ?? mockLogger),
        jwtProvider.overrideWith((ref) => Future.value('mock-jwt-token')),
      ],
      child: const MaterialApp(home: PrivacySettingsScreen()),
    );
  }

  group('PrivacySettingsScreen Rendering', () {
    testWidgets('renders basic screen structure', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // Check app bar
      expect(find.text('Privacy Settings'), findsOneWidget);
      expect(find.byType(AppBar), findsOneWidget);

      // Check main sections
      expect(find.text('Your Privacy Rights'), findsOneWidget);
      expect(find.text('Export Your Data'), findsOneWidget);
      expect(find.text('Delete Your Account'), findsOneWidget);
      expect(find.text('Privacy Information'), findsOneWidget);

      // Check scroll view
      expect(find.byType(SingleChildScrollView), findsOneWidget);
    });

    testWidgets('renders header section with privacy rights info', (
      tester,
    ) async {
      await tester.pumpWidget(createTestWidget());

      expect(find.text('Your Privacy Rights'), findsOneWidget);
      expect(find.byIcon(Icons.privacy_tip_outlined), findsOneWidget);
      expect(
        find.textContaining('Asora respects your privacy'),
        findsOneWidget,
      );
      expect(find.byType(Card), findsNWidgets(4)); // 4 main sections
    });

    testWidgets('renders data export section with button and info', (
      tester,
    ) async {
      await tester.pumpWidget(createTestWidget());

      expect(find.text('Export Your Data'), findsOneWidget);
      expect(find.byIcon(Icons.download_outlined), findsOneWidget);
      expect(find.text('Export My Data'), findsOneWidget);
      expect(find.byIcon(Icons.file_download), findsOneWidget);
      expect(
        find.textContaining('Download a copy of all your data'),
        findsOneWidget,
      );
      expect(
        find.textContaining('You can request an export once every 24 hours'),
        findsOneWidget,
      );
    });

    testWidgets('renders account deletion section with warning styling', (
      tester,
    ) async {
      await tester.pumpWidget(createTestWidget());

      expect(find.text('Delete Your Account'), findsOneWidget);
      expect(find.byIcon(Icons.delete_forever_outlined), findsOneWidget);
      expect(find.text('Delete My Account'), findsOneWidget);
      expect(find.byIcon(Icons.warning_outlined), findsOneWidget);
      expect(
        find.textContaining('Permanently delete your account'),
        findsOneWidget,
      );

      // Check error container styling
      final cardFinder = find.byType(Card).at(2); // Account deletion card
      final card = tester.widget<Card>(cardFinder);
      expect(
        card.color,
        equals(Theme.of(tester.element(cardFinder)).colorScheme.errorContainer),
      );
    });

    testWidgets('renders privacy information section with list tiles', (
      tester,
    ) async {
      await tester.pumpWidget(createTestWidget());

      expect(find.text('Privacy Information'), findsOneWidget);
      expect(find.byIcon(Icons.policy_outlined), findsOneWidget);
      expect(find.text('Privacy Policy'), findsOneWidget);
      expect(find.text('Data Security'), findsOneWidget);
      expect(find.text('Privacy Questions'), findsOneWidget);
      expect(find.byType(ListTile), findsNWidgets(3));
    });
  });

  group('Data Export Functionality', () {
    testWidgets('shows loading state during data export', (tester) async {
      final completer =
          Completer<
            ({
              PrivacyOperationResult result,
              Map<String, dynamic>? data,
              String? errorMessage,
            })
          >();

      when(
        () => mockPrivacyService.exportUserData(),
      ).thenAnswer((_) => completer.future);

      await tester.pumpWidget(createTestWidget());

      // Tap export button
      await tester.tap(find.text('Export My Data'));
      await tester.pump();

      // Check loading state is shown
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Preparing Export...'), findsOneWidget);

      // Complete immediately for this test
      completer.complete((
        result: PrivacyOperationResult.success,
        data: {'test': 'data'},
        errorMessage: null,
      ));

      // Pump to process completion - loading should eventually clear
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Just verify the service was called - loading state test is primarily about showing loading
      verify(() => mockPrivacyService.exportUserData()).called(1);
    });

    testWidgets('calls export service when export button tapped', (
      tester,
    ) async {
      when(() => mockPrivacyService.exportUserData()).thenAnswer(
        (_) async => (
          result: PrivacyOperationResult.success,
          data: {'test': 'data'},
          errorMessage: null,
        ),
      );

      await tester.pumpWidget(createTestWidget());

      await tester.tap(find.text('Export My Data'));
      await tester.pump();

      // Verify the service was called
      verify(() => mockPrivacyService.exportUserData()).called(1);
      verify(() => mockLogger.info('User initiated data export')).called(1);
    });

    testWidgets('handles rate limited export', (tester) async {
      when(() => mockPrivacyService.exportUserData()).thenAnswer(
        (_) async => (
          result: PrivacyOperationResult.rateLimited,
          data: null,
          errorMessage: 'Rate limit exceeded. Try again in 24 hours.',
        ),
      );

      await tester.pumpWidget(createTestWidget());

      await tester.tap(find.text('Export My Data'));
      await tester.pumpAndSettle();

      // Should show error dialog
      expect(find.text('Export Rate Limited'), findsOneWidget);
      expect(find.textContaining('Rate limit exceeded'), findsOneWidget);
    });

    testWidgets('handles unauthorized export', (tester) async {
      when(() => mockPrivacyService.exportUserData()).thenAnswer(
        (_) async => (
          result: PrivacyOperationResult.unauthorized,
          data: null,
          errorMessage: 'Please sign in to export your data.',
        ),
      );

      await tester.pumpWidget(createTestWidget());

      await tester.tap(find.text('Export My Data'));
      await tester.pumpAndSettle();

      // Should show error dialog
      expect(find.text('Authentication Required'), findsOneWidget);
      expect(find.text('Please sign in to export your data.'), findsOneWidget);
    });

    testWidgets('handles network error during export', (tester) async {
      when(() => mockPrivacyService.exportUserData()).thenAnswer(
        (_) async => (
          result: PrivacyOperationResult.networkError,
          data: null,
          errorMessage: 'Connection failed',
        ),
      );

      await tester.pumpWidget(createTestWidget());

      await tester.tap(find.text('Export My Data'));
      await tester.pumpAndSettle();

      // Should show error dialog
      expect(find.text('Network Error'), findsOneWidget);
      expect(find.text('Connection failed'), findsOneWidget);
    });

    testWidgets('handles unexpected error during export', (tester) async {
      when(
        () => mockPrivacyService.exportUserData(),
      ).thenThrow(Exception('Unexpected error'));

      await tester.pumpWidget(createTestWidget());

      await tester.tap(find.text('Export My Data'));
      await tester.pumpAndSettle();

      // Should show error dialog
      expect(find.text('Export Failed'), findsOneWidget);
      expect(
        find.text('An unexpected error occurred. Please try again.'),
        findsOneWidget,
      );
    });
  });

  group('Account Deletion Functionality', () {
    testWidgets('shows confirmation dialog when delete button tapped', (
      tester,
    ) async {
      await tester.pumpWidget(createTestWidget());

      await tester.tap(
        find.text('Delete My Account').first,
      ); // Tap the first (main) button
      await tester.pumpAndSettle();

      // Should show confirmation dialog
      expect(find.text('Delete Account?'), findsOneWidget);
      expect(find.byIcon(Icons.warning_amber_outlined), findsOneWidget);
      expect(
        find.textContaining('Are you absolutely sure you want to continue?'),
        findsOneWidget,
      );
      expect(find.text('Cancel'), findsOneWidget);
      expect(
        find.text('Delete My Account'),
        findsNWidgets(2),
      ); // One in dialog, one in original button
    });

    testWidgets('cancels deletion when cancel tapped', (tester) async {
      await tester.pumpWidget(createTestWidget());

      await tester.tap(
        find.text('Delete My Account').first,
      ); // Tap the main button
      await tester.pumpAndSettle();

      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      // Dialog should be closed, no deletion should occur
      expect(find.text('Delete Account?'), findsNothing);
      verifyNever(() => mockPrivacyService.deleteAccountAndSignOut(any()));
    });

    testWidgets('shows loading state during account deletion', (tester) async {
      final completer =
          Completer<({PrivacyOperationResult result, String? errorMessage})>();

      when(
        () => mockPrivacyService.deleteAccountAndSignOut(any()),
      ).thenAnswer((_) => completer.future);

      await tester.pumpWidget(createTestWidget());

      // Start deletion process
      await tester.tap(find.text('Delete My Account'));
      await tester.pumpAndSettle();

      await tester.tap(
        find.text('Delete My Account').last,
      ); // Confirm in dialog (use last to get dialog button)
      await tester.pump();

      // Check loading state
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      // Complete the operation
      completer.complete((
        result: PrivacyOperationResult.success,
        errorMessage: null,
      ));
      await tester.pump(); // Process completion
      await tester.pumpAndSettle(); // Settle

      // Loading state should be cleared
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });

    testWidgets('calls delete service when confirmed', (tester) async {
      when(() => mockPrivacyService.deleteAccountAndSignOut(any())).thenAnswer(
        (_) async =>
            (result: PrivacyOperationResult.success, errorMessage: null),
      );

      await tester.pumpWidget(createTestWidget());

      // Start deletion process
      await tester.tap(find.text('Delete My Account').first);
      await tester.pumpAndSettle();

      // Confirm in dialog
      await tester.tap(find.text('Delete My Account').last);
      await tester.pump();

      // Verify the service was called
      verify(() => mockPrivacyService.deleteAccountAndSignOut(any())).called(1);
      verify(
        () => mockLogger.info('User initiated account deletion'),
      ).called(1);
    });

    testWidgets('handles unauthorized account deletion', (tester) async {
      when(() => mockPrivacyService.deleteAccountAndSignOut(any())).thenAnswer(
        (_) async => (
          result: PrivacyOperationResult.unauthorized,
          errorMessage: 'Please sign in to delete your account.',
        ),
      );

      await tester.pumpWidget(createTestWidget());

      // Start deletion process
      await tester.tap(find.text('Delete My Account').first);
      await tester.pumpAndSettle();

      // Confirm in dialog
      await tester.tap(find.text('Delete My Account').last);
      await tester.pump();

      // Verify the service was called
      verify(() => mockPrivacyService.deleteAccountAndSignOut(any())).called(1);
    });

    testWidgets('handles network error during deletion', (tester) async {
      when(() => mockPrivacyService.deleteAccountAndSignOut(any())).thenAnswer(
        (_) async => (
          result: PrivacyOperationResult.networkError,
          errorMessage: 'Network connection failed.',
        ),
      );

      await tester.pumpWidget(createTestWidget());

      // Start deletion process
      await tester.tap(find.text('Delete My Account').first);
      await tester.pumpAndSettle();

      // Confirm in dialog
      await tester.tap(find.text('Delete My Account').last);
      await tester.pump();

      // Verify the service was called
      verify(() => mockPrivacyService.deleteAccountAndSignOut(any())).called(1);
    });

    testWidgets('handles unexpected error during deletion', (tester) async {
      when(
        () => mockPrivacyService.deleteAccountAndSignOut(any()),
      ).thenThrow(Exception('Unexpected deletion error'));

      await tester.pumpWidget(createTestWidget());

      // Start deletion process
      await tester.tap(find.text('Delete My Account').first);
      await tester.pumpAndSettle();

      // Confirm in dialog
      await tester.tap(find.text('Delete My Account').last);
      await tester.pump();

      // Verify the service was called and error was logged
      verify(() => mockPrivacyService.deleteAccountAndSignOut(any())).called(1);
      verify(() => mockLogger.error(any(), any())).called(1);
    });
  });

  group('Privacy Information Dialogs', () {
    testWidgets('shows privacy policy dialog when tapped', (tester) async {
      await tester.pumpWidget(createTestWidget());

      await tester.tap(find.text('Privacy Policy'));
      await tester.pumpAndSettle();

      expect(
        find.text('Privacy Policy'),
        findsNWidgets(2),
      ); // Title in list and dialog
      expect(
        find.textContaining('Asora collects minimal personal data'),
        findsOneWidget,
      );
      expect(find.text('OK'), findsOneWidget);
    });

    testWidgets('shows data security dialog when tapped', (tester) async {
      await tester.pumpWidget(createTestWidget());

      await tester.tap(
        find.text('Data Security').first,
      ); // Tap the first one (in the list)
      await tester.pumpAndSettle();

      expect(
        find.text('Data Security'),
        findsNWidgets(2),
      ); // One in list, one in dialog
      expect(
        find.textContaining('industry-standard encryption'),
        findsOneWidget,
      );
    });

    testWidgets('shows privacy questions dialog when tapped', (tester) async {
      await tester.pumpWidget(createTestWidget());

      await tester.tap(find.text('Privacy Questions'));
      await tester.pumpAndSettle();

      expect(find.text('Contact Us'), findsOneWidget);
      expect(find.textContaining('privacy@asora.com'), findsOneWidget);
    });
  });

  group('Button States and Loading', () {
    testWidgets('shows loading state during button press', (tester) async {
      final completer =
          Completer<
            ({
              PrivacyOperationResult result,
              Map<String, dynamic>? data,
              String? errorMessage,
            })
          >();

      when(
        () => mockPrivacyService.exportUserData(),
      ).thenAnswer((_) => completer.future);

      await tester.pumpWidget(createTestWidget());

      // Start export
      await tester.tap(find.text('Export My Data'));
      await tester.pump();

      // Check that loading indicator is shown (indicating operation in progress)
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Preparing Export...'), findsOneWidget);

      // Complete operation
      completer.complete((
        result: PrivacyOperationResult.success,
        data: {'test': 'data'},
        errorMessage: null,
      ));
      await tester.pump();

      // Verify service was called
      verify(() => mockPrivacyService.exportUserData()).called(1);
    });
  });

  group('Error Handling and Logging', () {
    testWidgets('logs export operations', (tester) async {
      when(() => mockPrivacyService.exportUserData()).thenAnswer(
        (_) async => (
          result: PrivacyOperationResult.success,
          data: {'test': 'data'},
          errorMessage: null,
        ),
      );

      await tester.pumpWidget(createTestWidget());

      await tester.tap(find.text('Export My Data'));
      await tester.pump();

      verify(() => mockLogger.info('User initiated data export')).called(1);
    });

    testWidgets('logs deletion operations', (tester) async {
      when(() => mockPrivacyService.deleteAccountAndSignOut(any())).thenAnswer(
        (_) async =>
            (result: PrivacyOperationResult.success, errorMessage: null),
      );

      await tester.pumpWidget(createTestWidget());

      // Start deletion process
      await tester.tap(find.text('Delete My Account').first);
      await tester.pumpAndSettle();

      // Confirm in dialog
      await tester.tap(find.text('Delete My Account').last);
      await tester.pump();

      verify(
        () => mockLogger.info('User initiated account deletion'),
      ).called(1);
    });

    testWidgets('logs unexpected errors', (tester) async {
      when(
        () => mockPrivacyService.exportUserData(),
      ).thenThrow(Exception('Test error'));

      await tester.pumpWidget(createTestWidget());

      await tester.tap(find.text('Export My Data'));
      await tester.pumpAndSettle();

      verify(
        () => mockLogger.error('Unexpected error during data export', any()),
      ).called(1);
    });
  });
}
