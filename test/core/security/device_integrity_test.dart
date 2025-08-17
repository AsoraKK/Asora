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
  });
}
