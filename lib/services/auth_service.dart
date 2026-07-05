// ignore_for_file: public_member_api_docs

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:asora/core/config/environment_config.dart';
import 'package:asora/core/config/web_release_guard.dart';

class AuthService {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  static const String _configuredAuthUrl = String.fromEnvironment(
    'AUTH_URL',
    defaultValue: '',
  );

  static String get _baseUrl => _resolveAuthUrl();

  AuthService({Dio? dio, FlutterSecureStorage? storage})
    : _dio = dio ?? Dio(),
      _storage = storage ?? const FlutterSecureStorage() {
    _resolveAuthUrl();

    // Configure Dio with default options
    _dio.options.baseUrl = _baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 5);
    _dio.options.receiveTimeout = const Duration(seconds: 3);
    _dio.options.headers['Content-Type'] = 'application/json';
  }

  static String _resolveAuthUrl() {
    final configured = _configuredAuthUrl.trim();
    if (configured.isNotEmpty) {
      if (isReleaseWebBuild) {
        return requirePublicHttpsOrigin('AUTH_URL', configured).toString();
      }
      return configured;
    }

    if (isReleaseWebBuild) {
      throw StateError('AUTH_URL is required for release web builds.');
    }

    if (kDebugMode) {
      return kIsWeb
          ? 'http://localhost:7072/api'
          : 'https://asora-function-dev.azurewebsites.net/api';
    }

    return EnvironmentConfig.fromEnvironment().apiBaseUrl;
  }

  /// Login with email - calls your authEmail Azure Function
  Future<bool> loginWithEmail(String email) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/authEmail',
        data: {'email': email},
      );

      if (response.statusCode == 200) {
        final token = response.data?['token'] as String?;
        if (token != null) {
          // Store JWT token securely
          await _storage.write(key: 'jwt_token', value: token);
          // SECURITY: Use privacy-safe logging - avoid logging email directly
          debugPrint('✅ Login successful for user');
          return true;
        }
      }

      debugPrint('❌ Login failed: No token received');
      return false;
    } on DioException catch (dioError) {
      debugPrint('❌ Login failed (Dio): ${dioError.message}');
      if (dioError.response != null) {
        debugPrint('Response data: ${dioError.response?.data}');
        debugPrint('Status code: ${dioError.response?.statusCode}');
      }
      return false;
    } catch (e) {
      debugPrint('❌ Login failed (General): $e');
      return false;
    }
  }

  /// Get stored JWT token
  Future<String?> getToken() async {
    try {
      return await _storage.read(key: 'jwt_token');
    } catch (e) {
      debugPrint('Error reading token: $e');
      return null;
    }
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  /// Logout - clear stored token
  Future<void> logout() async {
    try {
      await _storage.delete(key: 'jwt_token');
      debugPrint('✅ Logged out successfully');
    } catch (e) {
      debugPrint('Error during logout: $e');
    }
  }

  /// Get user info from /me endpoint
  Future<Map<String, dynamic>?> getCurrentUser() async {
    final token = await getToken();
    if (token == null) return null;

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/getMe',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        debugPrint('✅ User profile fetched successfully');
        return response.data;
      }
    } on DioException catch (dioError) {
      debugPrint('❌ Failed to get user profile (Dio): ${dioError.message}');
      if (dioError.response != null) {
        debugPrint('Response data: ${dioError.response?.data}');
        debugPrint('Status code: ${dioError.response?.statusCode}');
      }
    } catch (e) {
      debugPrint('❌ Failed to get user profile (General): $e');
    }

    return null;
  }
}
