import 'package:flutter/material.dart';

/// Deep-link router for handling notification navigation
/// Parses deep-link URIs and navigates to appropriate screens
class DeeplinkRouter {
  /// Parse and navigate to deep-linked content
  /// Supported formats:
  /// - asora://post/{postId} - Navigate to post detail
  /// - asora://user/{userId} - Navigate to user profile
  /// - asora://comment/{commentId} - Navigate to comment thread
  /// - asora://settings/notifications - Navigate to notification settings
  static Future<void> navigate(BuildContext context, String deeplink) async {
    final uri = Uri.parse(deeplink);

    // Extract path segments
    final segments = uri.pathSegments;
    if (segments.isEmpty) {
      debugPrint('[DeepLink] Invalid deeplink: $deeplink');
      return;
    }

    final type = segments[0];
    final id = segments.length > 1 ? segments[1] : null;

    switch (type) {
      case 'post':
        if (id != null) {
          await _navigateToPost(context, id);
        }
        break;
      case 'user':
        if (id != null) {
          await _navigateToProfile(context, id);
        }
        break;
      case 'comment':
        if (id != null) {
          await _navigateToComment(context, id);
        }
        break;
      case 'settings':
        if (id == 'notifications') {
          await _navigateToNotificationSettings(context);
        }
        break;
      default:
        debugPrint('[DeepLink] Unknown deeplink type: $type');
    }
  }

  static Future<void> _navigateToPost(
    BuildContext context,
    String postId,
  ) async {
    // TODO: Implement post detail navigation
    // Navigator.pushNamed(context, '/post/$postId');
    debugPrint('[DeepLink] Navigate to post: $postId');
  }

  static Future<void> _navigateToProfile(
    BuildContext context,
    String userId,
  ) async {
    // TODO: Implement profile navigation
    // Navigator.pushNamed(context, '/profile/$userId');
    debugPrint('[DeepLink] Navigate to profile: $userId');
  }

  static Future<void> _navigateToComment(
    BuildContext context,
    String commentId,
  ) async {
    // TODO: Implement comment thread navigation
    // Navigator.pushNamed(context, '/comment/$commentId');
    debugPrint('[DeepLink] Navigate to comment: $commentId');
  }

  static Future<void> _navigateToNotificationSettings(
    BuildContext context,
  ) async {
    // TODO: Implement settings navigation
    // Navigator.pushNamed(context, '/settings/notifications');
    debugPrint('[DeepLink] Navigate to notification settings');
  }

  /// Handle notification tap from system tray or in-app
  static Future<void> handleNotificationTap(
    BuildContext context,
    Map<String, dynamic> data,
  ) async {
    final deeplink = data['deeplink'] as String?;
    if (deeplink != null) {
      await navigate(context, deeplink);
    }
  }
}
