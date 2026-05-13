// ignore_for_file: public_member_api_docs

import 'package:asora/core/config/b2c_config_service.dart';
import 'package:asora/services/oauth2_service.dart' show AuthConfig;
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _MockStorage extends Mock implements FlutterSecureStorage {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const _endpoint = 'https://example.com/api/auth/b2c-config';
const _cacheKey = 'b2c_config_v1';

/// A JSON payload that satisfies [AuthConfig.fromJson] without errors.
final _validConfigJson = <String, dynamic>{
  'tenant': 'remote.onmicrosoft.com',
  'clientId': 'remote-client-id',
  'policy': 'B2C_1_signupsignin',
  'authorityHost': 'remote.ciamlogin.com',
  'scopes': ['openid', 'offline_access'],
  'redirectUris': {'android': 'com.test://callback', 'ios': 'msaltest://auth'},
  'knownAuthorities': ['remote.ciamlogin.com'],
  'googleIdpHint': 'Google',
};

/// Cached JSON string matching the structure above but representing a
/// previously saved successful fetch (tenant = 'cached.onmicrosoft.com').
final _cachedConfigJson =
    '{"tenant":"cached.onmicrosoft.com","clientId":"cached-client-id",'
    '"policy":"B2C_1_signupsignin","authorityHost":"cached.ciamlogin.com",'
    '"scopes":["openid"],"redirectUris":{"android":"com.cached://callback"},'
    '"knownAuthorities":["cached.ciamlogin.com"]}';

B2CConfigService _makeService(_MockDio dio, _MockStorage storage) {
  return B2CConfigService(
    dio: dio,
    storage: storage,
    endpoint: _endpoint,
    timeout: const Duration(seconds: 5),
  );
}

void main() {
  late _MockDio mockDio;
  late _MockStorage mockStorage;

  setUp(() {
    mockDio = _MockDio();
    mockStorage = _MockStorage();

    // Default: storage reads return null (no cached entry).
    when(() => mockStorage.read(key: _cacheKey)).thenAnswer((_) async => null);

    // Default: storage writes are no-ops.
    when(
      () => mockStorage.write(
        key: _cacheKey,
        value: any(named: 'value'),
      ),
    ).thenAnswer((_) async {});
  });

  group('B2CConfigService', () {
    // -------------------------------------------------------------------------
    // Test 1: successful remote fetch returns and caches config.
    // -------------------------------------------------------------------------
    test('fetch success: returns remote config and writes cache', () async {
      when(
        () => mockDio.get<Map<String, dynamic>>(
          _endpoint,
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => Response(
          data: _validConfigJson,
          statusCode: 200,
          requestOptions: RequestOptions(path: _endpoint),
        ),
      );

      final service = _makeService(mockDio, mockStorage);
      final config = await service.load();

      expect(config.tenant, 'remote.onmicrosoft.com');
      expect(config.clientId, 'remote-client-id');

      // Cache should have been written exactly once.
      verify(
        () => mockStorage.write(
          key: _cacheKey,
          value: any(named: 'value'),
        ),
      ).called(1);

      // Storage read should NOT have been attempted (success path skips it).
      verifyNever(() => mockStorage.read(key: _cacheKey));
    });

    // -------------------------------------------------------------------------
    // Test 2: fetch failure with a warm cache → returns cached config.
    // -------------------------------------------------------------------------
    test('fetch failure with cache: returns cached config', () async {
      when(
        () => mockDio.get<Map<String, dynamic>>(
          _endpoint,
          options: any(named: 'options'),
        ),
      ).thenThrow(
        DioException(
          requestOptions: RequestOptions(path: _endpoint),
          type: DioExceptionType.connectionTimeout,
        ),
      );

      when(
        () => mockStorage.read(key: _cacheKey),
      ).thenAnswer((_) async => _cachedConfigJson);

      final service = _makeService(mockDio, mockStorage);
      final config = await service.load();

      expect(config.tenant, 'cached.onmicrosoft.com');
      expect(config.clientId, 'cached-client-id');

      // Cache must not be overwritten on failure.
      verifyNever(
        () => mockStorage.write(
          key: _cacheKey,
          value: any(named: 'value'),
        ),
      );
    });

    // -------------------------------------------------------------------------
    // Test 3: fetch failure and empty cache → returns bundled fallback.
    // -------------------------------------------------------------------------
    test('fetch failure without cache: returns bundled fallback', () async {
      when(
        () => mockDio.get<Map<String, dynamic>>(
          _endpoint,
          options: any(named: 'options'),
        ),
      ).thenThrow(
        DioException(
          requestOptions: RequestOptions(path: _endpoint),
          type: DioExceptionType.receiveTimeout,
        ),
      );

      // storage.read already returns null from setUp.

      final service = _makeService(mockDio, mockStorage);
      final config = await service.load();

      // Bundled fallback should produce the compile-time defaults.
      final bundled = AuthConfig.fromEnvironment();
      expect(config.tenant, bundled.tenant);
      expect(config.clientId, bundled.clientId);
      expect(config.authorityHost, bundled.authorityHost);

      verifyNever(
        () => mockStorage.write(
          key: _cacheKey,
          value: any(named: 'value'),
        ),
      );
    });

    // -------------------------------------------------------------------------
    // Test 4: malformed remote response → falls back to cache (not bundled).
    // -------------------------------------------------------------------------
    test('malformed config: falls back to cache when available', () async {
      // Server returns 200 but payload is missing required fields.
      when(
        () => mockDio.get<Map<String, dynamic>>(
          _endpoint,
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => Response(
          data: <String, dynamic>{'bad': 'data'},
          statusCode: 200,
          requestOptions: RequestOptions(path: _endpoint),
        ),
      );

      when(
        () => mockStorage.read(key: _cacheKey),
      ).thenAnswer((_) async => _cachedConfigJson);

      final service = _makeService(mockDio, mockStorage);
      final config = await service.load();

      // Malformed parse throws → service falls back to the cache.
      expect(config.tenant, 'cached.onmicrosoft.com');

      verifyNever(
        () => mockStorage.write(
          key: _cacheKey,
          value: any(named: 'value'),
        ),
      );
    });
  });
}
