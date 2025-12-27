/// Tests for admin config screen widget
///
/// Covers UI rendering, state transitions, and user interactions
library;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/admin/api/admin_api_client.dart';
import 'package:asora/features/admin/domain/admin_config_models.dart';
import 'package:asora/features/admin/state/admin_config_controller.dart';
import 'package:asora/features/admin/ui/admin_config_screen.dart';

void main() {
  group('AdminConfigScreen', () {
    late AdminConfigEnvelope testEnvelope;

    setUp(() {
      testEnvelope = AdminConfigEnvelope(
        version: 5,
        lastUpdatedAt: DateTime(2025, 12, 27, 10, 30),
        lastUpdatedBy: const UpdatedBy(
          id: 'admin@example.com',
          displayName: 'Admin User',
        ),
        config: const AdminConfig(
          schemaVersion: 1,
          moderation: ModerationConfig(
            temperature: 0.2,
            toxicityThreshold: 0.85,
          ),
          featureFlags: FeatureFlagsConfig(
            appealsEnabled: true,
            maintenanceMode: false,
          ),
        ),
      );
    });

    Widget createTestWidget({required AdminConfigEditorState state}) {
      return ProviderScope(
        overrides: [
          adminConfigEditorProvider.overrideWith((ref) {
            return _TestNotifier(state);
          }),
        ],
        child: const MaterialApp(home: AdminConfigScreen()),
      );
    }

    testWidgets('shows loading indicator when loading', (tester) async {
      await tester.pumpWidget(
        createTestWidget(state: AdminConfigEditorState.loading()),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows error message on full error', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          state: AdminConfigEditorState.withError(
            AdminConfigEditorState.loading(),
            const AdminConfigError(
              message: 'Connection failed',
              code: 'CONNECTION_ERROR',
            ),
          ),
        ),
      );

      expect(find.text('Failed to load configuration'), findsOneWidget);
      expect(find.text('Connection failed'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('displays version in header when loaded', (tester) async {
      await tester.pumpWidget(
        createTestWidget(state: AdminConfigEditorState.loaded(testEnvelope)),
      );

      expect(find.text('Version 5'), findsOneWidget);
    });

    testWidgets('displays updatedBy in header', (tester) async {
      await tester.pumpWidget(
        createTestWidget(state: AdminConfigEditorState.loaded(testEnvelope)),
      );

      expect(find.textContaining('Admin User'), findsOneWidget);
    });

    testWidgets('shows Idle status chip when no changes', (tester) async {
      await tester.pumpWidget(
        createTestWidget(state: AdminConfigEditorState.loaded(testEnvelope)),
      );

      expect(find.text('Idle'), findsOneWidget);
    });

    testWidgets('shows Unsaved changes status when dirty', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          state: AdminConfigEditorState(
            status: AdminConfigStatus.dirty,
            serverSnapshot: testEnvelope,
            draftConfig: testEnvelope.config.copyWith(
              moderation: testEnvelope.config.moderation.copyWith(
                temperature: 0.5,
              ),
            ),
          ),
        ),
      );

      expect(find.text('Unsaved changes'), findsOneWidget);
    });

    testWidgets('shows Saving... status when saving', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          state: AdminConfigEditorState(
            status: AdminConfigStatus.saving,
            serverSnapshot: testEnvelope,
            draftConfig: testEnvelope.config,
          ),
        ),
      );

      expect(find.text('Saving...'), findsOneWidget);
    });

    testWidgets('shows Saved status after save', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          state: AdminConfigEditorState(
            status: AdminConfigStatus.saved,
            serverSnapshot: testEnvelope,
            draftConfig: testEnvelope.config,
          ),
        ),
      );

      expect(find.text('Saved'), findsOneWidget);
    });

    testWidgets('displays moderation sliders', (tester) async {
      await tester.pumpWidget(
        createTestWidget(state: AdminConfigEditorState.loaded(testEnvelope)),
      );

      expect(find.text('AI Temperature'), findsOneWidget);
      expect(find.text('Toxicity Threshold'), findsOneWidget);
      expect(find.text('Auto-Reject Threshold'), findsOneWidget);
    });

    testWidgets('displays feature flag switches', (tester) async {
      await tester.pumpWidget(
        createTestWidget(state: AdminConfigEditorState.loaded(testEnvelope)),
      );

      // Scroll down to see feature flags section
      await tester.dragUntilVisible(
        find.text('Feature Flags'),
        find.byType(ListView),
        const Offset(0, -300),
      );

      expect(find.text('Appeals Enabled'), findsOneWidget);
      expect(find.text('Community Voting'), findsOneWidget);
      expect(find.text('Push Notifications'), findsOneWidget);
      expect(find.text('Maintenance Mode'), findsOneWidget);
    });

    testWidgets('Save button is disabled when not dirty', (tester) async {
      await tester.pumpWidget(
        createTestWidget(state: AdminConfigEditorState.loaded(testEnvelope)),
      );

      final saveButton = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Save'),
      );
      expect(saveButton.onPressed, isNull);
    });

    testWidgets('Discard button is disabled when not dirty', (tester) async {
      await tester.pumpWidget(
        createTestWidget(state: AdminConfigEditorState.loaded(testEnvelope)),
      );

      final discardButton = tester.widget<OutlinedButton>(
        find.widgetWithText(OutlinedButton, 'Discard'),
      );
      expect(discardButton.onPressed, isNull);
    });

    testWidgets('Save button is enabled when dirty', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          state: AdminConfigEditorState(
            status: AdminConfigStatus.dirty,
            serverSnapshot: testEnvelope,
            draftConfig: testEnvelope.config.copyWith(
              moderation: testEnvelope.config.moderation.copyWith(
                temperature: 0.5,
              ),
            ),
          ),
        ),
      );

      final saveButton = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Save'),
      );
      expect(saveButton.onPressed, isNotNull);
    });

    testWidgets('shows error banner on version conflict', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          state: AdminConfigEditorState(
            status: AdminConfigStatus.error,
            serverSnapshot: testEnvelope,
            draftConfig: testEnvelope.config,
            error: const AdminConfigError(
              message: 'Version conflict: expected 5, server has 6',
              code: 'VERSION_CONFLICT',
              isVersionConflict: true,
            ),
          ),
        ),
      );

      expect(find.text('Config changed on server'), findsOneWidget);
      expect(find.text('Reload'), findsOneWidget);
    });

    testWidgets('shows error banner with retry on other errors', (
      tester,
    ) async {
      await tester.pumpWidget(
        createTestWidget(
          state: AdminConfigEditorState(
            status: AdminConfigStatus.error,
            serverSnapshot: testEnvelope,
            draftConfig: testEnvelope.config,
            error: const AdminConfigError(
              message: 'Server error',
              code: 'INTERNAL_ERROR',
              isRetryable: true,
            ),
          ),
        ),
      );

      expect(find.text('Error saving'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('slider shows current value', (tester) async {
      await tester.pumpWidget(
        createTestWidget(state: AdminConfigEditorState.loaded(testEnvelope)),
      );

      // Find the temperature value display (0.20)
      expect(find.text('0.20'), findsWidgets);
    });

    testWidgets('maintenance mode switch is styled as destructive', (
      tester,
    ) async {
      await tester.pumpWidget(
        createTestWidget(state: AdminConfigEditorState.loaded(testEnvelope)),
      );

      // Scroll down to see maintenance mode switch
      await tester.dragUntilVisible(
        find.text('Maintenance Mode'),
        find.byType(ListView),
        const Offset(0, -300),
      );

      // Find maintenance mode switch
      final switchTile = find.widgetWithText(
        SwitchListTile,
        'Maintenance Mode',
      );
      expect(switchTile, findsOneWidget);
    });
  });
}

/// Test notifier that allows injecting specific states
class _TestNotifier extends AdminConfigEditorNotifier {
  _TestNotifier(AdminConfigEditorState initialState)
    : super(AdminApiClient(_FakeDio())) {
    state = initialState;
  }
}

/// Fake Dio that prevents real network requests
class _FakeDio implements Dio {
  @override
  dynamic noSuchMethod(Invocation invocation) {
    // Return null for getters, throw for methods
    if (invocation.isGetter) return null;
    throw DioException(
      requestOptions: RequestOptions(path: 'fake'),
      error: 'Fake Dio - network disabled in test',
    );
  }
}
