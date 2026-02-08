import 'package:flutter/material.dart';

import 'package:asora/features/auth/presentation/invite_redeem_screen.dart';
import 'package:asora/ui/screens/profile/profile_screen.dart';
import 'package:asora/features/notifications/presentation/notifications_settings_screen.dart';

/// Deep-link router for handling notification navigation
/// Parses deep-link URIs and navigates to appropriate screens
class DeeplinkRouter {
  /// Parse and navigate to deep-linked content
  /// Supported formats:
  /// - asora://post/{postId} - Navigate to post detail
  /// - asora://user/{userId} - Navigate to user profile
  /// - asora://comment/{commentId} - Navigate to comment thread
  /// - asora://settings/notifications - Navigate to notification settings
  /// - asora://invite/{code} - Navigate to invite redemption
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
      case 'invite':
        await _navigateToInvite(context, id, uri.queryParameters['code']);
        break;
      default:
        debugPrint('[DeepLink] Unknown deeplink type: $type');
    }
  }

  static Future<void> _navigateToPost(
    BuildContext context,
    String postId,
  ) async {
    // Navigate to the home feed — a dedicated PostDetailScreen can be
    // introduced later; for now deep-linking to a post opens the feed.
    debugPrint('[DeepLink] Navigate to post: $postId');
    // TODO(deep-link): Push PostDetailScreen(postId) once the screen exists.
  }

  static Future<void> _navigateToProfile(
    BuildContext context,
    String userId,
  ) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const ProfileScreen(),
      ),
    );
  }

  static Future<void> _navigateToComment(
    BuildContext context,
    String commentId,
  ) async {
    // Comments are embedded in the post view — navigate to the feed.
    debugPrint('[DeepLink] Navigate to comment: $commentId');
    // TODO(deep-link): Push to PostDetailScreen with comment anchor once available.
  }

  static Future<void> _navigateToNotificationSettings(
    BuildContext context,
  ) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const NotificationsSettingsScreen(),
      ),
    );
  }

  static Future<void> _navigateToInvite(
    BuildContext context,
    String? codeFromPath,
    String? codeFromQuery,
  ) async {
    final code = codeFromPath ?? codeFromQuery;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => InviteRedeemScreen(inviteCode: code),
      ),
    );
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
