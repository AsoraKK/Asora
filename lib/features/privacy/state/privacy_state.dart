/// Privacy feature immutable state and enums.
///
/// Defines the export/delete state machines used by the privacy controller.
library;

import 'package:meta/meta.dart';

/// Export workflow statuses.
enum ExportStatus { idle, requesting, queued, emailSent, coolingDown, failed }

/// Account deletion workflow statuses.
enum DeleteStatus { idle, confirming, deleting, deleted, failed }

/// Immutable privacy state consumed by the UI.
@immutable
class PrivacyState {
  const PrivacyState({
    this.exportStatus = ExportStatus.idle,
    this.deleteStatus = DeleteStatus.idle,
    this.lastExportAt,
    this.remainingCooldown = Duration.zero,
    this.error,
  });

  final ExportStatus exportStatus;
  final DeleteStatus deleteStatus;
  final DateTime? lastExportAt;
  final Duration remainingCooldown;
  final String? error;

  /// Export button is enabled when idle and no cooldown remains.
  bool get canRequestExport =>
      (exportStatus == ExportStatus.idle ||
          exportStatus == ExportStatus.failed) &&
      remainingCooldown <= Duration.zero;

  /// True when cooldown ticking down.
  bool get isCoolingDown =>
      remainingCooldown > Duration.zero &&
      exportStatus == ExportStatus.coolingDown;

  /// Human readable last export timestamp availability.
  bool get hasLastExport => lastExportAt != null;

  PrivacyState copyWith({
    ExportStatus? exportStatus,
    DeleteStatus? deleteStatus,
    DateTime? lastExportAt,
    Duration? remainingCooldown,
    String? error,
    bool clearError = false,
  }) {
    return PrivacyState(
      exportStatus: exportStatus ?? this.exportStatus,
      deleteStatus: deleteStatus ?? this.deleteStatus,
      lastExportAt: lastExportAt ?? this.lastExportAt,
      remainingCooldown: remainingCooldown ?? this.remainingCooldown,
      error: clearError ? null : error ?? this.error,
    );
  }
}
