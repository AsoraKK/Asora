/// Tests for admin config diff computation
///
/// Covers the diff logic in AdminConfigEditorNotifier
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';

import 'package:asora/features/admin/api/admin_api_client.dart';
import 'package:asora/features/admin/domain/admin_config_models.dart';
import 'package:asora/features/admin/state/admin_config_controller.dart';

@GenerateMocks([AdminApiClient])
import 'admin_config_diff_test.mocks.dart';

void main() {
  group('AdminConfigEditorNotifier diff computation', () {
    late MockAdminApiClient mockClient;
    late AdminConfigEditorNotifier notifier;

    final baseEnvelope = AdminConfigEnvelope(
      version: 1,
      lastUpdatedAt: DateTime(2025, 12, 27),
      lastUpdatedBy: const UpdatedBy(id: 'test@example.com'),
      config: const AdminConfig(
        schemaVersion: 1,
        moderation: ModerationConfig(
          temperature: 0.2,
          hiveAutoFlagThreshold: 0.8,
          hiveAutoRemoveThreshold: 0.95,
          enableAutoModeration: true,
          enableAzureContentSafety: true,
        ),
        featureFlags: FeatureFlagsConfig(
          appealsEnabled: true,
          communityVotingEnabled: true,
          pushNotificationsEnabled: true,
          maintenanceMode: false,
        ),
      ),
    );

    setUp(() {
      mockClient = MockAdminApiClient();
      when(mockClient.getConfig()).thenAnswer((_) async => baseEnvelope);
    });

    Future<void> initNotifier() async {
      notifier = AdminConfigEditorNotifier(mockClient);
      // Wait for initial load
      await Future.delayed(const Duration(milliseconds: 50));
    }

    test('computeDiff returns empty map when no changes', () async {
      await initNotifier();

      final diff = notifier.computeDiff();

      expect(diff, isEmpty);
    });

    test('computeDiff detects moderation temperature change', () async {
      await initNotifier();

      notifier.updateModeration(
        notifier.state.draftConfig!.moderation.copyWith(temperature: 0.5),
      );

      final diff = notifier.computeDiff();

      expect(diff, {'moderation.temperature': 0.5});
    });

    test('computeDiff detects multiple moderation changes', () async {
      await initNotifier();

      notifier.updateModeration(
        notifier.state.draftConfig!.moderation.copyWith(
          temperature: 0.3,
          hiveAutoFlagThreshold: 0.9,
        ),
      );

      final diff = notifier.computeDiff();

      expect(diff, {
        'moderation.temperature': 0.3,
        'moderation.hiveAutoFlagThreshold': 0.9,
      });
    });

    test('computeDiff detects feature flag changes', () async {
      await initNotifier();

      notifier.updateFeatureFlags(
        notifier.state.draftConfig!.featureFlags.copyWith(
          appealsEnabled: false,
          maintenanceMode: true,
        ),
      );

      final diff = notifier.computeDiff();

      expect(diff, {
        'featureFlags.appealsEnabled': false,
        'featureFlags.maintenanceMode': true,
      });
    });

    test('computeDiff detects mixed changes across sections', () async {
      await initNotifier();

      notifier.updateModeration(
        notifier.state.draftConfig!.moderation.copyWith(temperature: 0.4),
      );
      notifier.updateFeatureFlags(
        notifier.state.draftConfig!.featureFlags.copyWith(
          pushNotificationsEnabled: false,
        ),
      );

      final diff = notifier.computeDiff();

      expect(diff, {
        'moderation.temperature': 0.4,
        'featureFlags.pushNotificationsEnabled': false,
      });
    });

    test('computeDiff detects all moderation fields', () async {
      await initNotifier();

      notifier.updateModeration(
        const ModerationConfig(
          temperature: 0.5,
          hiveAutoFlagThreshold: 0.7,
          hiveAutoRemoveThreshold: 0.8,
          enableAutoModeration: false,
          enableAzureContentSafety: false,
        ),
      );

      final diff = notifier.computeDiff();

      expect(diff, {
        'moderation.temperature': 0.5,
        'moderation.hiveAutoFlagThreshold': 0.7,
        'moderation.hiveAutoRemoveThreshold': 0.8,
        'moderation.enableAutoModeration': false,
        'moderation.enableAzureContentSafety': false,
      });
    });

    test('computeDiff detects all feature flag fields', () async {
      await initNotifier();

      notifier.updateFeatureFlags(
        const FeatureFlagsConfig(
          appealsEnabled: false,
          communityVotingEnabled: false,
          pushNotificationsEnabled: false,
          maintenanceMode: true,
        ),
      );

      final diff = notifier.computeDiff();

      expect(diff, {
        'featureFlags.appealsEnabled': false,
        'featureFlags.communityVotingEnabled': false,
        'featureFlags.pushNotificationsEnabled': false,
        'featureFlags.maintenanceMode': true,
      });
    });

    test('computeDetailedDiff includes before/after values', () async {
      await initNotifier();

      notifier.updateModeration(
        notifier.state.draftConfig!.moderation.copyWith(temperature: 0.5),
      );

      final changes = notifier.computeDetailedDiff();

      expect(changes.length, 1);
      expect(changes[0].path, 'moderation.temperature');
      expect(changes[0].label, 'AI Temperature');
      expect(changes[0].before, 0.2);
      expect(changes[0].after, 0.5);
    });

    test('ConfigChange formats values correctly', () {
      const change = ConfigChange(
        path: 'test.value',
        label: 'Test',
        before: 0.123456,
        after: 0.654321,
      );

      expect(change.beforeDisplay, '0.12');
      expect(change.afterDisplay, '0.65');
    });

    test('ConfigChange formats booleans correctly', () {
      const change = ConfigChange(
        path: 'test.flag',
        label: 'Test Flag',
        before: true,
        after: false,
      );

      expect(change.beforeDisplay, 'On');
      expect(change.afterDisplay, 'Off');
    });
  });

  group('AdminConfigEditorNotifier state transitions', () {
    late MockAdminApiClient mockClient;
    late AdminConfigEditorNotifier notifier;

    final baseEnvelope = AdminConfigEnvelope(
      version: 1,
      lastUpdatedAt: DateTime(2025, 12, 27),
      lastUpdatedBy: const UpdatedBy(id: 'test@example.com'),
      config: const AdminConfig(),
    );

    setUp(() {
      mockClient = MockAdminApiClient();
      when(mockClient.getConfig()).thenAnswer((_) async => baseEnvelope);
    });

    test('isDirty is false initially', () async {
      notifier = AdminConfigEditorNotifier(mockClient);
      await Future.delayed(const Duration(milliseconds: 50));

      expect(notifier.state.isDirty, false);
    });

    test('isDirty becomes true after change', () async {
      notifier = AdminConfigEditorNotifier(mockClient);
      await Future.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(
        notifier.state.draftConfig!.moderation.copyWith(temperature: 0.5),
      );

      expect(notifier.state.isDirty, true);
    });

    test('discard resets isDirty to false', () async {
      notifier = AdminConfigEditorNotifier(mockClient);
      await Future.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(
        notifier.state.draftConfig!.moderation.copyWith(temperature: 0.5),
      );
      expect(notifier.state.isDirty, true);

      notifier.discard();

      expect(notifier.state.isDirty, false);
      expect(
        notifier.state.draftConfig!.moderation.temperature,
        0.2, // Default value
      );
    });

    test('discard restores server snapshot values', () async {
      final customEnvelope = AdminConfigEnvelope(
        version: 5,
        lastUpdatedAt: DateTime(2025, 12, 27),
        lastUpdatedBy: const UpdatedBy(id: 'test@example.com'),
        config: const AdminConfig(
          moderation: ModerationConfig(temperature: 0.7),
        ),
      );

      when(mockClient.getConfig()).thenAnswer((_) async => customEnvelope);

      notifier = AdminConfigEditorNotifier(mockClient);
      await Future.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(
        notifier.state.draftConfig!.moderation.copyWith(temperature: 0.1),
      );

      notifier.discard();

      expect(notifier.state.draftConfig!.moderation.temperature, 0.7);
    });

    test('canSave is false when not dirty', () async {
      notifier = AdminConfigEditorNotifier(mockClient);
      await Future.delayed(const Duration(milliseconds: 50));

      expect(notifier.state.canSave, false);
    });

    test('canSave is true when dirty', () async {
      notifier = AdminConfigEditorNotifier(mockClient);
      await Future.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(
        notifier.state.draftConfig!.moderation.copyWith(temperature: 0.5),
      );

      expect(notifier.state.canSave, true);
    });

    test('save updates serverSnapshot on success', () async {
      final updatedEnvelope = AdminConfigEnvelope(
        version: 2,
        lastUpdatedAt: DateTime(2025, 12, 27, 12),
        lastUpdatedBy: const UpdatedBy(id: 'test@example.com'),
        config: const AdminConfig(
          moderation: ModerationConfig(temperature: 0.5),
        ),
      );

      when(mockClient.getConfig()).thenAnswer((_) async => baseEnvelope);
      when(
        mockClient.updateConfig(
          expectedVersion: anyNamed('expectedVersion'),
          config: anyNamed('config'),
        ),
      ).thenAnswer((_) async => updatedEnvelope);

      notifier = AdminConfigEditorNotifier(mockClient);
      await Future.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(
        notifier.state.draftConfig!.moderation.copyWith(temperature: 0.5),
      );

      await notifier.save();

      expect(notifier.state.serverSnapshot!.version, 2);
    });

    test('save handles version conflict', () async {
      when(mockClient.getConfig()).thenAnswer((_) async => baseEnvelope);
      when(
        mockClient.updateConfig(
          expectedVersion: anyNamed('expectedVersion'),
          config: anyNamed('config'),
        ),
      ).thenThrow(
        const AdminApiException(
          message: 'Version conflict: expected 1, server has 2',
          code: 'VERSION_CONFLICT',
          statusCode: 409,
        ),
      );

      notifier = AdminConfigEditorNotifier(mockClient);
      await Future.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(
        notifier.state.draftConfig!.moderation.copyWith(temperature: 0.5),
      );

      await notifier.save();

      expect(notifier.state.status, AdminConfigStatus.error);
      expect(notifier.state.error!.isVersionConflict, true);
    });
  });
}
