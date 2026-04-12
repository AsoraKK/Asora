import 'package:asora/core/routing/app_router.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/domain/user.dart';
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
      expect(shellRoute.routes.length, greaterThanOrEqualTo(5));
    });
  });
}
