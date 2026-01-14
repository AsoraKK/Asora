// ignore_for_file: public_member_api_docs

/// ASORA NOTIFICATIONS - PERMISSION SERVICE
///
/// Manages notification permission requests and status checking
library;

import 'package:permission_handler/permission_handler.dart';
import 'package:asora/features/notifications/domain/notification_models.dart';

class NotificationPermissionService {
  /// Check current notification permission status
  Future<NotificationPermissionStatus> checkPermissionStatus() async {
    final status = await Permission.notification.status;

    return switch (status) {
      PermissionStatus.granted => NotificationPermissionStatus.authorized,
      PermissionStatus.denied => NotificationPermissionStatus.denied,
      PermissionStatus.restricted => NotificationPermissionStatus.restricted,
      PermissionStatus.limited => NotificationPermissionStatus.provisional,
      PermissionStatus.provisional => NotificationPermissionStatus.provisional,
      PermissionStatus.permanentlyDenied => NotificationPermissionStatus.denied,
    };
  }

  /// Request notification permission (triggers OS dialog)
  Future<NotificationPermissionStatus> requestPermission() async {
    final status = await Permission.notification.request();

    return switch (status) {
      PermissionStatus.granted => NotificationPermissionStatus.authorized,
      PermissionStatus.denied => NotificationPermissionStatus.denied,
      PermissionStatus.restricted => NotificationPermissionStatus.restricted,
      PermissionStatus.limited => NotificationPermissionStatus.provisional,
      PermissionStatus.provisional => NotificationPermissionStatus.provisional,
      PermissionStatus.permanentlyDenied => NotificationPermissionStatus.denied,
    };
  }

  /// Open app settings (for when permission is permanently denied)
  Future<bool> openAppSettings() async {
    return await openAppSettings();
  }

  /// Check if we should show the pre-prompt
  /// (Not asked yet, or denied but not permanently)
  Future<bool> shouldShowPrePrompt() async {
    final status = await checkPermissionStatus();
    return status == NotificationPermissionStatus.notDetermined ||
        status == NotificationPermissionStatus.denied;
  }
}
