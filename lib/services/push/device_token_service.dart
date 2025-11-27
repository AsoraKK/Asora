import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../features/notifications/domain/notification_models.dart';
import 'push_notification_service.dart';

/// Service for registering and managing device tokens with backend
class DeviceTokenService {
  final Dio _dio;
  final PushNotificationService _pushService;

  DeviceTokenService({
    required Dio dioClient,
    required PushNotificationService pushService,
  }) : _dio = dioClient,
       _pushService = pushService;

  /// Register current device token with backend
  /// Should be called on app launch and whenever token refreshes
  ///
  /// Returns a map with:
  /// - `success`: true if registered
  /// - `evictedDevice`: UserDeviceToken if another device was removed (3-device cap)
  Future<Map<String, dynamic>> registerDeviceToken({String? label}) async {
    final token = _pushService.currentToken;
    if (token == null) {
      throw Exception('No FCM/APNS token available');
    }

    final platform = _pushService.platform;

    // Generate device label if not provided
    final deviceLabel = label ?? _generateDeviceLabel();

    try {
      final response = await _dio.post(
        '/api/devices/register',
        data: {'pushToken': token, 'platform': platform, 'label': deviceLabel},
      );

      debugPrint('[DeviceToken] Device token registered successfully');

      if (response.data['evictedDevice'] != null) {
        final evicted = UserDeviceToken.fromJson(
          response.data['evictedDevice'] as Map<String, dynamic>,
        );
        debugPrint(
          '[DeviceToken] Another device was removed due to 3-device cap: ${evicted.label}',
        );
      }

      return response.data as Map<String, dynamic>;
    } catch (e) {
      debugPrint('[DeviceToken] Failed to register device token: $e');
      rethrow;
    }
  }

  /// Get list of registered devices for current user
  Future<List<UserDeviceToken>> getRegisteredDevices() async {
    try {
      final response = await _dio.get('/api/devices');
      final devices = (response.data as List)
          .map((json) => UserDeviceToken.fromJson(json as Map<String, dynamic>))
          .toList();
      return devices;
    } catch (e) {
      debugPrint('[DeviceToken] Failed to fetch registered devices: $e');
      rethrow;
    }
  }

  /// Revoke a device token (user manually removes device)
  Future<void> revokeDevice(String deviceId) async {
    try {
      await _dio.post('/api/devices/$deviceId/revoke');
      debugPrint('[DeviceToken] Device revoked successfully');
    } catch (e) {
      debugPrint('[DeviceToken] Failed to revoke device: $e');
      rethrow;
    }
  }

  String _generateDeviceLabel() {
    // TODO: Get actual device info using device_info_plus package
    // For now, use platform + timestamp
    final platform = _pushService.platform == 'apns' ? 'iPhone' : 'Android';
    return '$platform Device';
  }
}
