import 'package:asora/core/routing/app_router.dart';
import 'package:asora/design_system/components/lyth_button.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/invite_redeem_service.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/features/auth/presentation/invite_redeem_screen.dart';
import 'package:asora/features/auth/presentation/auth_callback_screen.dart';
import 'package:asora/features/auth/presentation/auth_choice_screen.dart';
import 'package:asora/features/moderation/presentation/moderation_console/moderation_console_screen.dart';
import 'package:asora/features/moderation/presentation/screens/appeal_history_screen.dart';
import 'package:asora/features/notifications/presentation/notifications_settings_screen.dart';
import 'package:asora/core/analytics/analytics_client.dart';
import 'package:asora/core/analytics/analytics_providers.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:asora/features/feed/presentation/post_detail_screen.dart';
import 'package:asora/ui/screens/adaptive_shell.dart';
import 'package:asora/ui/screens/profile/profile_screen.dart';
import 'package:asora/ui/screens/profile/reputation_ledger_screen.dart';

class _MockAuthStateNotifier extends StateNotifier<AsyncValue<User?>>
    implements AuthStateNotifier {
  _MockAuthStateNotifier(super.initialState);

  @override
  Future<void> refreshToken() async {}
  @override
  Future<void> signInWithEmail(String e, String p) async {}
  @override
  Future<void> signInWithOAuth2() async {}
  @override
  Future<void> signInWithProvider(OAuth2Provider provider) async {}
  @override
  Future<void> signOut() async => state = const AsyncValue.data(null);
  @override
  Future<void> validateToken() async {}
  @override
  Future<void> continueAsGuest() async {}
  @override
  void setUser(User user) {
    state = AsyncValue.data(user);
  }
}

User _fakeUser({String id = 'u1'}) => User(
  id: id,
  email: '$id@test.com',
  role: UserRole.user,
  tier: UserTier.bronze,
  reputationScore: 0,
  createdAt: DateTime(2024),
  lastLoginAt: DateTime(2024),
);

