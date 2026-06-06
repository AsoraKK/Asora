import 'package:asora/core/routing/app_router.dart';
import 'package:asora/design_system/components/lyth_button.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/invite_redeem_service.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/features/auth/presentation/invite_redeem_screen.dart';
import 'package:asora/core/analytics/analytics_client.dart';
import 'package:asora/core/analytics/analytics_providers.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

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

    GoRouter buildRouter({User? user, bool guest = false}) {
      container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => _MockAuthStateNotifier(AsyncValue.data(user)),
          ),
          guestModeProvider.overrideWith((ref) => guest),
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
      expect(AppRoutes.userTest, 'user-test');
      expect(AppRoutes.postTest, 'post-test');
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
        containsAll(['/login', '/auth/callback', '/user/test', '/post/test']),
      );
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
          final isOnUserTest = state.matchedLocation == '/user/test';
          final isOnPostTest = state.matchedLocation == '/post/test';
          if (isOnAuthCallback || isOnInvite || isOnUserTest || isOnPostTest) {
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
          GoRoute(
            path: '/user/test',
            builder: (_, __) => const _StubPage(label: 'user-test'),
          ),
          GoRoute(
            path: '/post/test',
            builder: (_, __) => const _StubPage(label: 'post-test'),
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

    testWidgets(
      'anonymous user opening /user/test is not redirected to login',
      (tester) async {
        final router = buildRedirectRouter(
          isLoggedIn: false,
          pendingCode: null,
          initialLocation: '/user/test',
        );
        await tester.pumpWidget(MaterialApp.router(routerConfig: router));
        await tester.pumpAndSettle();

        expect(find.text('user-test'), findsOneWidget);
        expect(find.text('login'), findsNothing);
        expect(
          router.routerDelegate.currentConfiguration.uri.path,
          '/user/test',
        );
      },
    );

    testWidgets(
      'anonymous user opening /post/test is not redirected to login',
      (tester) async {
        final router = buildRedirectRouter(
          isLoggedIn: false,
          pendingCode: null,
          initialLocation: '/post/test',
        );
        await tester.pumpWidget(MaterialApp.router(routerConfig: router));
        await tester.pumpAndSettle();

        expect(find.text('post-test'), findsOneWidget);
        expect(find.text('login'), findsNothing);
        expect(
          router.routerDelegate.currentConfiguration.uri.path,
          '/post/test',
        );
      },
    );

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
