/// Notification API Service
///
/// HTTP client for notification-related REST endpoints.
/// Handles GET/POST to /api/notifications, /api/notification-preferences, /api/devices
library;

import 'package:dio/dio.dart';
import '../domain/notification_models.dart';

/// Response from GET /api/notifications
class NotificationsListResponse {
  final List<Notification> notifications;
  final String? continuationToken;
  final int totalUnread;

  const NotificationsListResponse({
    required this.notifications,
    this.continuationToken,
    required this.totalUnread,
  });

  factory NotificationsListResponse.fromJson(Map<String, dynamic> json) {
    return NotificationsListResponse(
      notifications: (json['notifications'] as List)
          .map((item) => Notification.fromJson(item as Map<String, dynamic>))
          .toList(),
      continuationToken: json['continuationToken'] as String?,
      totalUnread: (json['totalUnread'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Service for notification-related HTTP requests
class NotificationApiService {
  final Dio _dio;

  NotificationApiService({required Dio dioClient}) : _dio = dioClient;

  // ========================================================================
  // NOTIFICATIONS API
  // ========================================================================

  /// GET /api/notifications
  /// Fetch paginated notifications list
  Future<NotificationsListResponse> getNotifications({
    int limit = 20,
    String? continuationToken,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'limit': limit,
        if (continuationToken != null) 'continuationToken': continuationToken,
      };

      final response = await _dio.get(
        '/api/notifications',
        queryParameters: queryParams,
      );

      return NotificationsListResponse.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw _handleError(e, 'Failed to fetch notifications');
    }
  }

  /// GET /api/notifications/unread-count
  /// Get unread badge count
  Future<int> getUnreadCount() async {
    try {
      final response = await _dio.get('/api/notifications/unread-count');
      return (response.data['count'] as num?)?.toInt() ?? 0;
    } on DioException catch (e) {
      throw _handleError(e, 'Failed to fetch unread count');
    }
  }

  /// POST /api/notifications/:id/read
  /// Mark a single notification as read
  Future<void> markAsRead(String notificationId) async {
    try {
      await _dio.post('/api/notifications/$notificationId/read');
    } on DioException catch (e) {
      throw _handleError(e, 'Failed to mark notification as read');
    }
  }

  /// POST /api/notifications/:id/dismiss
  /// Dismiss a notification (remove from list)
  Future<void> dismissNotification(String notificationId) async {
    try {
      await _dio.post('/api/notifications/$notificationId/dismiss');
    } on DioException catch (e) {
      throw _handleError(e, 'Failed to dismiss notification');
    }
  }

  // ========================================================================
  // PREFERENCES API
  // ========================================================================

  /// GET /api/notification-preferences
  /// Fetch user notification preferences
  Future<UserNotificationPreferences> getPreferences() async {
    try {
      final response = await _dio.get('/api/notification-preferences');
      return UserNotificationPreferences.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw _handleError(e, 'Failed to fetch notification preferences');
    }
  }

  /// PUT /api/notification-preferences
  /// Update user notification preferences
  Future<UserNotificationPreferences> updatePreferences(
    UserNotificationPreferences preferences,
  ) async {
    try {
      final response = await _dio.put(
        '/api/notification-preferences',
        data: preferences.toJson(),
      );
      return UserNotificationPreferences.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw _handleError(e, 'Failed to update notification preferences');
    }
  }

  // ========================================================================
  // DEVICES API
  // ========================================================================

  /// POST /api/devices/register
  /// Register a push token (enforces 3-device cap)
  /// Returns {"success": true, "evictedDevice": {...}?} if another device was removed
  Future<Map<String, dynamic>> registerDevice({
    required String pushToken,
    required String platform,
    required String label,
  }) async {
    try {
      final response = await _dio.post(
        '/api/devices/register',
        data: {'pushToken': pushToken, 'platform': platform, 'label': label},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw _handleError(e, 'Failed to register device');
    }
  }

  /// GET /api/devices
  /// Fetch list of registered devices
  Future<List<UserDeviceToken>> getDevices({bool activeOnly = true}) async {
    try {
      final response = await _dio.get(
        '/api/devices',
        queryParameters: {'activeOnly': activeOnly},
      );
      return (response.data as List)
          .map((item) => UserDeviceToken.fromJson(item as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e, 'Failed to fetch devices');
    }
  }

  /// POST /api/devices/:id/revoke
  /// Revoke (soft-delete) a device token
  Future<void> revokeDevice(String deviceId) async {
    try {
      await _dio.post('/api/devices/$deviceId/revoke');
    } on DioException catch (e) {
      throw _handleError(e, 'Failed to revoke device');
    }
  }

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  Exception _handleError(DioException error, String defaultMessage) {
    if (error.response != null) {
      final data = error.response!.data;
      if (data is Map && data.containsKey('error')) {
        return Exception(data['error'] as String);
      }
      return Exception('$defaultMessage (HTTP ${error.response!.statusCode})');
    }
    return Exception('$defaultMessage: ${error.message}');
  }
}