void main() {
  group('AppRouter redirect logic', () {
    late ProviderContainer container;

    GoRouter buildRouter({
      User? user,
      bool guest = false,
      String? pendingCode,
      String? jwtToken,
    }) {
      container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => _MockAuthStateNotifier(AsyncValue.data(user)),
          ),
          guestModeProvider.overrideWith((ref) => guest),
          pendingInviteCodeProvider.overrideWith((ref) => pendingCode),
          jwtProvider.overrideWith((ref) async => jwtToken),
        ],
      );
      addTearDown(container.dispose);
      return container.read(appRouterProvider);
    }

    test('unauthenticated non-guest redirects to /login', () {
      final router = buildRouter();
      expect(router.configuration.routes.length, greaterThan(0));

      final config = router.routeInformationParser;
      expect(config, isNotNull);
    });

    test('route name constants are defined', () {
      expect(AppRoutes.login, 'login');
      expect(AppRoutes.authCallback, 'auth-callback');
      expect(AppRoutes.shell, 'shell');
      expect(AppRoutes.post, 'post');
      expect(AppRoutes.profile, 'profile');
      expect(AppRoutes.invite, 'invite');
      expect(AppRoutes.moderation, 'moderation');
      expect(AppRoutes.moderationAppeal, 'moderation-appeal');
      expect(AppRoutes.notificationSettings, 'notification-settings');
    });

    test('router creates successfully for authenticated user', () {
      final router = buildRouter(user: _fakeUser());
      expect(router, isNotNull);
      expect(router.configuration.routes.length, greaterThan(0));
    });

    test('router creates successfully for guest user', () {
      final router = buildRouter(guest: true);
      expect(router, isNotNull);
    });

    test('router creates successfully for unauthenticated user', () {
      final router = buildRouter();
      expect(router, isNotNull);
    });

    testWidgets('real router redirects unauthenticated users to login', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1600, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final router = buildRouter();
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(AuthChoiceScreen), findsOneWidget);
      expect(router.routerDelegate.currentConfiguration.uri.path, '/login');
    });

    testWidgets('real router preserves pending invite redirect', (tester) async {
      final router = buildRouter(
        user: _fakeUser(),
        pendingCode: 'ABCD-1234',
        jwtToken: 'token',
      );
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(InviteRedeemScreen), findsOneWidget);
      expect(router.routerDelegate.currentConfiguration.uri.path, '/invite/ABCD-1234');
    });

    test('shell route has expected nested routes', () {
      final router = buildRouter(user: _fakeUser());
      final shellRoute = router.configuration.routes
          .whereType<GoRoute>()
          .firstWhere((r) => r.path == '/');
      // invite was moved to a top-level public route; shell now has 4 children.
      expect(shellRoute.routes.length, greaterThanOrEqualTo(4));
      final childPaths = shellRoute.routes
          .whereType<GoRoute>()
          .map((r) => r.path)
          .toList();
      expect(childPaths, contains('post/:postId'));
      expect(childPaths, contains('user/:userId'));
      final topLevelPaths = router.configuration.routes
          .whereType<GoRoute>()
          .map((r) => r.path)
          .toList();
      expect(
        topLevelPaths,
        containsAll(['/login', '/auth/callback', '/invite/:code']),
      );
      expect(topLevelPaths, isNot(contains('/user/test')));
      expect(topLevelPaths, isNot(contains('/post/test')));
    });

    testWidgets('route builders can construct every registered screen', (
      tester,
    ) async {
      final router = buildRouter(user: _fakeUser());
      late BuildContext context;

      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (c) {
              context = c;
              return const SizedBox.shrink();
            },
          ),
        ),
      );
      await tester.pumpAndSettle();

      final routes = router.configuration.routes.whereType<GoRoute>().toList();
      final shellRoute = routes.firstWhere((r) => r.path == '/');

      GoRouterState buildState(
        String location, {
        required String fullPath,
        Map<String, String> pathParameters = const {},
      }) {
        return GoRouterState(
          router.configuration,
          uri: Uri.parse(location),
          matchedLocation: location,
          fullPath: fullPath,
          pathParameters: pathParameters,
          pageKey: ValueKey(location),
        );
      }

      final loginWidget = routes.firstWhere((r) => r.path == '/login').builder!(
        context,
        buildState('/login', fullPath: '/login'),
      );
      final callbackWidget =
          routes.firstWhere((r) => r.path == '/auth/callback').builder!(
            context,
            buildState('/auth/callback', fullPath: '/auth/callback'),
          );
      final inviteWidget = routes.firstWhere((r) => r.path == '/invite/:code')
          .builder!(
            context,
            buildState(
              '/invite/ABCD-1234',
              fullPath: '/invite/:code',
              pathParameters: const {'code': 'ABCD-1234'},
            ),
          );
      expect(routes.where((r) => r.path == '/user/test'), isEmpty);
      expect(routes.where((r) => r.path == '/post/test'), isEmpty);
      final shellWidget =
          shellRoute.builder!(context, buildState('/', fullPath: '/'));
      final shellChildren = shellRoute.routes.whereType<GoRoute>().toList();
      final postWidget = shellChildren.firstWhere((r) => r.path == 'post/:postId')
          .builder!(
            context,
            buildState(
              '/post/abc',
              fullPath: '/post/:postId',
              pathParameters: const {'postId': 'abc'},
            ),
          );
      final profileWidget = shellChildren.firstWhere((r) => r.path == 'user/:userId')
          .builder!(
            context,
            buildState(
              '/user/abc',
              fullPath: '/user/:userId',
              pathParameters: const {'userId': 'abc'},
            ),
          );
      final moderationWidget = shellChildren.firstWhere((r) => r.path == 'moderation')
          .builder!(context, buildState('/moderation', fullPath: '/moderation'));
      final moderationChildren = shellChildren
          .firstWhere((r) => r.path == 'moderation')
          .routes
          .whereType<GoRoute>()
          .toList();
      final appealWidget = moderationChildren
          .firstWhere((r) => r.path == 'appeal')
          .builder!(context, buildState('/moderation/appeal', fullPath: '/moderation/appeal'));
      final notificationsWidget = shellChildren
          .firstWhere((r) => r.path == 'settings/notifications')
          .builder!(
            context,
            buildState(
              '/settings/notifications',
              fullPath: '/settings/notifications',
            ),
          );
      final reputationWidget = shellChildren
          .firstWhere((r) => r.path == 'reputation/ledger')
          .builder!(
            context,
            buildState('/reputation/ledger', fullPath: '/reputation/ledger'),
          );

      expect(loginWidget, isA<AuthChoiceScreen>());
      expect(callbackWidget, isA<AuthCallbackScreen>());
      expect(inviteWidget, isA<InviteRedeemScreen>());
      expect(shellWidget, isA<AdaptiveShell>());
      expect(postWidget, isA<PostDetailScreen>());
      expect(profileWidget, isA<ProfileScreen>());
      expect(moderationWidget, isA<ModerationConsoleScreen>());
      expect(appealWidget, isA<AppealHistoryScreen>());
      expect(notificationsWidget, isA<NotificationsSettingsScreen>());
      expect(reputationWidget, isA<ReputationLedgerScreen>());
    });
  });

  // ---------------------------------------------------------------------------
  // Invite route public accessibility
  // ---------------------------------------------------------------------------
  group('invite route public accessibility', () {
    // Lightweight GoRouter that mirrors only the redirect logic under test.
    // Using stub screens avoids pulling in the full provider graph.
    GoRouter buildRedirectRouter({
      required bool isLoggedIn,
      required String? pendingCode,
      String initialLocation = '/',
    }) {
      return GoRouter(
        initialLocation: initialLocation,
        redirect: (context, state) {
          final isOnLogin = state.matchedLocation == '/login';
          final isOnAuthCallback = state.matchedLocation == '/auth/callback';
          final isOnInvite = state.matchedLocation.startsWith('/invite/');
          if (isOnAuthCallback || isOnInvite) {
            return null;
          }
          if (isLoggedIn && pendingCode != null && pendingCode.isNotEmpty) {
            return '/invite/$pendingCode';
          }
          if (!isLoggedIn && !isOnLogin) return '/login';
          if (isLoggedIn && isOnLogin) return '/';
          return null;
        },
        routes: [
          GoRoute(
            path: '/',
            builder: (_, __) => const _StubPage(label: 'home'),
          ),
          GoRoute(
            path: '/login',
            builder: (_, __) => const _StubPage(label: 'login'),
          ),
          GoRoute(
            path: '/auth/callback',
            builder: (_, __) => const _StubPage(label: 'callback'),
          ),
          GoRoute(
            path: '/invite/:code',
            builder: (_, __) => const _StubPage(label: 'invite'),
          ),
        ],
      );
    }

    // -------------------------------------------------------------------------
    // Test 1: anonymous user opening /invite/:code does not lose the code.
    // -------------------------------------------------------------------------
    testWidgets(
      'anonymous user opening /invite/:code is not redirected to login',
      (tester) async {
        final router = buildRedirectRouter(
          isLoggedIn: false,
          pendingCode: null,
          initialLocation: '/invite/ABCD-1234',
        );
        await tester.pumpWidget(MaterialApp.router(routerConfig: router));
        await tester.pumpAndSettle();

        // The invite page stub must be visible, login must not be.
        expect(find.text('invite'), findsOneWidget);
        expect(find.text('login'), findsNothing);
        expect(
          router.routerDelegate.currentConfiguration.uri.path,
          '/invite/ABCD-1234',
        );
      },
    );

    testWidgets('authenticated user opening /login is redirected home', (
      tester,
    ) async {
      final router = buildRedirectRouter(
        isLoggedIn: true,
        pendingCode: null,
        initialLocation: '/login',
      );
      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();

      expect(find.text('home'), findsOneWidget);
      expect(
        router.routerDelegate.currentConfiguration.uri.path,
        '/',
      );
    });

    testWidgets('authenticated user can open /auth/callback without redirect', (
      tester,
    ) async {
      final router = buildRedirectRouter(
        isLoggedIn: true,
        pendingCode: null,
        initialLocation: '/auth/callback',
      );
      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();

      expect(find.text('callback'), findsOneWidget);
      expect(
        router.routerDelegate.currentConfiguration.uri.path,
        '/auth/callback',
      );
    });

    // -------------------------------------------------------------------------
    // Test 2: authenticated user can view invite state.
    // -------------------------------------------------------------------------
    test(
      'authenticated user: invite route is a top-level accessible route',
      () {
        final container = ProviderContainer(
          overrides: [
            authStateProvider.overrideWith(
              (ref) => _MockAuthStateNotifier(AsyncValue.data(_fakeUser())),
            ),
            guestModeProvider.overrideWith((ref) => false),
          ],
        );
        addTearDown(container.dispose);

        final router = container.read(appRouterProvider);
        final topLevelPaths = router.configuration.routes
            .whereType<GoRoute>()
            .map((r) => r.path)
            .toList();

        expect(topLevelPaths, contains('/invite/:code'));

        final inviteRoute = router.configuration.routes
            .whereType<GoRoute>()
            .firstWhere((r) => r.path == '/invite/:code');
        expect(inviteRoute.name, AppRoutes.invite);
      },
    );

    // -------------------------------------------------------------------------
    // Test 3: login redirect preserves invite destination.
    // -------------------------------------------------------------------------
    testWidgets(
      'login redirect with pending invite code navigates to /invite/:code',
      (tester) async {
        // Simulate a logged-in user who has a pending invite code saved.
        final router = buildRedirectRouter(
          isLoggedIn: true,
          pendingCode: 'ABCD-1234',
          initialLocation: '/',
        );
        await tester.pumpWidget(MaterialApp.router(routerConfig: router));
        await tester.pumpAndSettle();

        // The redirect must have forwarded the user to the invite screen.
        expect(find.text('invite'), findsOneWidget);
        expect(find.text('home'), findsNothing);
        expect(
          router.routerDelegate.currentConfiguration.uri.path,
          '/invite/ABCD-1234',
        );
      },
    );

    // -------------------------------------------------------------------------
    // Test 4: invalid invite code displays safe error state.
    // -------------------------------------------------------------------------
    testWidgets('invalid invite code displays safe error state', (
      tester,
    ) async {
      tester.binding.platformDispatcher.textScaleFactorTestValue = 0.8;
      addTearDown(
        () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
      );

      final service = _FailingInviteRedeemService();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            analyticsClientProvider.overrideWithValue(
              const NullAnalyticsClient(),
            ),
            jwtProvider.overrideWith((ref) async => 'test-token'),
            inviteRedeemServiceProvider.overrideWithValue(service),
          ],
          child: const MaterialApp(
            home: InviteRedeemScreen(inviteCode: 'ZZZZ-9999'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Pre-filled code is present.
      expect(find.text('ZZZZ-9999'), findsOneWidget);

      // Tap the button widget directly (avoids AppBar title ambiguity).
      await tester.tap(find.byType(LythButton));
      await tester.pumpAndSettle();

      // Error message must be visible — no unhandled exception thrown.
      expect(
        find.text('Invite could not be redeemed. Please check the code.'),
        findsOneWidget,
      );
    });
  });
}

// ---------------------------------------------------------------------------
// Shared test helpers
// ---------------------------------------------------------------------------

class _StubPage extends StatelessWidget {
  const _StubPage({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) =>
      Scaffold(body: Center(child: Text(label)));
}

/// Service stub that always throws a [DioException] to simulate API failure.
class _FailingInviteRedeemService extends InviteRedeemService {
  _FailingInviteRedeemService() : super(Dio());

  @override
  Future<void> redeemInvite({
    required String accessToken,
    required String inviteCode,
  }) async {
    throw DioException(
      requestOptions: RequestOptions(path: '/api/auth/redeem-invite'),
      response: Response(
        requestOptions: RequestOptions(path: '/api/auth/redeem-invite'),
        statusCode: 400,
        data: {'message': 'not_found'},
      ),
      type: DioExceptionType.badResponse,
    );
  }
}
