// ignore_for_file: public_member_api_docs

/// Legacy B2C configuration service — fetch, cache, and fallback.
///
/// Resolution order:
///   1. Remote: GET [endpoint] with [timeout].
///   2. Local cache: last known-good response stored in secure storage.
///   3. Bundled: compile-time env-var values from [AuthConfig.fromEnvironment].
///
/// Call [load] once during auth initialisation.  Subsequent calls re-fetch and
/// refresh the cache; the old cache is preserved on fetch failure.
library;

import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:asora/services/oauth2_service.dart' show AuthConfig;

/// Manages fetching, caching, and falling back for the legacy Azure AD B2C / CIAM
/// client configuration served by `/api/auth/b2c-config`.
class B2CConfigService {
  B2CConfigService({
    required Dio dio,
    required FlutterSecureStorage storage,
    required String endpoint,
    Duration timeout = const Duration(seconds: 8),
  }) : _dio = dio,
       _storage = storage,
       _endpoint = endpoint,
       _timeout = timeout;

  final Dio _dio;
  final FlutterSecureStorage _storage;
  final String _endpoint;
  final Duration _timeout;

  // Bump this key when the cached JSON shape changes incompatibly so stale
  // entries are ignored automatically.
  static const _cacheKey = 'b2c_config_v1';

  /// Returns a valid [AuthConfig] via fetch → cache → bundled fallback.
  Future<AuthConfig> load() async {
    // --- 1. Remote fetch ---
    try {
      final config = await _fetchRemote();
      await _writeCache(config);
      return config;
    } catch (fetchError) {
      debugPrint('B2CConfigService: remote fetch failed ($fetchError)');
    }

    // --- 2. Local cache ---
    final cached = await _readCache();
    if (cached != null) {
      debugPrint('B2CConfigService: using cached config');
      return cached;
    }

    // --- 3. Bundled fallback ---
    debugPrint('B2CConfigService: using bundled fallback config');
    return AuthConfig.fromEnvironment();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  Future<AuthConfig> _fetchRemote() async {
    final response = await _dio.get<Map<String, dynamic>>(
      _endpoint,
      options: Options(sendTimeout: _timeout, receiveTimeout: _timeout),
    );

    final data = response.data;
    if (response.statusCode != 200 || data == null) {
      throw StateError(
        'Unexpected status ${response.statusCode} from $_endpoint',
      );
    }

    // AuthConfig.fromJson throws a TypeError / CastError on malformed input,
    // which propagates to the caller so the cache / fallback path is taken.
    return AuthConfig.fromJson(data);
  }

  Future<void> _writeCache(AuthConfig config) async {
    try {
      await _storage.write(key: _cacheKey, value: jsonEncode(config.toJson()));
    } catch (e) {
      debugPrint('B2CConfigService: failed to write cache ($e)');
    }
  }

  Future<AuthConfig?> _readCache() async {
    try {
      final raw = await _storage.read(key: _cacheKey);
      if (raw == null) return null;
      return AuthConfig.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (e) {
      debugPrint('B2CConfigService: failed to read cache ($e)');
      return null;
    }
  }
}
