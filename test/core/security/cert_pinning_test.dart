// Tests for certificate pinning functionality
import 'package:flutter_test/flutter_test.dart';
import 'package:asora/core/security/cert_pinning.dart';

void main() {
  group('Certificate Pinning', () {
    test('should have correct pinned domains configured', () {
      expect(kPinnedDomains, isNotEmpty);

      // Check that our Azure Function domain is pinned
      expect(
        kPinnedDomains.keys,
        contains(
          'asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net',
        ),
      );

      // Check that pins are in correct format
      for (final pins in kPinnedDomains.values) {
        for (final pin in pins) {
          expect(pin, startsWith('sha256/'));
          expect(
            pin.length,
            greaterThan(10),
          ); // Base64 should be longer than 10 chars
        }
      }
    });

    test('should create Dio instance with pinning when enabled', () {
      // Test when pinning is enabled (default)
      final dio = createPinnedDio();
      expect(dio, isNotNull);
      // BaseURL could be null or empty string depending on Dio version
      expect(dio.options.baseUrl, anyOf(isNull, equals('')));

      // Test with base URL
      final dioWithUrl = createPinnedDio(baseUrl: 'https://example.com');
      expect(dioWithUrl.options.baseUrl, 'https://example.com');
    });

    test('should provide certificate pinning info', () {
      final info = getCertPinningInfo();

      expect(info.enabled, equals(kEnableCertPinning));
      expect(info.pins, equals(kPinnedDomains));
      expect(info.buildMode, isIn(['debug', 'release']));
    });

    test('should serialize pinning info to JSON', () {
      final info = getCertPinningInfo();
      final json = info.toJson();

      expect(json, isMap);
      expect(json['enabled'], isA<bool>());
      expect(json['pins'], isA<Map>());
      expect(json['buildMode'], isA<String>());
      expect(json['pinnedDomains'], isA<List>());
    });
  });

  group('PinnedCertHttpClientAdapter', () {
    test('should implement HttpClientAdapter interface', () {
      // This is more of a compile-time check
      // The adapter should extend/implement HttpClientAdapter correctly
      expect(() => createPinnedDio(), returnsNormally);
    });
  });
}
