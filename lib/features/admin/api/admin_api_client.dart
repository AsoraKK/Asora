// ignore_for_file: public_member_api_docs

/// ASORA ADMIN API CLIENT
///
/// 🎯 Purpose: HTTP client for admin configuration endpoints
/// 📡 Endpoints: GET/PUT /api/admin/config, GET /api/admin/audit
/// 🔐 Authentication: Cloudflare Access JWT (browser session)
/// 📱 Platform: Flutter with Dio HTTP client
library;

import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';

import 'package:asora/features/admin/domain/admin_config_models.dart';

/// Budget configuration returned by the backend
class BudgetInfo {
  const BudgetInfo({
    required this.amount,
    required this.azureBudgetName,
    required this.resourceGroup,
    required this.notificationEmail,
    required this.thresholds,
    required this.updatedAt,
    required this.updatedBy,
  });

  final double amount;
  final String azureBudgetName;
  final String resourceGroup;
  final String notificationEmail;
  final Map<String, List<int>> thresholds;
  final DateTime updatedAt;
  final String updatedBy;

  factory BudgetInfo.fromJson(Map<String, dynamic> json) {
    final thresholds = json['thresholds'] as Map<String, dynamic>? ?? {};
    return BudgetInfo(
      amount: (json['amount'] as num?)?.toDouble() ?? 200,
      azureBudgetName: json['azureBudgetName'] as String? ?? '',
      resourceGroup: json['resourceGroup'] as String? ?? '',
      notificationEmail: json['notificationEmail'] as String? ?? '',
      thresholds: {
        'actual':
            (thresholds['actual'] as List?)
                ?.map((e) => (e as num).toInt())
                .toList() ??
            [],
        'forecasted':
            (thresholds['forecasted'] as List?)
                ?.map((e) => (e as num).toInt())
                .toList() ??
            [],
      },
      updatedAt:
          DateTime.tryParse(json['updatedAt'] as String? ?? '') ??
          DateTime.now(),
      updatedBy: json['updatedBy'] as String? ?? 'unknown',
    );
  }
}

/// Result of a budget update operation
class BudgetUpdateResult {
  const BudgetUpdateResult({required this.budget, required this.azureSynced});

  final BudgetInfo budget;
  final bool azureSynced;
}

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
          // New field names aligned with backend
          case 'hiveAutoFlagThreshold':
          case 'toxicityThreshold': // Legacy support
            moderation = moderation.copyWith(
              hiveAutoFlagThreshold: (value as num).toDouble(),
            );
            break;
          case 'hiveAutoRemoveThreshold':
          case 'autoRejectThreshold': // Legacy support
            moderation = moderation.copyWith(
              hiveAutoRemoveThreshold: (value as num).toDouble(),
            );
            break;
          case 'enableAutoModeration':
          case 'enableHiveAi': // Legacy support
            moderation = moderation.copyWith(
              enableAutoModeration: value as bool,
            );
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Budget management
  // ─────────────────────────────────────────────────────────────────────────────

  /// Get current budget configuration
  ///
  /// Returns the budget info (amount, thresholds, metadata).
  /// Throws [AdminApiException] on failure.
  Future<BudgetInfo> getBudget() async {
    final requestId = _generateRequestId();

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        _buildUrl('/api/_admin/budget'),
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

      final budgetJson = response.data!['budget'] as Map<String, dynamic>?;
      if (budgetJson == null) {
        throw const AdminApiException(
          message: 'Missing budget in response',
          code: 'INVALID_RESPONSE',
        );
      }

      return BudgetInfo.fromJson(budgetJson);
    } on DioException catch (e) {
      throw _parseError(e);
    }
  }

  /// Update budget amount
  ///
  /// Returns the updated budget info and whether Azure was synced.
  /// Throws [AdminApiException] on failure.
  Future<BudgetUpdateResult> updateBudget(double amount) async {
    final requestId = _generateRequestId();

    try {
      final response = await _dio.put<Map<String, dynamic>>(
        _buildUrl('/api/_admin/budget'),
        data: {'amount': amount},
        options: Options(
          headers: {
            'X-Correlation-ID': requestId,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.data == null) {
        throw const AdminApiException(
          message: 'Empty response from server',
          code: 'EMPTY_RESPONSE',
        );
      }

      final budgetJson = response.data!['budget'] as Map<String, dynamic>?;
      if (budgetJson == null) {
        throw const AdminApiException(
          message: 'Missing budget in response',
          code: 'INVALID_RESPONSE',
        );
      }

      return BudgetUpdateResult(
        budget: BudgetInfo.fromJson(budgetJson),
        azureSynced: response.data!['azureSynced'] as bool? ?? false,
      );
    } on DioException catch (e) {
      throw _parseError(e);
    }
  }
}
