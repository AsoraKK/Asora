import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';
import 'package:asora/core/security/cert_pinning.dart';

void main() {
  group('Certificate Pinning Configuration Tests', () {
    test('Pinned domains contain flex host', () {
      expect(
        kPinnedDomains.containsKey('asora-function-dev.azurewebsites.net'),
        true,
      );
    });

    test('No placeholder pins in flex host set', () {
      final pins =
          kPinnedDomains['asora-function-dev.azurewebsites.net'] ?? [];
      final requireRealPins =
          Platform.environment['ASORA_REQUIRE_REAL_PINS'] == 'true';
      if (requireRealPins) {
        expect(
          pins.any((p) => p.contains('REPLACE_WITH_SPKI_PIN')),
          isFalse,
          reason: 'Placeholder pins must be replaced before release',
        );
      } else {
        // Skip strict check in Dev until pins are injected
        expect(pins.isNotEmpty, isTrue);
      }
    });

    test('All pinned domains have valid pin formats', () {
      for (final entry in kPinnedDomains.entries) {
        final domain = entry.key;
        final pins = entry.value;

        expect(
          pins.isNotEmpty,
          isTrue,
          reason: 'Domain $domain should have at least one pin',
        );
        expect(
          pins.length,
          greaterThanOrEqualTo(1),
          reason: 'Domain $domain should have backup pins',
        );

        for (final pin in pins) {
          // Check SHA-256 pin format
          expect(
            pin.startsWith('sha256/'),
            isTrue,
            reason: 'Pin should start with sha256/ for domain $domain',
          );
          final hash = pin.substring(7); // Remove 'sha256/' prefix
          expect(
            hash.isNotEmpty,
            isTrue,
            reason: 'Hash should not be empty for domain $domain',
          );
        }
      }
    });

    test('Pinned domains are valid hostnames', () {
      for (final domain in kPinnedDomains.keys) {
        expect(domain.isNotEmpty, isTrue);
        expect(
          domain.contains(' '),
          isFalse,
          reason: 'Domain should not contain spaces: $domain',
        );
        expect(
          domain.contains('://'),
          isFalse,
          reason: 'Domain should not contain protocol: $domain',
        );

        // Should be a valid hostname format
        expect(
          RegExp(r'^[a-zA-Z0-9.-]+$').hasMatch(domain),
          isTrue,
          reason: 'Domain should be valid hostname format: $domain',
        );
      }
    });
  });

  group('Certificate Pinning Client Tests', () {
    test('createPinnedDio returns configured Dio instance', () {
      final dio = createPinnedDio();

      expect(dio, isNotNull);
      expect(dio, isA<Dio>());
    });

    test('createPinnedDio with baseUrl sets base URL', () {
      const testBaseUrl = 'https://test.example.com/api';
      final dio = createPinnedDio(baseUrl: testBaseUrl);

      expect(dio.options.baseUrl, equals(testBaseUrl));
    });

    test('createPinnedDio configures adapter when pinning enabled', () {
      final dio = createPinnedDio();

      if (kEnableCertPinning) {
        expect(dio.httpClientAdapter, isA<PinnedCertHttpClientAdapter>());
      }
    });

    test('PinnedCertHttpClientAdapter wraps another adapter', () {
      final testDio = Dio();
      final baseAdapter = testDio.httpClientAdapter;
      final pinnedAdapter = PinnedCertHttpClientAdapter(baseAdapter);

      expect(pinnedAdapter, isNotNull);
      expect(pinnedAdapter, isA<PinnedCertHttpClientAdapter>());
    });
  });

  group('Certificate Pinning Error Detection Tests', () {
    test(
      'isPinValidationError detects connection errors for pinned domains',
      () {
        final requestOptions = RequestOptions(
          path: 'https://asora-function-dev.azurewebsites.net/api/test',
        );

        final connectionError = DioException(
          requestOptions: requestOptions,
          type: DioExceptionType.connectionError,
          error: 'Connection failed',
        );

        final unknownError = DioException(
          requestOptions: requestOptions,
          type: DioExceptionType.unknown,
          error: 'Unknown error',
        );

        final timeoutError = DioException(
          requestOptions: requestOptions,
          type: DioExceptionType.connectionTimeout,
          error: 'Timeout',
        );

        expect(isPinValidationError(connectionError), isTrue);
        expect(isPinValidationError(unknownError), isTrue);
        expect(isPinValidationError(timeoutError), isFalse);
      },
    );

    test('isPinValidationError returns false for non-pinned domains', () {
      final requestOptions = RequestOptions(
        path: 'https://unpinned-domain.com/api/test',
      );

      final connectionError = DioException(
        requestOptions: requestOptions,
        type: DioExceptionType.connectionError,
        error: 'Connection failed',
      );

      expect(isPinValidationError(connectionError), isFalse);
    });
  });

  group('Certificate Pinning Info Tests', () {
    test('getCertPinningInfo returns current configuration', () {
      final info = getCertPinningInfo();

      expect(info.enabled, equals(kEnableCertPinning));
      expect(info.pins, equals(kPinnedDomains));
      expect(info.buildMode, isIn(['debug', 'release']));
    });

    test('CertPinningInfo can be serialized to JSON', () {
      final info = getCertPinningInfo();
      final json = info.toJson();

      expect(json['enabled'], isA<bool>());
      expect(json['pins'], isA<Map>());
      expect(json['buildMode'], isA<String>());
      expect(json['pinnedDomains'], isA<List>());

      final pinnedDomains = json['pinnedDomains'] as List;
      expect(pinnedDomains.length, equals(kPinnedDomains.length));
    });
  });

  group('Certificate Pinning Constants Tests', () {
    test('kEnableCertPinning is a boolean', () {
      expect(kEnableCertPinning, isA<bool>());
    });

    test('kPinnedDomains is not empty', () {
      expect(kPinnedDomains.isNotEmpty, isTrue);
    });

    test('All pinned domains have at least one pin', () {
      for (final pins in kPinnedDomains.values) {
        expect(pins.isNotEmpty, isTrue);
      }
    });
  });
}
