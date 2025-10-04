// ASORA PRIVACY SERVICE
//
// 🎯 Purpose: GDPR/POPIA compliance client-side operations
// 🔐 Security: Authenticated API calls with proper error handling
// 📊 Telemetry: Privacy action tracking and rate limit awareness
// 📱 Platform: Flutter with Dio HTTP client integration

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/dio_client.dart';
import '../core/network/api_endpoints.dart';
import '../core/logging/app_logger.dart';
import '../features/auth/application/auth_providers.dart';

/// Privacy operation results
enum PrivacyOperationResult {
  success,
  rateLimited,
  networkError,
  unauthorized,
  serverError,
  cancelled,
}

/// Privacy service for GDPR/POPIA compliance
class PrivacyService {
  final Dio _dio;
  final AppLogger _logger;
  final Future<String?> Function() _tokenResolver;
  final String? _functionKey;

  PrivacyService(
    this._dio,
    this._logger, {
    required Future<String?> Function() tokenResolver,
    String? functionKey,
  }) : _tokenResolver = tokenResolver,
       _functionKey = (functionKey != null && functionKey.isNotEmpty)
           ? functionKey
           : null;

  /// Export user data (GDPR Article 20 - Data Portability)
  ///
  /// Returns raw JSON data that can be saved to file
  /// Subject to rate limiting (1 export per 24 hours)
  Future<
    ({
      PrivacyOperationResult result,
      Map<String, dynamic>? data,
      String? errorMessage,
    })
  >
  exportUserData() async {
    try {
      _logger.info('Requesting user data export');

      final token = await _tokenResolver();
      if (token == null || token.isEmpty) {
        _logger.warning('Export blocked: missing auth token');
        return (
          result: PrivacyOperationResult.unauthorized,
          data: null,
          errorMessage: 'Please sign in to export your data.',
        );
      }

      final response = await _dio.get(
        ApiEndpoints.exportUser,
        options: Options(headers: _buildHeaders(token)),
      );

      if (response.statusCode == 200) {
        _logger.info('User data export successful');
        return (
          result: PrivacyOperationResult.success,
          data: response.data as Map<String, dynamic>?,
          errorMessage: null,
        );
      } else {
        _logger.warning('Export failed with status: ${response.statusCode}');
        return (
          result: PrivacyOperationResult.serverError,
          data: null,
          errorMessage: 'Export failed: ${response.statusCode}',
        );
      }
    } on DioException catch (e) {
      return _handleDioException(e, 'export');
    } catch (e) {
      _logger.error('Unexpected error during export: $e');
      return (
        result: PrivacyOperationResult.serverError,
        data: null,
        errorMessage: 'Unexpected error occurred',
      );
    }
  }

  /// Delete user account (GDPR Article 17 - Right to be Forgotten)
  ///
  /// Requires confirmation header to prevent accidental deletion
  /// This is irreversible and will scrub PII and mark content as deleted
  Future<({PrivacyOperationResult result, String? errorMessage})>
  deleteAccount() async {
    try {
      _logger.info('Requesting account deletion');

      final token = await _tokenResolver();
      if (token == null || token.isEmpty) {
        _logger.warning('Deletion blocked: missing auth token');
        return (
          result: PrivacyOperationResult.unauthorized,
          errorMessage: 'Please sign in to delete your account.',
        );
      }

      final response = await _dio.post(
        ApiEndpoints.deleteUser,
        options: Options(
          headers: {..._buildHeaders(token), 'X-Confirm-Delete': 'true'},
        ),
      );

      if (response.statusCode == 200 || response.statusCode == 202) {
        _logger.info('Account deletion successful');
        return (result: PrivacyOperationResult.success, errorMessage: null);
      } else {
        _logger.warning('Delete failed with status: ${response.statusCode}');
        return (
          result: PrivacyOperationResult.serverError,
          errorMessage: 'Deletion failed: ${response.statusCode}',
        );
      }
    } on DioException catch (e) {
      final result = _handleDioException(e, 'delete');
      return (result: result.result, errorMessage: result.errorMessage);
    } catch (e) {
      _logger.error('Unexpected error during deletion: $e');
      return (
        result: PrivacyOperationResult.serverError,
        errorMessage: 'Unexpected error occurred',
      );
    }
  }

  /// Delete account and automatically sign out the user
  ///
  /// This combines account deletion with authentication cleanup
  Future<({PrivacyOperationResult result, String? errorMessage})>
  deleteAccountAndSignOut(WidgetRef ref) async {
    final result = await deleteAccount();

    if (result.result == PrivacyOperationResult.success) {
      try {
        // Clear authentication state
        await ref.read(authStateProvider.notifier).signOut();
        _logger.info('User signed out after account deletion');
      } catch (e) {
        _logger.warning('Failed to clear auth state after deletion: $e');
        // Account was deleted successfully, but couldn't clear local state
        // This is not a critical failure
      }
    }

    return result;
  }

  /// Helper to handle DioException consistently
  ({
    PrivacyOperationResult result,
    Map<String, dynamic>? data,
    String? errorMessage,
  })
  _handleDioException(DioException e, String operation) {
    _logger.error('Network error during $operation: ${e.type} - ${e.message}');

    switch (e.response?.statusCode) {
      case 401:
        return (
          result: PrivacyOperationResult.unauthorized,
          data: null,
          errorMessage: 'Please sign in to access privacy features',
        );

      case 429:
        final message =
            _extractErrorMessage(e.response) ?? 'Rate limit exceeded';
        return (
          result: PrivacyOperationResult.rateLimited,
          data: null,
          errorMessage: message,
        );

      case null:
        // Network connectivity issues
        switch (e.type) {
          case DioExceptionType.connectionTimeout:
          case DioExceptionType.sendTimeout:
          case DioExceptionType.receiveTimeout:
          case DioExceptionType.connectionError:
            return (
              result: PrivacyOperationResult.networkError,
              data: null,
              errorMessage:
                  _extractErrorMessage(e.response) ??
                  'Network connection failed. Please check your internet connection.',
            );

          case DioExceptionType.cancel:
            return (
              result: PrivacyOperationResult.cancelled,
              data: null,
              errorMessage: 'Operation was cancelled',
            );

          default:
            return (
              result: PrivacyOperationResult.serverError,
              data: null,
              errorMessage: 'Server error occurred',
            );
        }

      default:
        return (
          result: PrivacyOperationResult.serverError,
          data: null,
          errorMessage:
              _extractErrorMessage(e.response) ??
              'Server error: ${e.response?.statusCode}',
        );
    }
  }

  Map<String, String> _buildHeaders(String token) {
    return {
      'Authorization': 'Bearer $token',
      if (_functionKey != null) 'x-functions-key': _functionKey,
    };
  }

  String? _extractErrorMessage(Response<dynamic>? response) {
    final data = response?.data;
    if (data is Map<String, dynamic>) {
      return data['message'] as String? ??
          data['error'] as String? ??
          data['detail'] as String?;
    }
    if (data is String && data.isNotEmpty) {
      return data;
    }
    return response?.statusMessage;
  }
}

/// Privacy service provider
final privacyServiceProvider = Provider<PrivacyService>((ref) {
  final dio = ref.watch(secureDioProvider);
  final logger = ref.watch(appLoggerProvider);
  final authService = ref.watch(enhancedAuthServiceProvider);
  const functionKey = String.fromEnvironment('AZURE_FUNCTION_KEY');
  return PrivacyService(
    dio,
    logger,
    tokenResolver: authService.getJwtToken,
    functionKey: functionKey.isEmpty ? null : functionKey,
  );
});
