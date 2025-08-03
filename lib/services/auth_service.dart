import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthService {
  final Dio _dio = Dio();
  final _storage = const FlutterSecureStorage();

  // Your Azure Functions local development URL (Android emulator compatible)
  // SECURITY: Environment-based URL configuration
  static const String _devUrl = 'http://10.0.2.2:7072/api'; // Local dev only
  static const String _prodUrl =
      'https://your-secure-function-app.azurewebsites.net/api'; // Production HTTPS

  static String get _baseUrl {
    // Use environment variable to determine if we're in development
    const bool isDevelopment = bool.fromEnvironment(
      'FLUTTER_DEV',
      defaultValue: false,
    );
    return isDevelopment ? _devUrl : _prodUrl;
  }

  AuthService() {
    // Configure Dio with default options
    _dio.options.baseUrl = _baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 5);
    _dio.options.receiveTimeout = const Duration(seconds: 3);
    _dio.options.headers['Content-Type'] = 'application/json';
  }

  /// Login with email - calls your authEmail Azure Function
  Future<bool> loginWithEmail(String email) async {
    try {
      final response = await _dio.post('/authEmail', data: {'email': email});

      if (response.statusCode == 200) {
        final token = response.data['token'];
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
      final response = await _dio.get(
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
