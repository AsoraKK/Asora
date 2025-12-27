/// ASORA ADMIN API CLIENT
///
/// 🎯 Purpose: HTTP client for admin configuration endpoints
/// 📡 Endpoints: GET/PUT /api/admin/config, GET /api/admin/audit
/// 🔐 Authentication: Cloudflare Access JWT (browser session)
/// 📱 Platform: Flutter with Dio HTTP client
library;

import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';

import '../domain/admin_config_models.dart';

/// Exception thrown by AdminApiClient operations
class AdminApiException implements Exception {
  const AdminApiException({
    required this.message,
    required this.code,
    this.statusCode,
    this.correlationId,
  });

  final String message;
  final String code;
  final int? statusCode;
  final String? correlationId;

  /// Whether this is a version conflict (optimistic locking failure)
  bool get isVersionConflict => code == 'VERSION_CONFLICT' || statusCode == 409;

  /// Whether this is an authentication error
  bool get isAuthError => statusCode == 401 || statusCode == 403;

  /// Whether this is a rate limit error
  bool get isRateLimited => statusCode == 429;

  /// Whether this is a server error
  bool get isServerError => statusCode != null && statusCode! >= 500;

  @override
  String toString() =>
      'AdminApiException: $message (code: $code, status: $statusCode, correlationId: $correlationId)';
}

/// Admin API client for configuration management
class AdminApiClient {
  AdminApiClient(this._dio, {String? baseUrl}) : _baseUrl = baseUrl ?? '';

  final Dio _dio;
  final String _baseUrl;
  final _uuid = const Uuid();

  /// Generate a unique request ID for tracing
  String _generateRequestId() => _uuid.v4();

  /// Build the full URL for an admin endpoint
  String _buildUrl(String path) {
    if (_baseUrl.isNotEmpty) {
      return '$_baseUrl$path';
    }
    return path;
  }

  /// Extract error details from API response
  AdminApiException _parseError(DioException e) {
    final response = e.response;
    final statusCode = response?.statusCode;
    String message = 'Request failed';
    String code = 'UNKNOWN_ERROR';
    String? correlationId;

    if (response?.data is Map<String, dynamic>) {
      final data = response!.data as Map<String, dynamic>;
      final error = data['error'] as Map<String, dynamic>?;
      if (error != null) {
        message = error['message'] as String? ?? message;
        code = error['code'] as String? ?? code;
        correlationId = error['correlationId'] as String?;
      }
    } else if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      message = 'Request timed out';
      code = 'TIMEOUT';
    } else if (e.type == DioExceptionType.connectionError) {
      message = 'Connection failed';
      code = 'CONNECTION_ERROR';
    }

