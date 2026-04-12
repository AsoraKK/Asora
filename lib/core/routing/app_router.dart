// ignore_for_file: public_member_api_docs

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/presentation/auth_callback_screen.dart';
import 'package:asora/features/auth/presentation/auth_choice_screen.dart';
import 'package:asora/features/auth/presentation/invite_redeem_screen.dart';
import 'package:asora/features/feed/presentation/post_detail_screen.dart';
import 'package:asora/features/moderation/presentation/moderation_console/moderation_console_screen.dart';
import 'package:asora/features/moderation/presentation/screens/appeal_history_screen.dart';
import 'package:asora/features/notifications/presentation/notifications_settings_screen.dart';
import 'package:asora/ui/screens/adaptive_shell.dart';
import 'package:asora/ui/screens/profile/profile_screen.dart';

/// Route name constants.
abstract final class AppRoutes {
  static const String login = 'login';
  static const String authCallback = 'auth-callback';
  static const String shell = 'shell';
  static const String post = 'post';
  static const String profile = 'profile';
  static const String invite = 'invite';
  static const String moderation = 'moderation';
  static const String moderationAppeal = 'moderation-appeal';
  static const String notificationSettings = 'notification-settings';
}

/// Provides the application [GoRouter] that is refreshed when auth state
/// changes. Stage A: top-level routes wrapping existing screen widgets.
final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);
  final isGuest = ref.watch(guestModeProvider);

  return GoRouter(
    debugLogDiagnostics: false,
    initialLocation: '/',
    redirect: (context, state) {
      final isLoggedIn = authState.valueOrNull != null || isGuest;
      final isOnLogin = state.matchedLocation == '/login';

      // Auth callback must be reachable regardless of auth state.
      if (state.matchedLocation == '/auth/callback') return null;

      if (!isLoggedIn && !isOnLogin) return '/login';
      if (isLoggedIn && isOnLogin) return '/';
      return null;
    },
    routes: [
      // Login / auth choice
      GoRoute(
        name: AppRoutes.login,
        path: '/login',
        builder: (context, state) => const AuthChoiceScreen(),
      ),

      // OAuth2 callback — handles the redirect from the IdP.
      GoRoute(
        name: AppRoutes.authCallback,
        path: '/auth/callback',
        builder: (context, state) => const AuthCallbackScreen(),
      ),

      // Main app shell (tabs: Discover, Create, Alerts, Profile)
      GoRoute(
        name: AppRoutes.shell,
        path: '/',
        builder: (context, state) => const AdaptiveShell(),
        routes: [
          // Post detail
          GoRoute(
            name: AppRoutes.post,
            path: 'post/:postId',
            builder: (context, state) => PostDetailScreen(
              postId: state.pathParameters['postId']!,
              initialCommentId: state.uri.queryParameters['commentId'],
            ),
          ),

          // User profile
          GoRoute(
            name: AppRoutes.profile,
            path: 'user/:userId',
            builder: (context, state) =>
                ProfileScreen(userId: state.pathParameters['userId']),
          ),

          // Invite redemption
          GoRoute(
            name: AppRoutes.invite,
            path: 'invite/:code',
            builder: (context, state) =>
                InviteRedeemScreen(inviteCode: state.pathParameters['code']),
          ),

          // Moderation
          GoRoute(
            name: AppRoutes.moderation,
            path: 'moderation',
            builder: (context, state) => const ModerationConsoleScreen(),
            routes: [
              GoRoute(
                name: AppRoutes.moderationAppeal,
                path: 'appeal',
                builder: (context, state) => const AppealHistoryScreen(),
              ),
            ],
          ),

          // Notification settings
          GoRoute(
            name: AppRoutes.notificationSettings,
            path: 'settings/notifications',
            builder: (context, state) => const NotificationsSettingsScreen(),
          ),
        ],
      ),
    ],
  );
});
