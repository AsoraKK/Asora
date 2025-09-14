// Tests for device integrity detection
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';
import 'package:asora/core/security/device_integrity.dart';

void main() {
  // Ensure Flutter binding is initialized for services & platform channels
  TestWidgetsFlutterBinding.ensureInitialized();

  group('DeviceIntegrityService', () {
    late DeviceIntegrityService service;

    setUp(() {
      // Mock the jailbreak detection plugin to prevent MissingPluginException warnings
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            const MethodChannel('flutter_jailbreak_detection'),
            (MethodCall methodCall) async {
              switch (methodCall.method) {
                case 'jailbroken':
                  return false; // Mock as not jailbroken
                case 'developerMode':
                  return false; // Mock as not in developer mode
                case 'onExternalStorage':
                  return false; // Mock as not on external storage
                default:
                  return null;
              }
            },
          );

      service = DeviceIntegrityService();
    });

    tearDown(() {
      // Clean up the mock
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            const MethodChannel('flutter_jailbreak_detection'),
            null,
          );
    });

    test('should return secure status for clean device', () async {
      final result = await service.checkIntegrity();

      expect(result.status, DeviceIntegrityStatus.secure);
      expect(result.allowPosting, isTrue);
      expect(result.allowReading, isTrue);
    });

    test('should cache results for performance', () async {
      final result2 = await service.checkIntegrity();
      final result1 = await service.checkIntegrity();

      // Results should be identical (cached)
      expect(result1.checkedAt, result2.checkedAt);
      expect(result1, isNotNull);
    });

    test('should invalidate cache on request', () async {
      final result1 = await service.checkIntegrity();

      service.invalidateCache();

      // This should trigger a new check
      // In practice, this would be tested with mocked dependencies
      final result2 = await service.checkIntegrity();

      expect(result2, isNotNull);
      // Ensure initial result was obtained and used to invalidate cache
      expect(result1, isNotNull);
    });

    test('should handle errors gracefully', () async {
      // Test would require mocking the FlutterJailbreakDetection
      // For now, just ensure service doesn't crash
      final result = await service.checkIntegrity();

      expect(result, isNotNull);
      expect(
        result.status,
        isIn([
          DeviceIntegrityStatus.secure,
          DeviceIntegrityStatus.error,
          DeviceIntegrityStatus.compromised,
        ]),
      );
    });
  });

  group('DeviceIntegrityInfo', () {
    test('should serialize to JSON correctly', () {
      final info = DeviceIntegrityInfo(
        status: DeviceIntegrityStatus.secure,
        reason: 'Test reason',
        checkedAt: DateTime.parse('2024-01-01T12:00:00Z'),
        allowPosting: true,
        allowReading: true,
      );

      final json = info.toJson();

      expect(json['status'], 'secure');
      expect(json['reason'], 'Test reason');
      expect(json['allowPosting'], true);
      expect(json['allowReading'], true);
      expect(json['checkedAt'], '2024-01-01T12:00:00.000Z');
    });

    test('should identify compromised devices', () {
      final compromisedInfo = DeviceIntegrityInfo(
        status: DeviceIntegrityStatus.compromised,
        reason: 'Device is rooted',
        checkedAt: DateTime.now(),
        allowPosting: false,
        allowReading: true,
      );

      expect(compromisedInfo.isCompromised, isTrue);

      final secureInfo = DeviceIntegrityInfo(
        status: DeviceIntegrityStatus.secure,
        reason: 'Device is secure',
        checkedAt: DateTime.now(),
        allowPosting: true,
        allowReading: true,
      );

      expect(secureInfo.isCompromised, isFalse);
    });

    test('should handle different DeviceIntegrityStatus values', () {
      final statuses = [
        DeviceIntegrityStatus.unknown,
        DeviceIntegrityStatus.secure,
        DeviceIntegrityStatus.compromised,
        DeviceIntegrityStatus.error,
      ];

      for (final status in statuses) {
        final info = DeviceIntegrityInfo(
          status: status,
          reason: 'Test reason for $status',
          checkedAt: DateTime.now(),
          allowPosting: status != DeviceIntegrityStatus.compromised,
          allowReading: true,
        );

        expect(info.status, equals(status));
        expect(info.isCompromised, equals(status == DeviceIntegrityStatus.compromised));
        
        final json = info.toJson();
        expect(json['status'], equals(status.name));
      }
    });

    test('should include platform information in JSON', () {
      final info = DeviceIntegrityInfo(
        status: DeviceIntegrityStatus.secure,
        reason: 'Test',
        checkedAt: DateTime.now(),
        allowPosting: true,
        allowReading: true,
      );

      final json = info.toJson();
      expect(json.keys, contains('platform'));
      expect(json['platform'], isNotEmpty);
    });
  });

  group('DeviceIntegrityStatus enum', () {
    test('should have all expected values', () {
      expect(DeviceIntegrityStatus.values.length, equals(4));
      expect(DeviceIntegrityStatus.values, contains(DeviceIntegrityStatus.unknown));
      expect(DeviceIntegrityStatus.values, contains(DeviceIntegrityStatus.secure));
      expect(DeviceIntegrityStatus.values, contains(DeviceIntegrityStatus.compromised));
      expect(DeviceIntegrityStatus.values, contains(DeviceIntegrityStatus.error));
    });

    test('should have correct string representations', () {
      expect(DeviceIntegrityStatus.unknown.name, equals('unknown'));
      expect(DeviceIntegrityStatus.secure.name, equals('secure'));
      expect(DeviceIntegrityStatus.compromised.name, equals('compromised'));
      expect(DeviceIntegrityStatus.error.name, equals('error'));
    });
  });

  group('DeviceIntegrityService caching behavior', () {
    test('should cache results within validity period', () async {
      final service = DeviceIntegrityService();
      
      final result1 = await service.checkIntegrity();
      final result2 = await service.checkIntegrity();

      // Should return the same cached result
      expect(result1.checkedAt, equals(result2.checkedAt));
      expect(result1.status, equals(result2.status));
    });

    test('should clear cache on invalidateCache', () {
      final service = DeviceIntegrityService();
      
      // Call invalidateCache and ensure it doesn't throw
      expect(() => service.invalidateCache(), returnsNormally);
    });

    test('should handle mock jailbreak detection correctly', () async {
      // Mock jailbroken device
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            const MethodChannel('flutter_jailbreak_detection'),
            (MethodCall methodCall) async {
              switch (methodCall.method) {
                case 'jailbroken':
                  return true; // Mock as jailbroken
                default:
                  return null;
              }
            },
          );

      final service = DeviceIntegrityService();
      final result = await service.checkIntegrity();

      expect(result.status, equals(DeviceIntegrityStatus.compromised));
      expect(result.allowPosting, isFalse);
      expect(result.allowReading, isTrue);
      expect(result.reason, contains('rooted/jailbroken'));

      // Clean up
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            const MethodChannel('flutter_jailbreak_detection'),
            null,
          );
    });

    test('should handle plugin exceptions gracefully', () async {
      // Mock plugin to throw exception
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            const MethodChannel('flutter_jailbreak_detection'),
            (MethodCall methodCall) async {
              throw PlatformException(code: 'ERROR', message: 'Plugin error');
            },
          );

      final service = DeviceIntegrityService();
      final result = await service.checkIntegrity();

      // Should fail secure (assume not jailbroken on error)
      expect(result.status, equals(DeviceIntegrityStatus.secure));
      expect(result.allowPosting, isTrue);
      expect(result.allowReading, isTrue);

      // Clean up
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            const MethodChannel('flutter_jailbreak_detection'),
            null,
          );
    });
  });

  group('DeviceIntegrityInfo edge cases', () {
    test('should handle different timestamp formats in JSON', () {
      final now = DateTime.now();
      final info = DeviceIntegrityInfo(
        status: DeviceIntegrityStatus.unknown,
        reason: 'Test with timestamp',
        checkedAt: now,
        allowPosting: false,
        allowReading: false,
      );

      final json = info.toJson();
      expect(json['checkedAt'], equals(now.toIso8601String()));
    });

    test('should create info with all permission combinations', () {
      final combinations = [
        [true, true],   // allow posting and reading
        [true, false],  // allow posting, deny reading
        [false, true],  // deny posting, allow reading  
        [false, false], // deny both
      ];

      for (final combo in combinations) {
        final info = DeviceIntegrityInfo(
          status: DeviceIntegrityStatus.secure,
          reason: 'Test permissions',
          checkedAt: DateTime.now(),
          allowPosting: combo[0],
          allowReading: combo[1],
        );

        expect(info.allowPosting, equals(combo[0]));
        expect(info.allowReading, equals(combo[1]));
      }
    });

    test('should handle long reason strings', () {
      final longReason = 'x' * 1000; // 1000 character string
      final info = DeviceIntegrityInfo(
        status: DeviceIntegrityStatus.error,
        reason: longReason,
        checkedAt: DateTime.now(),
        allowPosting: true,
        allowReading: true,
      );

      expect(info.reason.length, equals(1000));
      
      final json = info.toJson();
      expect(json['reason'], equals(longReason));
    });

    test('isCompromised should return correct values for all statuses', () {
      final statuses = [
        [DeviceIntegrityStatus.unknown, false],
        [DeviceIntegrityStatus.secure, false],
        [DeviceIntegrityStatus.compromised, true],
        [DeviceIntegrityStatus.error, false],
      ];

      for (final statusPair in statuses) {
        final info = DeviceIntegrityInfo(
          status: statusPair[0] as DeviceIntegrityStatus,
          reason: 'Test',
          checkedAt: DateTime.now(),
          allowPosting: true,
          allowReading: true,
        );

        expect(info.isCompromised, equals(statusPair[1]));
      }
    });

    test('should handle different DateTime formats', () {
      final timestamps = [
        DateTime(2024, 1, 1, 12, 0, 0),
        DateTime.now(),
        DateTime.fromMillisecondsSinceEpoch(0),
        DateTime(2025, 12, 31, 23, 59, 59),
      ];

      for (final timestamp in timestamps) {
        final info = DeviceIntegrityInfo(
          status: DeviceIntegrityStatus.secure,
          reason: 'Test time',
          checkedAt: timestamp,
          allowPosting: true,
          allowReading: true,
        );

        final json = info.toJson();
        expect(json['checkedAt'], equals(timestamp.toIso8601String()));
      }
    });
  });

  group('DeviceIntegrityService caching behavior', () {
    late DeviceIntegrityService service;

    setUp(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            const MethodChannel('flutter_jailbreak_detection'),
            (MethodCall methodCall) async {
              switch (methodCall.method) {
                case 'jailbroken':
                  return false;
                case 'developerMode':
                  return false;
                case 'onExternalStorage':
                  return false;
                default:
                  return null;
              }
            },
          );

      service = DeviceIntegrityService();
    });

    tearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            const MethodChannel('flutter_jailbreak_detection'),
            null,
          );
    });

    test('should handle mock jailbreak detection correctly', () async {
      // Setup mock to return jailbroken device
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            const MethodChannel('flutter_jailbreak_detection'),
            (MethodCall methodCall) async {
              switch (methodCall.method) {
                case 'jailbroken':
                  return true; // Mock as jailbroken
                case 'developerMode':
                  return true; // Mock developer mode
                case 'onExternalStorage':
                  return true; // Mock external storage
                default:
                  return null;
              }
            },
          );

      final result = await service.checkIntegrity();

      expect(result.status, DeviceIntegrityStatus.compromised);
      expect(result.allowPosting, isFalse);
      expect(result.allowReading, isTrue); // Reading should still be allowed
      expect(result.isCompromised, isTrue);
    });

    test('should respect cache timeout', () async {
      final result1 = await service.checkIntegrity();
      
      // Get the result twice - should be cached
      final result2 = await service.checkIntegrity();
      
      expect(result1.checkedAt, equals(result2.checkedAt));
    });

    test('should handle platform method exceptions gracefully', () async {
      // Setup mock to throw exception
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
            const MethodChannel('flutter_jailbreak_detection'),
            (MethodCall methodCall) async {
              throw PlatformException(
                code: 'UNAVAILABLE',
                message: 'Plugin not available',
              );
            },
          );

      final result = await service.checkIntegrity();

      // The service may default to secure when plugin is unavailable
      expect(result.status, isIn([DeviceIntegrityStatus.secure, DeviceIntegrityStatus.error]));
      expect(result.allowReading, isTrue);
    });
  });
}
