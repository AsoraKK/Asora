import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';

import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/auth_service.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/presentation/auth_choice_screen.dart';
import 'package:asora/features/auth/presentation/auth_gate.dart';
import 'package:asora/privacy/privacy_screen.dart';
import 'package:asora/privacy/privacy_repository.dart';
import 'package:asora/privacy/save_file.dart';
import 'package:asora/services/privacy_service.dart';

class _FakeRepo extends Mock implements PrivacyRepository {}

class _FakeSaver extends Mock implements SaveFileService {}

class _MockAuthService extends Mock implements AuthService {}

class _MockOAuth2Service extends Mock implements OAuth2Service {}

void main() {
  late _FakeRepo repo;
  late _FakeSaver saver;

  setUp(() {
    repo = _FakeRepo();
    saver = _FakeSaver();
  });

  testWidgets('export success saves file and shows dialog', (tester) async {
    when(() => repo.exportUserData()).thenAnswer(
      (_) async => (
        result: PrivacyOperationResult.success,
        data: {
          'user': {'id': 'u1'},
        },
        errorMessage: null,
      ),
    );

    when(
      () => saver.saveAndShareJson(any(), any(), share: any(named: 'share')),
    ).thenAnswer((_) async => SaveFileResult(true, '/tmp/asora-export.json'));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          privacyRepositoryProvider.overrideWithValue(repo),
          saveFileProvider.overrideWithValue(saver),
        ],
        child: const MaterialApp(home: PrivacyScreen()),
      ),
    );

    // Tap export button
    final exportButton = find.text('Download my data (JSON)');
    expect(exportButton, findsOneWidget);

    await tester.tap(exportButton);
    await tester.pumpAndSettle();

    // Expect dialog showing saved path
    expect(find.textContaining('Saved to:'), findsOneWidget);
  });

  testWidgets('delete confirmation signs out and navigates to auth gate', (
    tester,
  ) async {
    when(() => repo.deleteAccount()).thenAnswer(
      (_) async => (result: PrivacyOperationResult.success, errorMessage: null),
    );

    final authService = _MockAuthService();
    final oauth2 = _MockOAuth2Service();

    when(authService.getCurrentUser).thenAnswer((_) async => null);
    when(authService.logout).thenAnswer((_) async {});
    when(authService.signOut).thenAnswer((_) async {});
    when(oauth2.getAccessToken).thenAnswer((_) async => null);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          privacyRepositoryProvider.overrideWithValue(repo),
          saveFileProvider.overrideWithValue(saver),
          enhancedAuthServiceProvider.overrideWithValue(authService),
          oauth2ServiceProvider.overrideWithValue(oauth2),
          authStateProvider.overrideWith((ref) {
            return AuthStateNotifier(ref, authService);
          }),
        ],
        child: const MaterialApp(home: PrivacyScreen()),
      ),
    );

    final deleteButton = find.text('Delete my account');
    expect(deleteButton, findsOneWidget);

    await tester.tap(deleteButton);
    await tester.pumpAndSettle();

    // Confirm dialog appears
    expect(find.text('Delete account?'), findsOneWidget);

    // Tap Delete in dialog
    await tester.tap(find.widgetWithText(FilledButton, 'Delete'));
    await tester.pumpAndSettle();

    verify(() => authService.signOut()).called(1);

    // The navigation stack should now display the AuthGate (rendering auth choice)
    expect(find.byType(AuthGate), findsOneWidget);
    expect(find.byType(AuthChoiceScreen), findsOneWidget);
  });
}
