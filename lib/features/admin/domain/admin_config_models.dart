/// ASORA ADMIN CONFIG MODELS
///
/// 🎯 Purpose: Typed models for admin configuration API
/// 📡 Endpoints: GET/PUT /api/admin/config
/// 🏗️ Architecture: Domain layer - immutable value objects
/// 📱 Platform: Flutter with Riverpod state management
library;

import 'package:flutter/foundation.dart';

/// Identity of the user who last updated the config
@immutable
class UpdatedBy {
  const UpdatedBy({required this.id, this.displayName});

  /// Unique identifier (email or sub claim)
  final String id;

  /// Optional display name for UI
  final String? displayName;

  factory UpdatedBy.fromJson(Map<String, dynamic> json) {
    // Handle both object format and string format
    if (json.containsKey('id')) {
      return UpdatedBy(
        id: json['id'] as String? ?? 'unknown',
        displayName: json['displayName'] as String?,
      );
    }
    // Fallback: if updatedBy is just a string in the envelope
    return UpdatedBy(id: json.toString());
  }

  /// Parse from string (legacy format where updatedBy is just email)
  factory UpdatedBy.fromString(String value) {
    return UpdatedBy(id: value);
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    if (displayName != null) 'displayName': displayName,
  };

  /// Display label for UI (prefers displayName, falls back to id)
  String get displayLabel => displayName ?? id;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UpdatedBy &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          displayName == other.displayName;

  @override
  int get hashCode => id.hashCode ^ displayName.hashCode;

  @override
  String toString() => 'UpdatedBy(id: $id, displayName: $displayName)';
}

/// Moderation configuration settings
@immutable
class ModerationConfig {
  const ModerationConfig({
    this.temperature = 0.2,
    this.toxicityThreshold = 0.85,
    this.autoRejectThreshold = 0.95,
    this.enableHiveAi = true,
    this.enableAzureContentSafety = true,
  });

  /// AI temperature for moderation decisions (0.0 - 1.0)
  final double temperature;

  /// Toxicity threshold for flagging content (0.0 - 1.0)
  final double toxicityThreshold;

  /// Threshold above which content is auto-rejected (0.0 - 1.0)
  final double autoRejectThreshold;

  /// Whether Hive AI moderation is enabled
  final bool enableHiveAi;

  /// Whether Azure Content Safety fallback is enabled
  final bool enableAzureContentSafety;

