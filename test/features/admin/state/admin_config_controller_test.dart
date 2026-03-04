// ignore_for_file: public_member_api_docs

import 'package:flutter_test/flutter_test.dart';

import 'package:asora/features/admin/state/admin_config_controller.dart';
import 'package:asora/features/admin/domain/admin_config_models.dart';
import 'package:asora/features/admin/api/admin_api_client.dart';

void main() {
  // ── AdminConfigStatus enum ────────────────────────────────────────────
  group('AdminConfigStatus', () {
    test('has all expected values', () {
      expect(AdminConfigStatus.values, hasLength(6));
      expect(AdminConfigStatus.loading, isNotNull);
      expect(AdminConfigStatus.idle, isNotNull);
      expect(AdminConfigStatus.dirty, isNotNull);
      expect(AdminConfigStatus.saving, isNotNull);
      expect(AdminConfigStatus.saved, isNotNull);
      expect(AdminConfigStatus.error, isNotNull);
    });
  });

  // ── AdminConfigError ──────────────────────────────────────────────────
  group('AdminConfigError', () {
    test('stores all fields', () {
      const error = AdminConfigError(
        message: 'Conflict detected',
        code: 'VERSION_CONFLICT',
        isVersionConflict: true,
        isRetryable: false,
      );
      expect(error.message, 'Conflict detected');
      expect(error.code, 'VERSION_CONFLICT');
      expect(error.isVersionConflict, isTrue);
      expect(error.isRetryable, isFalse);
    });

    test('defaults', () {
      const error = AdminConfigError(message: 'fail', code: 'ERR');
      expect(error.isVersionConflict, isFalse);
      expect(error.isRetryable, isTrue);
    });

    test('fromException version conflict', () {
      const ex = AdminApiException(
        message: 'Version conflict',
        code: 'VERSION_CONFLICT',
        statusCode: 409,
      );
      final error = AdminConfigError.fromException(ex);
      expect(error.message, 'Version conflict');
      expect(error.code, 'VERSION_CONFLICT');
      expect(error.isVersionConflict, isTrue);
      expect(error.isRetryable, isFalse);
    });

    test('fromException auth error', () {
      const ex = AdminApiException(
        message: 'Forbidden',
        code: 'AUTH_ERROR',
        statusCode: 403,
      );
      final error = AdminConfigError.fromException(ex);
      expect(error.isRetryable, isFalse);
    });

    test('fromException retryable error', () {
      const ex = AdminApiException(
        message: 'Server error',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      );
      final error = AdminConfigError.fromException(ex);
      expect(error.isRetryable, isTrue);
    });
  });

  // ── AdminConfigEditorState ────────────────────────────────────────────
  group('AdminConfigEditorState', () {
    final envelope = AdminConfigEnvelope(
      version: 1,
      lastUpdatedAt: DateTime(2025, 1, 1),
      lastUpdatedBy: const UpdatedBy(id: 'admin@test.com'),
      config: const AdminConfig(),
    );

    test('loading factory', () {
      final state = AdminConfigEditorState.loading();
      expect(state.status, AdminConfigStatus.loading);
      expect(state.serverSnapshot, isNull);
      expect(state.draftConfig, isNull);
      expect(state.error, isNull);
    });

    test('loaded factory', () {
      final state = AdminConfigEditorState.loaded(envelope);
      expect(state.status, AdminConfigStatus.idle);
      expect(state.serverSnapshot, envelope);
      expect(state.draftConfig, envelope.config);
      expect(state.error, isNull);
    });

    test('withError factory', () {
      final prev = AdminConfigEditorState.loaded(envelope);
      const error = AdminConfigError(message: 'fail', code: 'ERR');
      final state = AdminConfigEditorState.withError(prev, error);
      expect(state.status, AdminConfigStatus.error);
      expect(state.serverSnapshot, envelope);
      expect(state.draftConfig, envelope.config);
      expect(state.error, error);
    });

    test('isDirty when configs differ', () {
      final state = AdminConfigEditorState(
        status: AdminConfigStatus.dirty,
        serverSnapshot: envelope,
        draftConfig: const AdminConfig(
          moderation: ModerationConfig(temperature: 0.5),
        ),
      );
      expect(state.isDirty, isTrue);
    });

    test('isDirty is false when configs match', () {
      final state = AdminConfigEditorState.loaded(envelope);
      expect(state.isDirty, isFalse);
    });

    test('isDirty is false when server or draft is null', () {
      final state = AdminConfigEditorState.loading();
      expect(state.isDirty, isFalse);
    });

    test('canSave is true when dirty and not saving/loading', () {
      final state = AdminConfigEditorState(
        status: AdminConfigStatus.dirty,
        serverSnapshot: envelope,
        draftConfig: const AdminConfig(
          moderation: ModerationConfig(temperature: 0.9),
        ),
      );
      expect(state.canSave, isTrue);
    });

    test('canSave is false when saving', () {
      final state = AdminConfigEditorState(
        status: AdminConfigStatus.saving,
        serverSnapshot: envelope,
        draftConfig: const AdminConfig(
          moderation: ModerationConfig(temperature: 0.9),
        ),
      );
      expect(state.canSave, isFalse);
    });

    test('canSave is false when loading', () {
      final state = AdminConfigEditorState.loading();
      expect(state.canSave, isFalse);
    });

    test('canSave is false when not dirty', () {
      final state = AdminConfigEditorState.loaded(envelope);
      expect(state.canSave, isFalse);
    });

    test('canDiscard is true when dirty and not saving', () {
      final state = AdminConfigEditorState(
        status: AdminConfigStatus.dirty,
        serverSnapshot: envelope,
        draftConfig: const AdminConfig(
          moderation: ModerationConfig(temperature: 0.9),
        ),
      );
      expect(state.canDiscard, isTrue);
    });

    test('canDiscard is false when not dirty', () {
      final state = AdminConfigEditorState.loaded(envelope);
      expect(state.canDiscard, isFalse);
    });

    test('copyWith overrides fields', () {
      final state = AdminConfigEditorState.loaded(envelope);
      final updated = state.copyWith(status: AdminConfigStatus.dirty);
      expect(updated.status, AdminConfigStatus.dirty);
      expect(updated.serverSnapshot, envelope);
    });

    test('copyWith clearError removes error', () {
      const error = AdminConfigError(message: 'err', code: 'E');
      const state = AdminConfigEditorState(
        status: AdminConfigStatus.error,
        error: error,
      );
      final updated = state.copyWith(
        status: AdminConfigStatus.idle,
        clearError: true,
      );
      expect(updated.error, isNull);
    });
  });

  // ── ConfigChange ──────────────────────────────────────────────────────
  group('ConfigChange', () {
    test('stores fields', () {
      const change = ConfigChange(
        path: 'mod.temp',
        label: 'Temperature',
        before: 0.2,
        after: 0.5,
      );
      expect(change.path, 'mod.temp');
      expect(change.label, 'Temperature');
      expect(change.before, 0.2);
      expect(change.after, 0.5);
    });

    test('beforeDisplay formats double', () {
      const change = ConfigChange(
        path: 'x',
        label: 'X',
        before: 0.12345,
        after: 1.0,
      );
      expect(change.beforeDisplay, '0.12');
      expect(change.afterDisplay, '1.00');
    });

    test('beforeDisplay formats bool', () {
      const change = ConfigChange(
        path: 'x',
        label: 'X',
        before: true,
        after: false,
      );
      expect(change.beforeDisplay, 'On');
      expect(change.afterDisplay, 'Off');
    });

    test('beforeDisplay formats other types', () {
      const change = ConfigChange(
        path: 'x',
        label: 'X',
        before: 42,
        after: 'hello',
      );
      expect(change.beforeDisplay, '42');
      expect(change.afterDisplay, 'hello');
    });
  });

  // ── AdminConfigEditorNotifier ─────────────────────────────────────────
  group('AdminConfigEditorNotifier', () {
    final envelope = AdminConfigEnvelope(
      version: 1,
      lastUpdatedAt: DateTime(2025, 1, 1),
      lastUpdatedBy: const UpdatedBy(id: 'admin@test.com'),
      config: const AdminConfig(),
    );

    final updatedEnvelope = AdminConfigEnvelope(
      version: 2,
      lastUpdatedAt: DateTime(2025, 1, 2),
      lastUpdatedBy: const UpdatedBy(id: 'admin@test.com'),
      config: const AdminConfig(moderation: ModerationConfig(temperature: 0.5)),
    );

    test('updateModeration sets dirty state', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      // Wait for initial load
      await Future<void>.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(const ModerationConfig(temperature: 0.9));
      expect(notifier.state.status, AdminConfigStatus.dirty);
      expect(notifier.state.draftConfig!.moderation.temperature, 0.9);
    });

    test('updateModeration does nothing when draft is null', () {
      final notifier = AdminConfigEditorNotifier(_ErrorClient());
      // Draft is null during loading/error
      notifier.updateModeration(const ModerationConfig(temperature: 0.5));
      // Should not throw
    });

    test('updateFeatureFlags sets dirty state', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));

      notifier.updateFeatureFlags(
        const FeatureFlagsConfig(maintenanceMode: true),
      );
      expect(notifier.state.status, AdminConfigStatus.dirty);
      expect(notifier.state.draftConfig!.featureFlags.maintenanceMode, isTrue);
    });

    test('updateFeatureFlags does nothing when draft is null', () async {
      final notifier = AdminConfigEditorNotifier(_ErrorClient());
      await Future<void>.delayed(const Duration(milliseconds: 50));
      notifier.updateFeatureFlags(const FeatureFlagsConfig());
      // Should not throw
    });

    test('discard reverts to server snapshot', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(const ModerationConfig(temperature: 0.9));
      expect(notifier.state.isDirty, isTrue);

      notifier.discard();
      expect(notifier.state.status, AdminConfigStatus.idle);
      expect(notifier.state.draftConfig, envelope.config);
      expect(notifier.state.isDirty, isFalse);
    });

    test('discard does nothing when no server snapshot', () async {
      final notifier = AdminConfigEditorNotifier(_ErrorClient());
      await Future<void>.delayed(const Duration(milliseconds: 50));
      notifier.discard();
      // Should not throw
    });

    test('reload reloads from server', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(notifier.state.status, AdminConfigStatus.idle);

      await notifier.reload();
      expect(notifier.state.status, AdminConfigStatus.idle);
      expect(notifier.state.serverSnapshot, isNotNull);
    });

    test('save sends update and transitions to saved', () async {
      final client = _FakeClient(envelope, updateResult: updatedEnvelope);
      final notifier = AdminConfigEditorNotifier(client);
      await Future<void>.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(const ModerationConfig(temperature: 0.5));
      expect(notifier.state.canSave, isTrue);

      final future = notifier.save();
      // Wait for save to complete (before the 2s delay triggers)
      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(notifier.state.status, AdminConfigStatus.saved);
      expect(notifier.state.serverSnapshot!.version, 2);

      // Wait for the full save cycle including the delayed idle reset
      await future;
    });

    test('save does nothing when canSave is false', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));
      // Not dirty, so canSave is false
      await notifier.save();
      expect(notifier.state.status, AdminConfigStatus.idle);
    });

    test('save handles API exception', () async {
      final client = _FakeClient(envelope, throwOnUpdate: true);
      final notifier = AdminConfigEditorNotifier(client);
      await Future<void>.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(const ModerationConfig(temperature: 0.9));
      await notifier.save();
      expect(notifier.state.status, AdminConfigStatus.error);
      expect(notifier.state.error, isNotNull);
    });

    test('computeDiff returns empty when no snapshot or draft', () async {
      final notifier = AdminConfigEditorNotifier(_ErrorClient());
      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(notifier.computeDiff(), isEmpty);
    });

    test('computeDiff returns empty when no changes', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(notifier.computeDiff(), isEmpty);
    });

    test('computeDiff detects moderation temperature change', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(const ModerationConfig(temperature: 0.7));
      final diff = notifier.computeDiff();
      expect(diff['moderation.temperature'], 0.7);
    });

    test('computeDiff detects hiveAutoFlagThreshold change', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(
        const ModerationConfig(hiveAutoFlagThreshold: 0.6),
      );
      final diff = notifier.computeDiff();
      expect(diff['moderation.hiveAutoFlagThreshold'], 0.6);
    });

    test('computeDiff detects hiveAutoRemoveThreshold change', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(
        const ModerationConfig(hiveAutoRemoveThreshold: 0.8),
      );
      final diff = notifier.computeDiff();
      expect(diff['moderation.hiveAutoRemoveThreshold'], 0.8);
    });

    test('computeDiff detects enableAutoModeration change', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(
        const ModerationConfig(enableAutoModeration: false),
      );
      final diff = notifier.computeDiff();
      expect(diff['moderation.enableAutoModeration'], false);
    });

    test('computeDiff detects enableAzureContentSafety change', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(
        const ModerationConfig(enableAzureContentSafety: false),
      );
      final diff = notifier.computeDiff();
      expect(diff['moderation.enableAzureContentSafety'], false);
    });

    test('computeDiff detects feature flag changes', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));

      notifier.updateFeatureFlags(
        const FeatureFlagsConfig(
          appealsEnabled: false,
          communityVotingEnabled: false,
          pushNotificationsEnabled: false,
          maintenanceMode: true,
        ),
      );
      final diff = notifier.computeDiff();
      expect(diff['featureFlags.appealsEnabled'], false);
      expect(diff['featureFlags.communityVotingEnabled'], false);
      expect(diff['featureFlags.pushNotificationsEnabled'], false);
      expect(diff['featureFlags.maintenanceMode'], true);
    });

    test(
      'computeDetailedDiff returns empty when no snapshot or draft',
      () async {
        final notifier = AdminConfigEditorNotifier(_ErrorClient());
        await Future<void>.delayed(const Duration(milliseconds: 50));
        expect(notifier.computeDetailedDiff(), isEmpty);
      },
    );

    test('computeDetailedDiff returns empty when no changes', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(notifier.computeDetailedDiff(), isEmpty);
    });

    test('computeDetailedDiff returns ConfigChange objects', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(
        const ModerationConfig(temperature: 0.7, enableAutoModeration: false),
      );
      notifier.updateFeatureFlags(
        const FeatureFlagsConfig(maintenanceMode: true),
      );

      final changes = notifier.computeDetailedDiff();
      expect(changes.length, greaterThanOrEqualTo(3));

      final tempChange = changes.firstWhere(
        (c) => c.path == 'moderation.temperature',
      );
      expect(tempChange.label, 'AI Temperature');
      expect(tempChange.before, 0.2);
      expect(tempChange.after, 0.7);

      final autoModChange = changes.firstWhere(
        (c) => c.path == 'moderation.enableAutoModeration',
      );
      expect(autoModChange.label, 'Auto-Moderation Enabled');
      expect(autoModChange.before, true);
      expect(autoModChange.after, false);

      final maintChange = changes.firstWhere(
        (c) => c.path == 'featureFlags.maintenanceMode',
      );
      expect(maintChange.label, 'Maintenance Mode');
      expect(maintChange.before, false);
      expect(maintChange.after, true);
    });

    test('computeDetailedDiff detects all moderation fields', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));

      notifier.updateModeration(
        const ModerationConfig(
          temperature: 0.5,
          hiveAutoFlagThreshold: 0.6,
          hiveAutoRemoveThreshold: 0.7,
          enableAutoModeration: false,
          enableAzureContentSafety: false,
        ),
      );

      final changes = notifier.computeDetailedDiff();
      final paths = changes.map((c) => c.path).toSet();
      expect(paths, contains('moderation.temperature'));
      expect(paths, contains('moderation.hiveAutoFlagThreshold'));
      expect(paths, contains('moderation.hiveAutoRemoveThreshold'));
      expect(paths, contains('moderation.enableAutoModeration'));
      expect(paths, contains('moderation.enableAzureContentSafety'));
    });

    test('computeDetailedDiff detects all feature flag fields', () async {
      final notifier = AdminConfigEditorNotifier(_FakeClient(envelope));
      await Future<void>.delayed(const Duration(milliseconds: 50));

      notifier.updateFeatureFlags(
        const FeatureFlagsConfig(
          appealsEnabled: false,
          communityVotingEnabled: false,
          pushNotificationsEnabled: false,
          maintenanceMode: true,
        ),
      );

      final changes = notifier.computeDetailedDiff();
      final paths = changes.map((c) => c.path).toSet();
      expect(paths, contains('featureFlags.appealsEnabled'));
      expect(paths, contains('featureFlags.communityVotingEnabled'));
      expect(paths, contains('featureFlags.pushNotificationsEnabled'));
      expect(paths, contains('featureFlags.maintenanceMode'));
    });
  });
}

// ── Test helpers ──────────────────────────────────────────────────────────

class _FakeClient implements AdminApiClient {
  _FakeClient(this._envelope, {this.updateResult, this.throwOnUpdate = false});

  final AdminConfigEnvelope _envelope;
  final AdminConfigEnvelope? updateResult;
  final bool throwOnUpdate;

  @override
  Future<AdminConfigEnvelope> getConfig() async => _envelope;

  @override
  Future<AdminConfigEnvelope> updateConfig({
    required int expectedVersion,
    required AdminConfig config,
  }) async {
    if (throwOnUpdate) {
      throw const AdminApiException(
        message: 'Update failed',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      );
    }
    return updateResult ?? _envelope;
  }

  @override
  Future<AdminAuditResponse> getAuditLog({int limit = 50}) async {
    return const AdminAuditResponse(entries: [], limit: 50);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _ErrorClient implements AdminApiClient {
  @override
  Future<AdminConfigEnvelope> getConfig() async {
    throw const AdminApiException(
      message: 'Server error',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
