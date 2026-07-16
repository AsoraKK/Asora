// ignore_for_file: public_member_api_docs

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:asora/core/config/environment_config.dart';
import 'package:asora/core/config/web_release_guard.dart';

/// Compatibility authentication client for legacy callers.
///
/// New feature code uses `features/auth/application/auth_service.dart`. This
/// adapter intentionally follows the same canonical Lythaus email contract.
class AuthService {
  AuthService({Dio? dio, FlutterSecureStorage? storage})
    : _dio = dio ?? Dio(),
      _storage = storage ?? const FlutterSecureStorage() {
    _dio.options.baseUrl = _resolveAuthUrl();
    _dio.options.connectTimeout = const Duration(seconds: 5);
    _dio.options.receiveTimeout = const Duration(seconds: 3);
    _dio.options.headers['Content-Type'] = 'application/json';
  }

  final Dio _dio;
  final FlutterSecureStorage _storage;

  static const String _configuredAuthUrl = String.fromEnvironment(
    'AUTH_URL',
    defaultValue: '',
  );

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
      return kIsWeb ? 'http://localhost:7072/api' : 'http://10.0.2.2:7072/api';
    }

    return EnvironmentConfig.fromEnvironment().apiBaseUrl;
  }

  Future<bool> loginWithEmail(String email, String password) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/email/login',
        data: {'email': email.trim(), 'password': password},
      );

      final accessToken = response.data?['access_token'] as String?;
      final refreshToken = response.data?['refresh_token'] as String?;
      if (response.statusCode != 200 ||
          accessToken == null ||
          refreshToken == null) {
        debugPrint('Email sign-in failed');
        return false;
      }

      await Future.wait([
        _storage.write(key: 'jwt_token', value: accessToken),
        _storage.write(key: 'refresh_token', value: refreshToken),
      ]);
      debugPrint('Email sign-in succeeded');
      return true;
    } on DioException catch (error) {
      debugPrint('Email sign-in request failed: ${error.type.name}');
      return false;
    } catch (_) {
      debugPrint('Email sign-in failed');
      return false;
    }
  }

  Future<String?> getToken() async {
    try {
      return await _storage.read(key: 'jwt_token');
    } catch (_) {
      debugPrint('Unable to read the stored access token');
      return null;
    }
  }

  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> logout() async {
    try {
      await Future.wait([
        _storage.delete(key: 'jwt_token'),
        _storage.delete(key: 'refresh_token'),
      ]);
      debugPrint('Logged out successfully');
    } catch (_) {
      debugPrint('Unable to clear the stored session');
    }
  }

  Future<Map<String, dynamic>?> getCurrentUser() async {
    final token = await getToken();
    if (token == null) return null;

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/auth/userinfo',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        return response.data;
      }
    } on DioException catch (error) {
      debugPrint('UserInfo request failed: ${error.type.name}');
    } catch (_) {
      debugPrint('UserInfo request failed');
    }

    return null;
  }
}
