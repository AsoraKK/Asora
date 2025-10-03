import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';

import 'package:asora/privacy/privacy_screen.dart';
import 'package:asora/privacy/privacy_repository.dart';
import 'package:asora/privacy/save_file.dart';
import 'package:asora/services/privacy_service.dart';

class _FakeRepo extends Mock implements PrivacyRepository {}

class _FakeSaver extends Mock implements SaveFileService {}

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

  testWidgets('delete confirmation dialog and deletion success', (
    tester,
  ) async {
    when(() => repo.deleteAccount()).thenAnswer(
      (_) async => (result: PrivacyOperationResult.success, errorMessage: null),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          privacyRepositoryProvider.overrideWithValue(repo),
          saveFileProvider.overrideWithValue(saver),
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

    // After deletion success, expect final dialog
    expect(find.text('Account deleted'), findsOneWidget);
  });
}