    return AdminApiException(
      message: message,
      code: code,
      statusCode: statusCode,
      correlationId: correlationId,
    );
  }

  /// Get current admin configuration
  ///
  /// Returns the full configuration envelope with version and metadata.
  /// Throws [AdminApiException] on failure.
  Future<AdminConfigEnvelope> getConfig() async {
    final requestId = _generateRequestId();

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        _buildUrl('/api/admin/config'),
        options: Options(
          headers: {
            'X-Correlation-ID': requestId,
            'Accept': 'application/json',
          },
        ),
      );

      if (response.data == null) {
        throw const AdminApiException(
          message: 'Empty response from server',
          code: 'EMPTY_RESPONSE',
        );
      }

      return AdminConfigEnvelope.fromJson(response.data!);
    } on DioException catch (e) {
      throw _parseError(e);
    }
  }

  /// Update admin configuration
  ///
  /// Sends the full new configuration with expectedVersion for optimistic locking.
  /// Returns the updated envelope (or fetches it if server only returns ok).
  /// Throws [AdminApiException] on failure (including 409 for version conflict).
  Future<AdminConfigEnvelope> updateConfig({
    required int expectedVersion,
    required AdminConfig config,
  }) async {
    final requestId = _generateRequestId();

    try {
      final response = await _dio.put<Map<String, dynamic>>(
        _buildUrl('/api/admin/config'),
        data: {
          'schemaVersion': config.schemaVersion,
          'expectedVersion': expectedVersion,
          'payload': {
            'moderation': config.moderation.toJson(),
            'featureFlags': config.featureFlags.toJson(),
          },
        },
        options: Options(
          headers: {
            'X-Correlation-ID': requestId,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        ),
      );

      final data = response.data;

      // If server returns full envelope, use it
      if (data != null &&
          data.containsKey('payload') &&
          data.containsKey('version')) {
        return AdminConfigEnvelope.fromJson(data);
      }

      // Server returns only { ok, version, updatedAt } - do a follow-up GET
      return getConfig();
    } on DioException catch (e) {
      throw _parseError(e);
    }
  }

  /// Update configuration with a patch (only changed fields)
  ///
  /// This is a convenience method that builds the full config from
  /// the current config plus the patch, then calls updateConfig.
  Future<AdminConfigEnvelope> updateConfigPatch({
    required int expectedVersion,
    required AdminConfig currentConfig,
    required Map<String, dynamic> patch,
  }) async {
    // Apply patch to current config
    final updatedConfig = _applyPatch(currentConfig, patch);
    return updateConfig(
      expectedVersion: expectedVersion,
      config: updatedConfig,
    );
  }

  /// Apply a dot-path patch to the config
  AdminConfig _applyPatch(AdminConfig config, Map<String, dynamic> patch) {
    var moderation = config.moderation;
    var featureFlags = config.featureFlags;

    for (final entry in patch.entries) {
      final path = entry.key;
      final value = entry.value;

      if (path.startsWith('moderation.')) {
        final field = path.substring('moderation.'.length);
        switch (field) {
          case 'temperature':
            moderation = moderation.copyWith(
              temperature: (value as num).toDouble(),
            );
            break;
          case 'toxicityThreshold':
            moderation = moderation.copyWith(
              toxicityThreshold: (value as num).toDouble(),
            );
            break;
          case 'autoRejectThreshold':
            moderation = moderation.copyWith(
              autoRejectThreshold: (value as num).toDouble(),
            );
            break;
          case 'enableHiveAi':
            moderation = moderation.copyWith(enableHiveAi: value as bool);
            break;
          case 'enableAzureContentSafety':
            moderation = moderation.copyWith(
              enableAzureContentSafety: value as bool,
            );
            break;
        }
      } else if (path.startsWith('featureFlags.')) {
        final field = path.substring('featureFlags.'.length);
        switch (field) {
          case 'appealsEnabled':
            featureFlags = featureFlags.copyWith(appealsEnabled: value as bool);
            break;
          case 'communityVotingEnabled':
            featureFlags = featureFlags.copyWith(
              communityVotingEnabled: value as bool,
            );
            break;
          case 'pushNotificationsEnabled':
            featureFlags = featureFlags.copyWith(
              pushNotificationsEnabled: value as bool,
            );
            break;
          case 'maintenanceMode':
            featureFlags = featureFlags.copyWith(
              maintenanceMode: value as bool,
            );
            break;
        }
      }
    }

    return config.copyWith(moderation: moderation, featureFlags: featureFlags);
  }

  /// Get audit log entries
  ///
  /// Returns recent audit log entries for configuration changes.
  /// Throws [AdminApiException] on failure.
  Future<AdminAuditResponse> getAuditLog({int limit = 50}) async {
    final requestId = _generateRequestId();

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        _buildUrl('/api/admin/audit'),
        queryParameters: {'limit': limit},
        options: Options(
          headers: {
            'X-Correlation-ID': requestId,
            'Accept': 'application/json',
          },
        ),
      );

      if (response.data == null) {
        throw const AdminApiException(
          message: 'Empty response from server',
          code: 'EMPTY_RESPONSE',
        );
      }

      return AdminAuditResponse.fromJson(response.data!);
    } on DioException catch (e) {
      throw _parseError(e);
    }
  }
}