  factory ModerationConfig.fromJson(Map<String, dynamic> json) {
    return ModerationConfig(
      temperature: (json['temperature'] as num?)?.toDouble() ?? 0.2,
      toxicityThreshold:
          (json['toxicityThreshold'] as num?)?.toDouble() ?? 0.85,
      autoRejectThreshold:
          (json['autoRejectThreshold'] as num?)?.toDouble() ?? 0.95,
      enableHiveAi: json['enableHiveAi'] as bool? ?? true,
      enableAzureContentSafety:
          json['enableAzureContentSafety'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    'temperature': temperature,
    'toxicityThreshold': toxicityThreshold,
    'autoRejectThreshold': autoRejectThreshold,
    'enableHiveAi': enableHiveAi,
    'enableAzureContentSafety': enableAzureContentSafety,
  };

  ModerationConfig copyWith({
    double? temperature,
    double? toxicityThreshold,
    double? autoRejectThreshold,
    bool? enableHiveAi,
    bool? enableAzureContentSafety,
  }) {
    return ModerationConfig(
      temperature: temperature ?? this.temperature,
      toxicityThreshold: toxicityThreshold ?? this.toxicityThreshold,
      autoRejectThreshold: autoRejectThreshold ?? this.autoRejectThreshold,
      enableHiveAi: enableHiveAi ?? this.enableHiveAi,
      enableAzureContentSafety:
          enableAzureContentSafety ?? this.enableAzureContentSafety,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ModerationConfig &&
          runtimeType == other.runtimeType &&
          temperature == other.temperature &&
          toxicityThreshold == other.toxicityThreshold &&
          autoRejectThreshold == other.autoRejectThreshold &&
          enableHiveAi == other.enableHiveAi &&
          enableAzureContentSafety == other.enableAzureContentSafety;

  @override
  int get hashCode =>
      temperature.hashCode ^
      toxicityThreshold.hashCode ^
      autoRejectThreshold.hashCode ^
      enableHiveAi.hashCode ^
      enableAzureContentSafety.hashCode;
}

/// Feature flags configuration
@immutable
class FeatureFlagsConfig {
  const FeatureFlagsConfig({
    this.appealsEnabled = true,
    this.communityVotingEnabled = true,
    this.pushNotificationsEnabled = true,
    this.maintenanceMode = false,
  });

  /// Whether users can appeal moderation decisions
  final bool appealsEnabled;

  /// Whether community voting on appeals is enabled
  final bool communityVotingEnabled;

  /// Whether push notifications are enabled globally
  final bool pushNotificationsEnabled;

  /// Whether the app is in maintenance mode
  final bool maintenanceMode;

  factory FeatureFlagsConfig.fromJson(Map<String, dynamic> json) {
    return FeatureFlagsConfig(
      appealsEnabled: json['appealsEnabled'] as bool? ?? true,
      communityVotingEnabled: json['communityVotingEnabled'] as bool? ?? true,
      pushNotificationsEnabled:
          json['pushNotificationsEnabled'] as bool? ?? true,
      maintenanceMode: json['maintenanceMode'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'appealsEnabled': appealsEnabled,
    'communityVotingEnabled': communityVotingEnabled,
    'pushNotificationsEnabled': pushNotificationsEnabled,
    'maintenanceMode': maintenanceMode,
  };

  FeatureFlagsConfig copyWith({
    bool? appealsEnabled,
    bool? communityVotingEnabled,
    bool? pushNotificationsEnabled,
    bool? maintenanceMode,
  }) {
    return FeatureFlagsConfig(
      appealsEnabled: appealsEnabled ?? this.appealsEnabled,
      communityVotingEnabled:
          communityVotingEnabled ?? this.communityVotingEnabled,
      pushNotificationsEnabled:
          pushNotificationsEnabled ?? this.pushNotificationsEnabled,
      maintenanceMode: maintenanceMode ?? this.maintenanceMode,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FeatureFlagsConfig &&
          runtimeType == other.runtimeType &&
          appealsEnabled == other.appealsEnabled &&
          communityVotingEnabled == other.communityVotingEnabled &&
          pushNotificationsEnabled == other.pushNotificationsEnabled &&
          maintenanceMode == other.maintenanceMode;

  @override
  int get hashCode =>
      appealsEnabled.hashCode ^
      communityVotingEnabled.hashCode ^
      pushNotificationsEnabled.hashCode ^
      maintenanceMode.hashCode;
}

/// Complete admin configuration payload
@immutable
class AdminConfig {
  const AdminConfig({
    this.schemaVersion = 1,
    this.moderation = const ModerationConfig(),
    this.featureFlags = const FeatureFlagsConfig(),
  });

  /// Schema version for future migrations
  final int schemaVersion;

  /// Moderation settings
  final ModerationConfig moderation;

  /// Feature flags
  final FeatureFlagsConfig featureFlags;

  factory AdminConfig.fromJson(Map<String, dynamic> json) {
    // Handle both nested payload format and flat format
    final payload = json['payload'] as Map<String, dynamic>? ?? json;

    return AdminConfig(
      schemaVersion:
          (json['schemaVersion'] as num?)?.toInt() ??
          (payload['schemaVersion'] as num?)?.toInt() ??
          1,
      moderation: ModerationConfig.fromJson(
        payload['moderation'] as Map<String, dynamic>? ?? {},
      ),
      featureFlags: FeatureFlagsConfig.fromJson(
        payload['featureFlags'] as Map<String, dynamic>? ?? {},
      ),
    );
  }

  Map<String, dynamic> toJson() => {
    'schemaVersion': schemaVersion,
    'moderation': moderation.toJson(),
    'featureFlags': featureFlags.toJson(),
  };

  AdminConfig copyWith({
    int? schemaVersion,
    ModerationConfig? moderation,
    FeatureFlagsConfig? featureFlags,
  }) {
    return AdminConfig(
      schemaVersion: schemaVersion ?? this.schemaVersion,
      moderation: moderation ?? this.moderation,
      featureFlags: featureFlags ?? this.featureFlags,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AdminConfig &&
          runtimeType == other.runtimeType &&
          schemaVersion == other.schemaVersion &&
          moderation == other.moderation &&
          featureFlags == other.featureFlags;

  @override
  int get hashCode =>
      schemaVersion.hashCode ^ moderation.hashCode ^ featureFlags.hashCode;
}

/// Full admin configuration envelope with metadata
@immutable
class AdminConfigEnvelope {
  const AdminConfigEnvelope({
    required this.version,
    required this.lastUpdatedAt,
    required this.lastUpdatedBy,
    required this.config,
  });

  /// Server-side version number for optimistic locking
  final int version;

  /// When the config was last updated (UTC)
  final DateTime lastUpdatedAt;

  /// Who last updated the config
  final UpdatedBy lastUpdatedBy;

  /// The actual configuration data
  final AdminConfig config;

  factory AdminConfigEnvelope.fromJson(Map<String, dynamic> json) {
    // Parse updatedAt (API returns 'updatedAt', not 'lastUpdatedAt')
    final updatedAtStr =
        json['updatedAt'] as String? ?? json['lastUpdatedAt'] as String?;
    DateTime updatedAt;
    try {
      updatedAt = updatedAtStr != null
          ? DateTime.parse(updatedAtStr)
          : DateTime.now();
    } catch (_) {
      updatedAt = DateTime.now();
    }

    // Parse updatedBy - can be string or object
    UpdatedBy updatedBy;
    final updatedByRaw = json['updatedBy'] ?? json['lastUpdatedBy'];
    if (updatedByRaw is Map) {
      updatedBy = UpdatedBy.fromJson(Map<String, dynamic>.from(updatedByRaw));
    } else if (updatedByRaw is String) {
      updatedBy = UpdatedBy.fromString(updatedByRaw);
    } else {
      updatedBy = const UpdatedBy(id: 'unknown');
    }

    // Parse config from payload
    final payloadRaw = json['payload'];
    final payload = payloadRaw is Map
        ? Map<String, dynamic>.from(payloadRaw)
        : <String, dynamic>{};

    return AdminConfigEnvelope(
      version: (json['version'] as num?)?.toInt() ?? 1,
      lastUpdatedAt: updatedAt,
      lastUpdatedBy: updatedBy,
      config: AdminConfig.fromJson(payload),
    );
  }

  Map<String, dynamic> toJson() => {
    'version': version,
    'updatedAt': lastUpdatedAt.toUtc().toIso8601String(),
    'updatedBy': lastUpdatedBy.toJson(),
    'payload': config.toJson(),
  };

  AdminConfigEnvelope copyWith({
    int? version,
    DateTime? lastUpdatedAt,
    UpdatedBy? lastUpdatedBy,
    AdminConfig? config,
  }) {
    return AdminConfigEnvelope(
      version: version ?? this.version,
      lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
      lastUpdatedBy: lastUpdatedBy ?? this.lastUpdatedBy,
      config: config ?? this.config,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AdminConfigEnvelope &&
          runtimeType == other.runtimeType &&
          version == other.version &&
          lastUpdatedAt == other.lastUpdatedAt &&
          lastUpdatedBy == other.lastUpdatedBy &&
          config == other.config;

  @override
  int get hashCode =>
      version.hashCode ^
      lastUpdatedAt.hashCode ^
      lastUpdatedBy.hashCode ^
      config.hashCode;

  @override
  String toString() =>
      'AdminConfigEnvelope(version: $version, lastUpdatedAt: $lastUpdatedAt, lastUpdatedBy: $lastUpdatedBy)';
}

/// Audit log entry for configuration changes
@immutable
class AdminAuditEntry {
  const AdminAuditEntry({
    required this.id,
    required this.timestamp,
    required this.actor,
    required this.action,
    required this.resource,
    this.before,
    this.after,
  });

  final String id;
  final DateTime timestamp;
  final String actor;
  final String action;
  final String resource;
  final Map<String, dynamic>? before;
  final Map<String, dynamic>? after;

  factory AdminAuditEntry.fromJson(Map<String, dynamic> json) {
    DateTime timestamp;
    try {
      timestamp = DateTime.parse(json['timestamp'] as String);
    } catch (_) {
      timestamp = DateTime.now();
    }

    return AdminAuditEntry(
      id: json['id'] as String? ?? '',
      timestamp: timestamp,
      actor: json['actor'] as String? ?? 'unknown',
      action: json['action'] as String? ?? 'unknown',
      resource: json['resource'] as String? ?? 'unknown',
      before: json['before'] as Map<String, dynamic>?,
      after: json['after'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'timestamp': timestamp.toUtc().toIso8601String(),
    'actor': actor,
    'action': action,
    'resource': resource,
    if (before != null) 'before': before,
    if (after != null) 'after': after,
  };
}

/// Response from audit log endpoint
@immutable
class AdminAuditResponse {
  const AdminAuditResponse({required this.entries, required this.limit});

  final List<AdminAuditEntry> entries;
  final int limit;

  factory AdminAuditResponse.fromJson(Map<String, dynamic> json) {
    final entriesJson = json['entries'] as List<dynamic>? ?? [];
    return AdminAuditResponse(
      entries: entriesJson
          .map((e) => AdminAuditEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
      limit: (json['limit'] as num?)?.toInt() ?? 50,
    );
  }
}
