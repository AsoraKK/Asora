/// Tests for admin config models
///
/// Covers JSON parsing, serialization, and equality checks
library;

import 'package:flutter_test/flutter_test.dart';

import 'package:asora/features/admin/domain/admin_config_models.dart';

void main() {
  group('UpdatedBy', () {
    test('parses from JSON object', () {
      final json = {'id': 'user@example.com', 'displayName': 'Admin User'};

      final result = UpdatedBy.fromJson(json);

      expect(result.id, 'user@example.com');
      expect(result.displayName, 'Admin User');
      expect(result.displayLabel, 'Admin User');
    });

    test('parses from string', () {
      final result = UpdatedBy.fromString('user@example.com');

      expect(result.id, 'user@example.com');
      expect(result.displayName, isNull);
      expect(result.displayLabel, 'user@example.com');
    });

    test('handles missing displayName', () {
      final json = {'id': 'system'};

      final result = UpdatedBy.fromJson(json);

      expect(result.id, 'system');
      expect(result.displayName, isNull);
    });

    test('toJson round-trips correctly', () {
      const original = UpdatedBy(
        id: 'test@example.com',
        displayName: 'Test User',
      );

      final json = original.toJson();
      final restored = UpdatedBy.fromJson(json);

      expect(restored.id, original.id);
      expect(restored.displayName, original.displayName);
    });
  });

  group('ModerationConfig', () {
    test('parses from JSON with new field names', () {
      final json = {
        'temperature': 0.3,
        'hiveAutoFlagThreshold': 0.9,
        'hiveAutoRemoveThreshold': 0.98,
        'enableAutoModeration': false,
        'enableAzureContentSafety': true,
      };

      final result = ModerationConfig.fromJson(json);

      expect(result.temperature, 0.3);
      expect(result.hiveAutoFlagThreshold, 0.9);
      expect(result.hiveAutoRemoveThreshold, 0.98);
      expect(result.enableAutoModeration, false);
      expect(result.enableAzureContentSafety, true);
    });

    test('parses from JSON with legacy field names (backward compat)', () {
      final json = {
        'temperature': 0.3,
        'toxicityThreshold': 0.85,
        'autoRejectThreshold': 0.99,
        'enableHiveAi': false,
        'enableAzureContentSafety': true,
      };

      final result = ModerationConfig.fromJson(json);

      // Legacy fields should map to new fields
      expect(result.hiveAutoFlagThreshold, 0.85);
      expect(result.hiveAutoRemoveThreshold, 0.99);
      expect(result.enableAutoModeration, false);
    });

    test('uses defaults for missing fields', () {
      final result = ModerationConfig.fromJson(const {});

      expect(result.temperature, 0.2);
      expect(result.hiveAutoFlagThreshold, 0.8);
      expect(result.hiveAutoRemoveThreshold, 0.95);
      expect(result.enableAutoModeration, true);
      expect(result.enableAzureContentSafety, true);
    });

    test('copyWith preserves unchanged fields', () {
      const original = ModerationConfig(
        temperature: 0.5,
        hiveAutoFlagThreshold: 0.7,
      );

      final modified = original.copyWith(temperature: 0.6);

      expect(modified.temperature, 0.6);
      expect(modified.hiveAutoFlagThreshold, 0.7);
    });

    test('equality works correctly', () {
      const a = ModerationConfig(temperature: 0.5);
      const b = ModerationConfig(temperature: 0.5);
      const c = ModerationConfig(temperature: 0.6);

      expect(a, equals(b));
      expect(a, isNot(equals(c)));
    });
  });

  group('FeatureFlagsConfig', () {
    test('parses from JSON with all fields', () {
      final json = {
        'appealsEnabled': false,
        'communityVotingEnabled': false,
        'pushNotificationsEnabled': true,
        'maintenanceMode': true,
      };

      final result = FeatureFlagsConfig.fromJson(json);

      expect(result.appealsEnabled, false);
      expect(result.communityVotingEnabled, false);
      expect(result.pushNotificationsEnabled, true);
      expect(result.maintenanceMode, true);
    });

    test('uses defaults for missing fields', () {
      final result = FeatureFlagsConfig.fromJson(const {});

      expect(result.appealsEnabled, true);
      expect(result.communityVotingEnabled, true);
      expect(result.pushNotificationsEnabled, true);
      expect(result.maintenanceMode, false);
    });
  });

  group('AdminConfig', () {
    test('parses from nested payload format', () {
      final json = {
        'schemaVersion': 2,
        'payload': {
          'moderation': {'temperature': 0.3},
          'featureFlags': {'appealsEnabled': false},
        },
      };

      final result = AdminConfig.fromJson(json);

      expect(result.schemaVersion, 2);
      expect(result.moderation.temperature, 0.3);
      expect(result.featureFlags.appealsEnabled, false);
    });

    test('parses from flat format', () {
      final json = {
        'schemaVersion': 1,
        'moderation': {'temperature': 0.4},
        'featureFlags': {'maintenanceMode': true},
      };

      final result = AdminConfig.fromJson(json);

      expect(result.schemaVersion, 1);
      expect(result.moderation.temperature, 0.4);
      expect(result.featureFlags.maintenanceMode, true);
    });

    test('toJson produces correct structure', () {
      const config = AdminConfig(
        schemaVersion: 1,
        moderation: ModerationConfig(temperature: 0.5),
        featureFlags: FeatureFlagsConfig(appealsEnabled: false),
      );

      final json = config.toJson();

      expect(json['schemaVersion'], 1);
      expect(json['moderation']['temperature'], 0.5);
      expect(json['featureFlags']['appealsEnabled'], false);
    });
  });

  group('AdminConfigEnvelope', () {
    test('parses full server response', () {
      final json = {
        'version': 12,
        'updatedAt': '2025-12-27T10:15:30.123Z',
        'updatedBy': 'admin@example.com',
        'payload': {
          'schemaVersion': 1,
          'moderation': {'temperature': 0.2, 'hiveAutoFlagThreshold': 0.8},
          'featureFlags': {'appealsEnabled': true},
        },
      };

      final result = AdminConfigEnvelope.fromJson(json);

      expect(result.version, 12);
      expect(result.lastUpdatedAt.year, 2025);
      expect(result.lastUpdatedAt.month, 12);
      expect(result.lastUpdatedAt.day, 27);
      expect(result.lastUpdatedBy.id, 'admin@example.com');
      expect(result.config.moderation.temperature, 0.2);
      expect(result.config.featureFlags.appealsEnabled, true);
    });

    test('parses updatedBy as object', () {
      final json = {
        'version': 5,
        'updatedAt': '2025-01-01T00:00:00Z',
        'updatedBy': {'id': 'user-123', 'displayName': 'Test Admin'},
        'payload': <String, dynamic>{},
      };

      final result = AdminConfigEnvelope.fromJson(json);

      expect(result.lastUpdatedBy.id, 'user-123');
      expect(result.lastUpdatedBy.displayName, 'Test Admin');
    });

    test('handles alternative field names', () {
      final json = {
        'version': 1,
        'lastUpdatedAt': '2025-06-15T12:00:00Z',
        'lastUpdatedBy': 'system',
        'payload': <String, dynamic>{},
      };

      final result = AdminConfigEnvelope.fromJson(json);

      expect(result.version, 1);
      expect(result.lastUpdatedAt.month, 6);
      expect(result.lastUpdatedBy.id, 'system');
    });

    test('golden JSON test - real API response (legacy fields)', () {
      // This matches the actual server response format (legacy field names)
      // The ModerationConfig.fromJson provides backward compat mapping
      final goldenJson = {
        'version': 42,
        'updatedAt': '2025-12-27T08:30:00.000Z',
        'updatedBy': 'kyle.kern@asora.co.za',
        'payload': {
          'schemaVersion': 1,
          'moderation': {
            'temperature': 0.2,
            'toxicityThreshold': 0.85,
            'autoRejectThreshold': 0.95,
            'enableHiveAi': true,
            'enableAzureContentSafety': true,
          },
          'featureFlags': {
            'appealsEnabled': true,
            'communityVotingEnabled': true,
            'pushNotificationsEnabled': true,
            'maintenanceMode': false,
          },
        },
      };

      final result = AdminConfigEnvelope.fromJson(goldenJson);

      // Verify all fields parsed correctly (legacy mapped to new names)
      expect(result.version, 42);
      expect(
        result.lastUpdatedAt.toUtc().toIso8601String(),
        '2025-12-27T08:30:00.000Z',
      );
      expect(result.lastUpdatedBy.id, 'kyle.kern@asora.co.za');
      expect(result.config.schemaVersion, 1);
      expect(result.config.moderation.temperature, 0.2);
      // Legacy fields map to new names
      expect(result.config.moderation.hiveAutoFlagThreshold, 0.85);
      expect(result.config.moderation.hiveAutoRemoveThreshold, 0.95);
      expect(result.config.moderation.enableAutoModeration, true);
      expect(result.config.moderation.enableAzureContentSafety, true);
      expect(result.config.featureFlags.appealsEnabled, true);
      expect(result.config.featureFlags.communityVotingEnabled, true);
      expect(result.config.featureFlags.pushNotificationsEnabled, true);
      expect(result.config.featureFlags.maintenanceMode, false);
    });
  });

  group('AdminAuditEntry', () {
    test('parses from JSON', () {
      final json = {
        'id': 'audit-123',
        'timestamp': '2025-12-27T10:00:00Z',
        'actor': 'admin@example.com',
        'action': 'update',
        'resource': 'admin_config',
        'before': {'temperature': 0.2},
        'after': {'temperature': 0.3},
      };

      final result = AdminAuditEntry.fromJson(json);

      expect(result.id, 'audit-123');
      expect(result.actor, 'admin@example.com');
      expect(result.action, 'update');
      expect(result.resource, 'admin_config');
      expect(result.before, isNotNull);
      expect(result.after, isNotNull);
    });

    test('handles missing optional fields', () {
      final json = {
        'id': 'audit-456',
        'timestamp': '2025-12-27T10:00:00Z',
        'actor': 'system',
        'action': 'create',
        'resource': 'admin_config',
      };

      final result = AdminAuditEntry.fromJson(json);

      expect(result.before, isNull);
      expect(result.after, isNull);
    });
  });

  group('AdminAuditResponse', () {
    test('parses list of entries', () {
      final json = {
        'entries': [
          {
            'id': '1',
            'timestamp': '2025-12-27T10:00:00Z',
            'actor': 'user1@example.com',
            'action': 'update',
            'resource': 'admin_config',
          },
          {
            'id': '2',
            'timestamp': '2025-12-27T09:00:00Z',
            'actor': 'user2@example.com',
            'action': 'update',
            'resource': 'admin_config',
          },
        ],
        'limit': 50,
      };

      final result = AdminAuditResponse.fromJson(json);

      expect(result.entries.length, 2);
      expect(result.limit, 50);
      expect(result.entries[0].id, '1');
      expect(result.entries[1].id, '2');
    });

    test('handles empty entries', () {
      final json = {'entries': <dynamic>[], 'limit': 20};

      final result = AdminAuditResponse.fromJson(json);

      expect(result.entries, isEmpty);
      expect(result.limit, 20);
    });
  });
}
