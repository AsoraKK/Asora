// ignore_for_file: public_member_api_docs

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/web_token_storage.dart';
import 'package:asora/features/auth/presentation/auth_callback_screen.dart';
import 'package:asora/features/auth/presentation/auth_choice_screen.dart';
import 'package:asora/features/auth/presentation/email_token_screen.dart';
import 'package:asora/features/auth/presentation/invite_redeem_screen.dart';
import 'package:asora/features/feed/presentation/post_detail_screen.dart';
import 'package:asora/features/moderation/presentation/moderation_console/moderation_console_screen.dart';
import 'package:asora/features/moderation/presentation/screens/appeal_history_screen.dart';
import 'package:asora/features/notifications/presentation/notifications_settings_screen.dart';
import 'package:asora/ui/screens/adaptive_shell.dart';
import 'package:asora/ui/screens/profile/profile_screen.dart';
import 'package:asora/ui/screens/profile/reputation_ledger_screen.dart';

/// Route name constants.
abstract final class AppRoutes {
  static const String login = 'login';
  static const String authCallback = 'auth-callback';
  static const String verifyEmail = 'verify-email';
  static const String resetPassword = 'reset-password';
  static const String shell = 'shell';
  static const String post = 'post';
  static const String profile = 'profile';
  static const String invite = 'invite';
  static const String moderation = 'moderation';
  static const String moderationAppeal = 'moderation-appeal';
  static const String notificationSettings = 'notification-settings';
  static const String reputationLedger = 'reputation-ledger';
}

/// Provides the application [GoRouter] that is refreshed when auth state
/// changes. Stage A: top-level routes wrapping existing screen widgets.
final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);
  final isGuest = ref.watch(guestModeProvider);
  final pendingCode = ref.watch(pendingInviteCodeProvider);

  return GoRouter(
    debugLogDiagnostics: false,
    initialLocation: '/',
    redirect: (context, state) {
      final isLoggedIn = authState.valueOrNull != null || isGuest;
      final isOnLogin = state.matchedLocation == '/login';
      final isOnAuthCallback = state.matchedLocation == '/auth/callback';
      final isOnEmailAction =
          state.matchedLocation == '/auth/verify-email' ||
          state.matchedLocation == '/auth/reset-password';
      final isOnInvite = state.matchedLocation.startsWith('/invite/');

      // Auth callback and invite routes are always publicly accessible.
      if (isOnAuthCallback || isOnEmailAction || isOnInvite) {
        return null;
      }

      // After login, send the user to redeem their saved invite code.
      if (isLoggedIn && pendingCode != null && pendingCode.isNotEmpty) {
        return '/invite/$pendingCode';
      }

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
      GoRoute(
        name: AppRoutes.verifyEmail,
        path: '/auth/verify-email',
        builder: (context, state) => EmailVerificationScreen(
          token: getWebEmailActionFragmentToken() ?? state.uri.queryParameters['token'] ?? '',
        ),
      ),
      GoRoute(
        name: AppRoutes.resetPassword,
        path: '/auth/reset-password',
        builder: (context, state) => PasswordResetScreen(
          token: getWebEmailActionFragmentToken() ?? state.uri.queryParameters['token'] ?? '',
        ),
      ),

      // Invite redemption — top-level public route so anonymous users can
      // open deep-links and the invite code is never lost by an auth wall.
      GoRoute(
        name: AppRoutes.invite,
        path: '/invite/:code',
        builder: (context, state) =>
            InviteRedeemScreen(inviteCode: state.pathParameters['code']),
      ),

      // Main app shell (tabs: Discover, My Feeds, Create, News Board, Profile)
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

          // Reputation ledger
          GoRoute(
            name: AppRoutes.reputationLedger,
            path: 'reputation/ledger',
            builder: (context, state) => const ReputationLedgerScreen(),
          ),
        ],
      ),
    ],
  );
});
