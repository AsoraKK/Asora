/// ASORA ADMIN CONFIG STATE CONTROLLER
///
/// 🎯 Purpose: Riverpod state management for admin configuration
/// 🏗️ Architecture: Application layer - orchestrates UI and API
/// 🔄 Features: Optimistic updates, dirty tracking, diff computation
/// 📱 Platform: Flutter with Riverpod state management
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/admin_api_client.dart';
import '../domain/admin_config_models.dart';
import '../../../core/network/dio_client.dart';

/// Status of the admin config editor
enum AdminConfigStatus {
  /// Initial state, loading data
  loading,

  /// Data loaded, no unsaved changes
  idle,

  /// User has made changes not yet saved
  dirty,

  /// Currently saving changes
  saving,

  /// Changes saved successfully (briefly shown, then returns to idle)
  saved,

  /// An error occurred
  error,
}

/// Error information for admin config operations
class AdminConfigError {
  const AdminConfigError({
    required this.message,
    required this.code,
    this.isVersionConflict = false,
    this.isRetryable = true,
  });

  final String message;
  final String code;
  final bool isVersionConflict;
  final bool isRetryable;

  factory AdminConfigError.fromException(AdminApiException e) {
    return AdminConfigError(
      message: e.message,
      code: e.code,
      isVersionConflict: e.isVersionConflict,
      isRetryable: !e.isAuthError && !e.isVersionConflict,
    );
  }
}

/// State for the admin config editor
class AdminConfigEditorState {
  const AdminConfigEditorState({
    required this.status,
    this.serverSnapshot,
    this.draftConfig,
    this.error,
  });

  /// Current status
  final AdminConfigStatus status;

  /// Last known server state (for dirty detection and version)
  final AdminConfigEnvelope? serverSnapshot;

  /// Current draft being edited (may differ from server)
  final AdminConfig? draftConfig;

  /// Error details if status is error
  final AdminConfigError? error;

  /// Whether there are unsaved changes
  bool get isDirty {
    if (serverSnapshot == null || draftConfig == null) return false;
    return serverSnapshot!.config != draftConfig;
  }

  /// Whether save operation is allowed
  bool get canSave =>
      isDirty &&
      status != AdminConfigStatus.saving &&
      status != AdminConfigStatus.loading;

  /// Whether discard operation is allowed
  bool get canDiscard => isDirty && status != AdminConfigStatus.saving;

  /// Create initial loading state
  factory AdminConfigEditorState.loading() {
    return const AdminConfigEditorState(status: AdminConfigStatus.loading);
  }

  /// Create loaded state from server data
  factory AdminConfigEditorState.loaded(AdminConfigEnvelope envelope) {
    return AdminConfigEditorState(
      status: AdminConfigStatus.idle,
      serverSnapshot: envelope,
      draftConfig: envelope.config,
    );
  }

  /// Create error state
  factory AdminConfigEditorState.withError(
    AdminConfigEditorState previous,
    AdminConfigError error,
  ) {
    return AdminConfigEditorState(
      status: AdminConfigStatus.error,
      serverSnapshot: previous.serverSnapshot,
      draftConfig: previous.draftConfig,
      error: error,
    );
  }

