import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';
import 'package:asora/core/security/cert_pinning.dart';

void main() {
  group('Certificate Pinning Additional Coverage Tests', () {
    test('PinnedCertHttpClientAdapter close method works', () {
      final testDio = Dio();
      final baseAdapter = testDio.httpClientAdapter;
      final pinnedAdapter = PinnedCertHttpClientAdapter(baseAdapter);

      // Test close without force
      expect(() => pinnedAdapter.close(), returnsNormally);

      // Test close with force parameter
      expect(() => pinnedAdapter.close(force: true), returnsNormally);
      expect(() => pinnedAdapter.close(force: false), returnsNormally);
    });

    test('CertPinningInfo constructor and serialization', () {
      const testInfo = CertPinningInfo(
        enabled: true,
        pins: {
          'test.com': ['dGVzdHBpbg=='],
        },
        buildMode: 'test',
      );

      expect(testInfo.enabled, isTrue);
      expect(testInfo.pins, containsPair('test.com', ['dGVzdHBpbg==']));
      expect(testInfo.buildMode, equals('test'));

      // Test JSON serialization
      final json = testInfo.toJson();
      expect(json['enabled'], isTrue);
      expect(json['pins'], isA<Map<String, List<String>>>());
      expect(json['buildMode'], equals('test'));
      expect(json['pinnedDomains'], equals(['test.com']));
    });

    test('isPinValidationError handles all DioException types', () {
      final pinnedOptions = RequestOptions(
        path: 'https://asora-function-dev.azurewebsites.net/api',
      );
      final unpinnedOptions = RequestOptions(path: 'https://example.com/api');

      // Test all DioException types
      final errorTypes = [
        DioExceptionType.connectionError,
        DioExceptionType.unknown,
        DioExceptionType.sendTimeout,
        DioExceptionType.receiveTimeout,
        DioExceptionType.cancel,
        DioExceptionType.badCertificate,
        DioExceptionType.badResponse,
      ];

      for (final errorType in errorTypes) {
        final pinnedError = DioException(
          requestOptions: pinnedOptions,
          type: errorType,
        );
        final unpinnedError = DioException(
          requestOptions: unpinnedOptions,
          type: errorType,
        );

        // Only connection, unknown, and badCertificate errors should return true for pinned domains
        if (errorType == DioExceptionType.connectionError ||
            errorType == DioExceptionType.unknown ||
            errorType == DioExceptionType.badCertificate) {
          expect(isPinValidationError(pinnedError), isTrue);
        } else {
          expect(isPinValidationError(pinnedError), isFalse);
        }

        // Unpinned domains should never return true
        expect(isPinValidationError(unpinnedError), isFalse);
      }
    });

    test('getCertPinningInfo returns complete configuration', () {
      final info = getCertPinningInfo();

      expect(info.enabled, equals(kEnableCertPinning));
      expect(info.pins, equals(kPinnedDomains));
      expect(info.buildMode, isIn(['debug', 'release']));

      // Test that toJson produces expected structure
      final json = info.toJson();
      expect(
        json.keys,
        containsAll(['enabled', 'pins', 'buildMode', 'pinnedDomains']),
      );

      final pinnedDomains = json['pinnedDomains'] as List<String>;
      expect(pinnedDomains.toSet(), equals(kPinnedDomains.keys.toSet()));
    });

    test('createPinnedDio handles various baseUrl configurations', () {
      // Test with null baseUrl
      final dioNull = createPinnedDio(baseUrl: null);
      expect(dioNull, isNotNull);
      expect(dioNull.options.baseUrl, isEmpty);

      // Test with empty string baseUrl
      final dioEmpty = createPinnedDio(baseUrl: '');
      expect(dioEmpty, isNotNull);
      expect(dioEmpty.options.baseUrl, isEmpty);

      // Test with valid baseUrl
      const testUrl = 'https://api.test.com/v1';
      final dioWithUrl = createPinnedDio(baseUrl: testUrl);
      expect(dioWithUrl.options.baseUrl, equals(testUrl));

      // Verify adapter configuration when pinning is enabled
      if (kEnableCertPinning) {
        expect(
          dioWithUrl.httpClientAdapter,
          isA<PinnedCertHttpClientAdapter>(),
        );
        expect(dioWithUrl.interceptors.isNotEmpty, isTrue);
      }
    });

    test('kPinnedDomains validation and structure', () {
      expect(kPinnedDomains, isNotEmpty);

      for (final entry in kPinnedDomains.entries) {
        final domain = entry.key;
        final pins = entry.value;

        // Domain validation
        expect(domain, isNotEmpty);
        expect(domain, isNot(contains('://')));
        expect(domain, isNot(contains(' ')));
        expect(RegExp(r'^[a-zA-Z0-9.-]+$').hasMatch(domain), isTrue);

        // Pins validation
        expect(pins, isNotEmpty);
        for (final pin in pins) {
          expect(pin, isNotEmpty);
        }
      }
    });

    test('PinnedCertHttpClientAdapter wraps base adapter correctly', () {
      final baseDio = Dio();
      final baseAdapter = baseDio.httpClientAdapter;
      final pinnedAdapter = PinnedCertHttpClientAdapter(baseAdapter);

      expect(pinnedAdapter, isNotNull);
      expect(pinnedAdapter, isA<HttpClientAdapter>());
      expect(pinnedAdapter, isA<PinnedCertHttpClientAdapter>());
    });

    test('Configuration constants are valid', () {
      expect(kEnableCertPinning, isA<bool>());
      expect(kPinnedDomains, isA<Map<String, List<String>>>());

      // Verify domains contain expected Azure patterns
      final azureDomains = kPinnedDomains.keys.where(
        (d) => d.contains('azurewebsites.net'),
      );
      expect(azureDomains, isNotEmpty);
    });

    test('CertPinningInfo edge cases', () {
      // Test with empty configuration
      const emptyInfo = CertPinningInfo(
        enabled: false,
        pins: {},
        buildMode: 'test',
      );

      expect(emptyInfo.enabled, isFalse);
      expect(emptyInfo.pins.isEmpty, isTrue);

      final emptyJson = emptyInfo.toJson();
      expect(emptyJson['enabled'], isFalse);
      expect(emptyJson['pins'], isEmpty);
      expect((emptyJson['pinnedDomains'] as List).isEmpty, isTrue);

      // Test with multiple domains
      const multiInfo = CertPinningInfo(
        enabled: true,
        pins: {
          'domain1.com': ['cGluMQ=='],
          'domain2.com': ['cGluMmE=', 'cGluMmI='],
        },
        buildMode: 'debug',
      );

      final multiJson = multiInfo.toJson();
      expect((multiJson['pinnedDomains'] as List).length, equals(2));
      expect(
        (multiJson['pinnedDomains'] as List),
        containsAll(['domain1.com', 'domain2.com']),
      );
    });
  });
}
