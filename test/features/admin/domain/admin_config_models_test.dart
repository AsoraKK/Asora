import 'package:asora/features/admin/domain/admin_config_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('UpdatedBy', () {
    test('creates from JSON with id and displayName', () {
      final json = {'id': 'test@example.com', 'displayName': 'Test User'};
      final updatedBy = UpdatedBy.fromJson(json);

      expect(updatedBy.id, 'test@example.com');
      expect(updatedBy.displayName, 'Test User');
    });

    test('creates from JSON with only id', () {
      final json = {'id': 'test@example.com'};
      final updatedBy = UpdatedBy.fromJson(json);

      expect(updatedBy.id, 'test@example.com');
      expect(updatedBy.displayName, isNull);
    });

    test('creates from string (legacy format)', () {
      final updatedBy = UpdatedBy.fromString('test@example.com');

      expect(updatedBy.id, 'test@example.com');
      expect(updatedBy.displayName, isNull);
    });

    test('toJson includes displayName when present', () {
      const updatedBy = UpdatedBy(
        id: 'test@example.com',
        displayName: 'Test User',
      );
      final json = updatedBy.toJson();

      expect(json['id'], 'test@example.com');
      expect(json['displayName'], 'Test User');
    });

    test('toJson excludes displayName when null', () {
      const updatedBy = UpdatedBy(id: 'test@example.com');
      final json = updatedBy.toJson();

      expect(json['id'], 'test@example.com');
      expect(json.containsKey('displayName'), isFalse);
    });

    test('displayLabel returns displayName when available', () {
      const updatedBy = UpdatedBy(
        id: 'test@example.com',
        displayName: 'Test User',
      );
      expect(updatedBy.displayLabel, 'Test User');
    });

    test('displayLabel returns id when displayName is null', () {
      const updatedBy = UpdatedBy(id: 'test@example.com');
      expect(updatedBy.displayLabel, 'test@example.com');
    });

    test('equality works correctly', () {
      const updatedBy1 = UpdatedBy(id: 'test@example.com', displayName: 'Test');
      const updatedBy2 = UpdatedBy(id: 'test@example.com', displayName: 'Test');
      const updatedBy3 = UpdatedBy(
        id: 'other@example.com',
        displayName: 'Test',
      );

      expect(updatedBy1, updatedBy2);
      expect(updatedBy1, isNot(updatedBy3));
    });

    test('hashCode is consistent', () {
      const updatedBy1 = UpdatedBy(id: 'test@example.com', displayName: 'Test');
      const updatedBy2 = UpdatedBy(id: 'test@example.com', displayName: 'Test');

      expect(updatedBy1.hashCode, updatedBy2.hashCode);
    });

    test('toString includes both fields', () {
      const updatedBy = UpdatedBy(
        id: 'test@example.com',
        displayName: 'Test User',
      );
      final string = updatedBy.toString();

      expect(string, contains('test@example.com'));
      expect(string, contains('Test User'));
    });
  });

  group('ModerationConfig', () {
    test('creates with default values', () {
      const config = ModerationConfig();

      expect(config.temperature, 0.2);
      expect(config.hiveAutoFlagThreshold, 0.8);
      expect(config.hiveAutoRemoveThreshold, 0.95);
      expect(config.enableAutoModeration, isTrue);
      expect(config.enableAzureContentSafety, isTrue);
    });

    test('creates with custom values', () {
      const config = ModerationConfig(
        temperature: 0.5,
        hiveAutoFlagThreshold: 0.7,
        hiveAutoRemoveThreshold: 0.9,
        enableAutoModeration: false,
        enableAzureContentSafety: false,
      );

      expect(config.temperature, 0.5);
      expect(config.hiveAutoFlagThreshold, 0.7);
      expect(config.hiveAutoRemoveThreshold, 0.9);
      expect(config.enableAutoModeration, isFalse);
      expect(config.enableAzureContentSafety, isFalse);
    });

    test('toJson returns correct map', () {
      const config = ModerationConfig(
        temperature: 0.3,
        hiveAutoFlagThreshold: 0.75,
        hiveAutoRemoveThreshold: 0.92,
        enableAutoModeration: true,
        enableAzureContentSafety: false,
      );

      final json = config.toJson();

      expect(json['temperature'], 0.3);
      expect(json['hiveAutoFlagThreshold'], 0.75);
      expect(json['hiveAutoRemoveThreshold'], 0.92);
      expect(json['enableAutoModeration'], isTrue);
      expect(json['enableAzureContentSafety'], isFalse);
    });

    test('fromJson creates correct instance', () {
      final json = {
        'temperature': 0.4,
        'hiveAutoFlagThreshold': 0.85,
        'hiveAutoRemoveThreshold': 0.96,
        'enableAutoModeration': false,
        'enableAzureContentSafety': true,
      };

      final config = ModerationConfig.fromJson(json);

      expect(config.temperature, 0.4);
      expect(config.hiveAutoFlagThreshold, 0.85);
      expect(config.hiveAutoRemoveThreshold, 0.96);
      expect(config.enableAutoModeration, isFalse);
      expect(config.enableAzureContentSafety, isTrue);
    });

    test('fromJson uses defaults for missing fields', () {
      final json = <String, dynamic>{};
      final config = ModerationConfig.fromJson(json);

      expect(config.temperature, 0.2);
      expect(config.hiveAutoFlagThreshold, 0.8);
      expect(config.hiveAutoRemoveThreshold, 0.95);
      expect(config.enableAutoModeration, isTrue);
      expect(config.enableAzureContentSafety, isTrue);
    });

    test('equality works correctly', () {
      const config1 = ModerationConfig(temperature: 0.3);
      const config2 = ModerationConfig(temperature: 0.3);
      const config3 = ModerationConfig(temperature: 0.4);

      expect(config1, config2);
      expect(config1, isNot(config3));
    });

    test('hashCode is consistent', () {
      const config1 = ModerationConfig(temperature: 0.3);
      const config2 = ModerationConfig(temperature: 0.3);

      expect(config1.hashCode, config2.hashCode);
    });

    test('copyWith creates new instance with modified values', () {
      const config = ModerationConfig(temperature: 0.3);
      final modified = config.copyWith(
        temperature: 0.5,
        enableAutoModeration: false,
      );

      expect(modified.temperature, 0.5);
      expect(modified.enableAutoModeration, isFalse);
      expect(modified.hiveAutoFlagThreshold, config.hiveAutoFlagThreshold);
    });

    test('copyWith preserves unmodified values', () {
      const config = ModerationConfig(
        temperature: 0.3,
        hiveAutoFlagThreshold: 0.75,
        enableAutoModeration: false,
      );
      final modified = config.copyWith(temperature: 0.4);

      expect(modified.temperature, 0.4);
      expect(modified.hiveAutoFlagThreshold, 0.75);
      expect(modified.enableAutoModeration, isFalse);
    });
  });

  group('FeatureFlagsConfig', () {
    test('default constructor creates instance with correct values', () {
      const config = FeatureFlagsConfig();

      expect(config.appealsEnabled, isTrue);
      expect(config.communityVotingEnabled, isTrue);
      expect(config.pushNotificationsEnabled, isTrue);
      expect(config.maintenanceMode, isFalse);
    });

    test('fromJson creates correct instance', () {
      final json = {
        'appealsEnabled': false,
        'communityVotingEnabled': false,
        'pushNotificationsEnabled': false,
        'maintenanceMode': true,
      };

      final config = FeatureFlagsConfig.fromJson(json);

      expect(config.appealsEnabled, isFalse);
      expect(config.communityVotingEnabled, isFalse);
      expect(config.pushNotificationsEnabled, isFalse);
      expect(config.maintenanceMode, isTrue);
    });

    test('fromJson handles missing fields with defaults', () {
      final config = FeatureFlagsConfig.fromJson({});

      expect(config.appealsEnabled, isTrue);
      expect(config.communityVotingEnabled, isTrue);
      expect(config.pushNotificationsEnabled, isTrue);
      expect(config.maintenanceMode, isFalse);
    });

    test('toJson serializes all fields', () {
      const config = FeatureFlagsConfig(
        appealsEnabled: false,
        communityVotingEnabled: true,
        pushNotificationsEnabled: false,
        maintenanceMode: true,
      );

      final json = config.toJson();

      expect(json['appealsEnabled'], isFalse);
      expect(json['communityVotingEnabled'], isTrue);
      expect(json['pushNotificationsEnabled'], isFalse);
      expect(json['maintenanceMode'], isTrue);
    });

    test('equality works correctly', () {
      const config1 = FeatureFlagsConfig(appealsEnabled: false);
      const config2 = FeatureFlagsConfig(appealsEnabled: false);
      const config3 = FeatureFlagsConfig(appealsEnabled: true);

      expect(config1, config2);
      expect(config1, isNot(config3));
    });

    test('hashCode is consistent with equality', () {
      const config1 = FeatureFlagsConfig(appealsEnabled: false);
      const config2 = FeatureFlagsConfig(appealsEnabled: false);

      expect(config1.hashCode, config2.hashCode);
    });

    test('copyWith creates modified instance', () {
      const config = FeatureFlagsConfig();
      final modified = config.copyWith(
        appealsEnabled: false,
        maintenanceMode: true,
      );

      expect(modified.appealsEnabled, isFalse);
      expect(modified.maintenanceMode, isTrue);
      expect(modified.communityVotingEnabled, isTrue);
      expect(modified.pushNotificationsEnabled, isTrue);
    });
  });

  group('AdminConfig', () {
    test('default constructor creates instance with defaults', () {
      const config = AdminConfig();

      expect(config.schemaVersion, 1);
      expect(config.moderation, const ModerationConfig());
      expect(config.featureFlags, const FeatureFlagsConfig());
    });

    test('fromJson creates correct instance', () {
      final json = {
        'schemaVersion': 2,
        'moderation': {'temperature': 0.5},
        'featureFlags': {'appealsEnabled': false},
      };

      final config = AdminConfig.fromJson(json);

      expect(config.schemaVersion, 2);
      expect(config.moderation.temperature, 0.5);
      expect(config.featureFlags.appealsEnabled, isFalse);
    });

    test('fromJson handles nested payload format', () {
      final json = {
        'payload': {
          'schemaVersion': 3,
          'moderation': {'temperature': 0.3},
          'featureFlags': {'maintenanceMode': true},
        },
      };

      final config = AdminConfig.fromJson(json);

      expect(config.schemaVersion, 3);
      expect(config.moderation.temperature, 0.3);
      expect(config.featureFlags.maintenanceMode, isTrue);
    });

    test('fromJson handles missing nested objects', () {
      final config = AdminConfig.fromJson({});

      expect(config.schemaVersion, 1);
      expect(config.moderation, const ModerationConfig());
      expect(config.featureFlags, const FeatureFlagsConfig());
    });

    test('toJson serializes all fields', () {
      const config = AdminConfig(
        schemaVersion: 2,
        moderation: ModerationConfig(temperature: 0.6),
        featureFlags: FeatureFlagsConfig(maintenanceMode: true),
      );

      final json = config.toJson();

      expect(json['schemaVersion'], 2);
      expect(json['moderation'], isA<Map<String, dynamic>>());
      expect(json['featureFlags'], isA<Map<String, dynamic>>());
    });

    test('equality works correctly', () {
      const config1 = AdminConfig(schemaVersion: 2);
      const config2 = AdminConfig(schemaVersion: 2);
      const config3 = AdminConfig(schemaVersion: 3);

      expect(config1, config2);
      expect(config1, isNot(config3));
    });

    test('hashCode is consistent with equality', () {
      const config1 = AdminConfig(schemaVersion: 2);
      const config2 = AdminConfig(schemaVersion: 2);

      expect(config1.hashCode, config2.hashCode);
    });

    test('copyWith creates modified instance', () {
      const config = AdminConfig();
      final modified = config.copyWith(
        schemaVersion: 5,
        moderation: const ModerationConfig(temperature: 0.7),
      );

      expect(modified.schemaVersion, 5);
      expect(modified.moderation.temperature, 0.7);
      expect(modified.featureFlags, config.featureFlags);
    });
  });

  group('AdminConfigEnvelope', () {
    final testDate = DateTime.utc(2024, 1, 15, 10, 30);

    test('fromJson creates correct instance', () {
      final json = {
        'version': 5,
        'updatedAt': '2024-01-15T10:30:00Z',
        'updatedBy': <String, dynamic>{
          'id': 'user123',
          'displayName': 'Test User',
        },
        'payload': <String, dynamic>{
          'schemaVersion': 2,
          'moderation': <String, dynamic>{},
          'featureFlags': <String, dynamic>{},
        },
      };

      final envelope = AdminConfigEnvelope.fromJson(json);

      expect(envelope.version, 5);
      expect(envelope.lastUpdatedAt, DateTime.utc(2024, 1, 15, 10, 30));
      expect(envelope.lastUpdatedBy.id, 'user123');
      expect(envelope.config.schemaVersion, 2);
    });

    test('fromJson handles string updatedBy', () {
      final json = {
        'version': 1,
        'updatedAt': '2024-01-15T10:30:00Z',
        'updatedBy': 'user456',
        'payload': <String, dynamic>{},
      };

      final envelope = AdminConfigEnvelope.fromJson(json);

      expect(envelope.lastUpdatedBy.id, 'user456');
    });

    test('fromJson handles legacy lastUpdatedAt field', () {
      final json = {
        'version': 1,
        'lastUpdatedAt': '2024-01-15T10:30:00Z',
        'lastUpdatedBy': 'user',
        'payload': <String, dynamic>{},
      };

      final envelope = AdminConfigEnvelope.fromJson(json);

      expect(envelope.lastUpdatedAt, DateTime.utc(2024, 1, 15, 10, 30));
    });

    test('fromJson handles invalid date', () {
      final json = {
        'version': 1,
        'updatedAt': 'invalid-date',
        'updatedBy': 'user',
        'payload': <String, dynamic>{},
      };

      final envelope = AdminConfigEnvelope.fromJson(json);

      expect(envelope.lastUpdatedAt, isA<DateTime>());
    });

    test('fromJson defaults to unknown updatedBy', () {
      final json = {
        'version': 1,
        'updatedAt': '2024-01-15T10:30:00Z',
        'payload': <String, dynamic>{},
      };

      final envelope = AdminConfigEnvelope.fromJson(json);

      expect(envelope.lastUpdatedBy.id, 'unknown');
    });

    test('toJson serializes correctly', () {
      final envelope = AdminConfigEnvelope(
        version: 3,
        lastUpdatedAt: testDate,
        lastUpdatedBy: const UpdatedBy(id: 'admin123', displayName: 'Admin'),
        config: const AdminConfig(schemaVersion: 2),
      );

      final json = envelope.toJson();

      expect(json['version'], 3);
      expect(json['updatedAt'], '2024-01-15T10:30:00.000Z');
      expect(json['updatedBy'], isA<Map<String, dynamic>>());
      expect(json['payload'], isA<Map<String, dynamic>>());
    });

    test('equality works correctly', () {
      final envelope1 = AdminConfigEnvelope(
        version: 1,
        lastUpdatedAt: testDate,
        lastUpdatedBy: const UpdatedBy(id: 'user'),
        config: const AdminConfig(),
      );
      final envelope2 = AdminConfigEnvelope(
        version: 1,
        lastUpdatedAt: testDate,
        lastUpdatedBy: const UpdatedBy(id: 'user'),
        config: const AdminConfig(),
      );
      final envelope3 = AdminConfigEnvelope(
        version: 2,
        lastUpdatedAt: testDate,
        lastUpdatedBy: const UpdatedBy(id: 'user'),
        config: const AdminConfig(),
      );

      expect(envelope1, envelope2);
      expect(envelope1, isNot(envelope3));
    });

    test('hashCode is consistent with equality', () {
      final envelope1 = AdminConfigEnvelope(
        version: 1,
        lastUpdatedAt: testDate,
        lastUpdatedBy: const UpdatedBy(id: 'user'),
        config: const AdminConfig(),
      );
      final envelope2 = AdminConfigEnvelope(
        version: 1,
        lastUpdatedAt: testDate,
        lastUpdatedBy: const UpdatedBy(id: 'user'),
        config: const AdminConfig(),
      );

      expect(envelope1.hashCode, envelope2.hashCode);
    });

    test('toString contains relevant information', () {
      final envelope = AdminConfigEnvelope(
        version: 5,
        lastUpdatedAt: testDate,
        lastUpdatedBy: const UpdatedBy(id: 'admin'),
        config: const AdminConfig(),
      );

      final str = envelope.toString();

      expect(str, contains('AdminConfigEnvelope'));
      expect(str, contains('5'));
      expect(str, contains('admin'));
    });

    test('copyWith creates modified instance', () {
      final envelope = AdminConfigEnvelope(
        version: 1,
        lastUpdatedAt: testDate,
        lastUpdatedBy: const UpdatedBy(id: 'user'),
        config: const AdminConfig(),
      );

      final modified = envelope.copyWith(
        version: 10,
        lastUpdatedBy: const UpdatedBy(id: 'newuser'),
      );

      expect(modified.version, 10);
      expect(modified.lastUpdatedBy.id, 'newuser');
      expect(modified.lastUpdatedAt, testDate);
      expect(modified.config, envelope.config);
    });
  });

  group('AdminAuditEntry', () {
    test('fromJson creates correct instance', () {
      final json = {
        'id': 'audit123',
        'timestamp': '2024-01-15T10:30:00Z',
        'actor': 'admin@example.com',
        'action': 'UPDATE_CONFIG',
        'resource': 'moderation',
        'before': {'temperature': 0.2},
        'after': {'temperature': 0.5},
      };

      final entry = AdminAuditEntry.fromJson(json);

      expect(entry.id, 'audit123');
      expect(entry.timestamp, DateTime.utc(2024, 1, 15, 10, 30));
      expect(entry.actor, 'admin@example.com');
      expect(entry.action, 'UPDATE_CONFIG');
      expect(entry.resource, 'moderation');
      expect(entry.before, {'temperature': 0.2});
      expect(entry.after, {'temperature': 0.5});
    });

    test('fromJson handles missing fields with defaults', () {
      final entry = AdminAuditEntry.fromJson({});

      expect(entry.id, '');
      expect(entry.timestamp, isA<DateTime>());
      expect(entry.actor, 'unknown');
      expect(entry.action, 'unknown');
      expect(entry.resource, 'unknown');
      expect(entry.before, isNull);
      expect(entry.after, isNull);
    });

    test('fromJson handles invalid timestamp', () {
      final json = {
        'id': 'audit456',
        'timestamp': 'invalid-date',
        'actor': 'user',
        'action': 'test',
        'resource': 'test',
      };

      final entry = AdminAuditEntry.fromJson(json);

      expect(entry.timestamp, isA<DateTime>());
    });

    test('toJson serializes all fields', () {
      final before = {'value': 1};
      final after = {'value': 2};
      final timestamp = DateTime.utc(2024, 1, 15, 10, 30);

      final entry = AdminAuditEntry(
        id: 'audit789',
        timestamp: timestamp,
        actor: 'admin',
        action: 'DELETE',
        resource: 'config',
        before: before,
        after: after,
      );

      final json = entry.toJson();

      expect(json['id'], 'audit789');
      expect(json['timestamp'], '2024-01-15T10:30:00.000Z');
      expect(json['actor'], 'admin');
      expect(json['action'], 'DELETE');
      expect(json['resource'], 'config');
      expect(json['before'], before);
      expect(json['after'], after);
    });

    test('toJson omits null before/after', () {
      final timestamp = DateTime.utc(2024, 1, 15);

      final entry = AdminAuditEntry(
        id: 'audit',
        timestamp: timestamp,
        actor: 'user',
        action: 'test',
        resource: 'test',
      );

      final json = entry.toJson();

      expect(json.containsKey('before'), isFalse);
      expect(json.containsKey('after'), isFalse);
    });
  });

  group('AdminAuditResponse', () {
    test('fromJson creates correct instance', () {
      final json = {
        'entries': [
          {
            'id': 'audit1',
            'timestamp': '2024-01-15T10:00:00Z',
            'actor': 'user1',
            'action': 'CREATE',
            'resource': 'config',
          },
          {
            'id': 'audit2',
            'timestamp': '2024-01-15T11:00:00Z',
            'actor': 'user2',
            'action': 'UPDATE',
            'resource': 'flags',
          },
        ],
        'limit': 100,
      };

      final response = AdminAuditResponse.fromJson(json);

      expect(response.entries.length, 2);
      expect(response.entries[0].id, 'audit1');
      expect(response.entries[1].id, 'audit2');
      expect(response.limit, 100);
    });

    test('fromJson handles empty entries list', () {
      final json = {'entries': [], 'limit': 50};

      final response = AdminAuditResponse.fromJson(json);

      expect(response.entries, isEmpty);
      expect(response.limit, 50);
    });

    test('fromJson handles missing fields with defaults', () {
      final response = AdminAuditResponse.fromJson({});

      expect(response.entries, isEmpty);
      expect(response.limit, 50);
    });
  });
}