  AdminConfigEditorState copyWith({
    AdminConfigStatus? status,
    AdminConfigEnvelope? serverSnapshot,
    AdminConfig? draftConfig,
    AdminConfigError? error,
    bool clearError = false,
  }) {
    return AdminConfigEditorState(
      status: status ?? this.status,
      serverSnapshot: serverSnapshot ?? this.serverSnapshot,
      draftConfig: draftConfig ?? this.draftConfig,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// Notifier for admin config editor state
class AdminConfigEditorNotifier extends StateNotifier<AdminConfigEditorState> {
  AdminConfigEditorNotifier(this._client)
    : super(AdminConfigEditorState.loading()) {
    _loadConfig();
  }

  final AdminApiClient _client;

  /// Load configuration from server
  Future<void> _loadConfig() async {
    state = AdminConfigEditorState.loading();

    try {
      final envelope = await _client.getConfig();
      state = AdminConfigEditorState.loaded(envelope);
    } on AdminApiException catch (e) {
      state = AdminConfigEditorState.withError(
        state,
        AdminConfigError.fromException(e),
      );
    }
  }

  /// Reload configuration from server (discards local changes)
  Future<void> reload() async {
    await _loadConfig();
  }

  /// Update draft moderation config
  void updateModeration(ModerationConfig moderation) {
    if (state.draftConfig == null) return;

    state = state.copyWith(
      status: AdminConfigStatus.dirty,
      draftConfig: state.draftConfig!.copyWith(moderation: moderation),
      clearError: true,
    );
  }

  /// Update draft feature flags config
  void updateFeatureFlags(FeatureFlagsConfig featureFlags) {
    if (state.draftConfig == null) return;

    state = state.copyWith(
      status: AdminConfigStatus.dirty,
      draftConfig: state.draftConfig!.copyWith(featureFlags: featureFlags),
      clearError: true,
    );
  }

  /// Discard local changes and revert to server snapshot
  void discard() {
    if (state.serverSnapshot == null) return;

    state = state.copyWith(
      status: AdminConfigStatus.idle,
      draftConfig: state.serverSnapshot!.config,
      clearError: true,
    );
  }

  /// Save changes to server
  Future<void> save() async {
    if (!state.canSave) return;

    final snapshot = state.serverSnapshot!;
    final draft = state.draftConfig!;

    state = state.copyWith(status: AdminConfigStatus.saving);

    try {
      final updated = await _client.updateConfig(
        expectedVersion: snapshot.version,
        config: draft,
      );

      state = AdminConfigEditorState(
        status: AdminConfigStatus.saved,
        serverSnapshot: updated,
        draftConfig: updated.config,
      );

      // After brief "saved" display, return to idle
      await Future.delayed(const Duration(seconds: 2));
      if (state.status == AdminConfigStatus.saved) {
        state = state.copyWith(status: AdminConfigStatus.idle);
      }
    } on AdminApiException catch (e) {
      state = AdminConfigEditorState.withError(
        state.copyWith(status: AdminConfigStatus.dirty),
        AdminConfigError.fromException(e),
      );
    }
  }

  /// Compute diff between server snapshot and draft
  Map<String, dynamic> computeDiff() {
    if (state.serverSnapshot == null || state.draftConfig == null) {
      return {};
    }

    final serverConfig = state.serverSnapshot!.config;
    final draftConfig = state.draftConfig!;
    final diff = <String, dynamic>{};

    // Compare moderation fields
    final serverMod = serverConfig.moderation;
    final draftMod = draftConfig.moderation;

    if (serverMod.temperature != draftMod.temperature) {
      diff['moderation.temperature'] = draftMod.temperature;
    }
    if (serverMod.hiveAutoFlagThreshold != draftMod.hiveAutoFlagThreshold) {
      diff['moderation.hiveAutoFlagThreshold'] = draftMod.hiveAutoFlagThreshold;
    }
    if (serverMod.hiveAutoRemoveThreshold != draftMod.hiveAutoRemoveThreshold) {
      diff['moderation.hiveAutoRemoveThreshold'] =
          draftMod.hiveAutoRemoveThreshold;
    }
    if (serverMod.enableAutoModeration != draftMod.enableAutoModeration) {
      diff['moderation.enableAutoModeration'] = draftMod.enableAutoModeration;
    }
    if (serverMod.enableAzureContentSafety !=
        draftMod.enableAzureContentSafety) {
      diff['moderation.enableAzureContentSafety'] =
          draftMod.enableAzureContentSafety;
    }

    // Compare feature flags
    final serverFlags = serverConfig.featureFlags;
    final draftFlags = draftConfig.featureFlags;

    if (serverFlags.appealsEnabled != draftFlags.appealsEnabled) {
      diff['featureFlags.appealsEnabled'] = draftFlags.appealsEnabled;
    }
    if (serverFlags.communityVotingEnabled !=
        draftFlags.communityVotingEnabled) {
      diff['featureFlags.communityVotingEnabled'] =
          draftFlags.communityVotingEnabled;
    }
    if (serverFlags.pushNotificationsEnabled !=
        draftFlags.pushNotificationsEnabled) {
      diff['featureFlags.pushNotificationsEnabled'] =
          draftFlags.pushNotificationsEnabled;
    }
    if (serverFlags.maintenanceMode != draftFlags.maintenanceMode) {
      diff['featureFlags.maintenanceMode'] = draftFlags.maintenanceMode;
    }

    return diff;
  }

  /// Compute diff with before/after values for display
  List<ConfigChange> computeDetailedDiff() {
    if (state.serverSnapshot == null || state.draftConfig == null) {
      return [];
    }

    final serverConfig = state.serverSnapshot!.config;
    final draftConfig = state.draftConfig!;
    final changes = <ConfigChange>[];

    // Compare moderation fields
    final serverMod = serverConfig.moderation;
    final draftMod = draftConfig.moderation;

    if (serverMod.temperature != draftMod.temperature) {
      changes.add(
        ConfigChange(
          path: 'moderation.temperature',
          label: 'AI Temperature',
          before: serverMod.temperature,
          after: draftMod.temperature,
        ),
      );
    }
    if (serverMod.hiveAutoFlagThreshold != draftMod.hiveAutoFlagThreshold) {
      changes.add(
        ConfigChange(
          path: 'moderation.hiveAutoFlagThreshold',
          label: 'Flag Threshold (Hive)',
          before: serverMod.hiveAutoFlagThreshold,
          after: draftMod.hiveAutoFlagThreshold,
        ),
      );
    }
    if (serverMod.hiveAutoRemoveThreshold != draftMod.hiveAutoRemoveThreshold) {
      changes.add(
        ConfigChange(
          path: 'moderation.hiveAutoRemoveThreshold',
          label: 'Auto-Block Threshold',
          before: serverMod.hiveAutoRemoveThreshold,
          after: draftMod.hiveAutoRemoveThreshold,
        ),
      );
    }
    if (serverMod.enableAutoModeration != draftMod.enableAutoModeration) {
      changes.add(
        ConfigChange(
          path: 'moderation.enableAutoModeration',
          label: 'Auto-Moderation Enabled',
          before: serverMod.enableAutoModeration,
          after: draftMod.enableAutoModeration,
        ),
      );
    }
    if (serverMod.enableAzureContentSafety !=
        draftMod.enableAzureContentSafety) {
      changes.add(
        ConfigChange(
          path: 'moderation.enableAzureContentSafety',
          label: 'Azure Content Safety',
          before: serverMod.enableAzureContentSafety,
          after: draftMod.enableAzureContentSafety,
        ),
      );
    }

    // Compare feature flags
    final serverFlags = serverConfig.featureFlags;
    final draftFlags = draftConfig.featureFlags;

    if (serverFlags.appealsEnabled != draftFlags.appealsEnabled) {
      changes.add(
        ConfigChange(
          path: 'featureFlags.appealsEnabled',
          label: 'Appeals Enabled',
          before: serverFlags.appealsEnabled,
          after: draftFlags.appealsEnabled,
        ),
      );
    }
    if (serverFlags.communityVotingEnabled !=
        draftFlags.communityVotingEnabled) {
      changes.add(
        ConfigChange(
          path: 'featureFlags.communityVotingEnabled',
          label: 'Community Voting',
          before: serverFlags.communityVotingEnabled,
          after: draftFlags.communityVotingEnabled,
        ),
      );
    }
    if (serverFlags.pushNotificationsEnabled !=
        draftFlags.pushNotificationsEnabled) {
      changes.add(
        ConfigChange(
          path: 'featureFlags.pushNotificationsEnabled',
          label: 'Push Notifications',
          before: serverFlags.pushNotificationsEnabled,
          after: draftFlags.pushNotificationsEnabled,
        ),
      );
    }
    if (serverFlags.maintenanceMode != draftFlags.maintenanceMode) {
      changes.add(
        ConfigChange(
          path: 'featureFlags.maintenanceMode',
          label: 'Maintenance Mode',
          before: serverFlags.maintenanceMode,
          after: draftFlags.maintenanceMode,
        ),
      );
    }

    return changes;
  }
}

/// Represents a single configuration change
class ConfigChange {
  const ConfigChange({
    required this.path,
    required this.label,
    required this.before,
    required this.after,
  });

  final String path;
  final String label;
  final dynamic before;
  final dynamic after;

  String get beforeDisplay => _formatValue(before);
  String get afterDisplay => _formatValue(after);

  String _formatValue(dynamic value) {
    if (value is double) {
      return value.toStringAsFixed(2);
    }
    if (value is bool) {
      return value ? 'On' : 'Off';
    }
    return value.toString();
  }
}

/// Provider for the admin API client
final adminApiClientProvider = Provider<AdminApiClient>((ref) {
  final dio = ref.watch(secureDioProvider);
  return AdminApiClient(dio);
});

/// Provider for the admin config editor state
final adminConfigEditorProvider =
    StateNotifierProvider<AdminConfigEditorNotifier, AdminConfigEditorState>((
      ref,
    ) {
      final client = ref.watch(adminApiClientProvider);
      return AdminConfigEditorNotifier(client);
    });

/// Provider for audit log (separate from config state)
final adminAuditLogProvider = FutureProvider.family<AdminAuditResponse, int>((
  ref,
  limit,
) async {
  final client = ref.watch(adminApiClientProvider);
  return client.getAuditLog(limit: limit);
});
