import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/application/web_auth_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/features/auth/presentation/auth_callback_screen.dart';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class _MockAuthStateNotifier extends StateNotifier<AsyncValue<User?>>
    implements AuthStateNotifier {
  _MockAuthStateNotifier() : super(const AsyncValue.data(null));
  User? lastSetUser;

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
    lastSetUser = user;
    state = AsyncValue.data(user);
  }
}

User _fakeUser() => User(
  id: 'web-u1',
  email: 'web@test.com',
  role: UserRole.user,
  tier: UserTier.bronze,
  reputationScore: 0,
  createdAt: DateTime(2026),
  lastLoginAt: DateTime(2026),
);

/// A [WebAuthService] substitute that does not hit real endpoints.
class _FakeWebAuthService extends WebAuthService {
  _FakeWebAuthService({this.userToReturn, this.errorToThrow});

  final User? userToReturn;
  final Object? errorToThrow;

  @override
  Future<User> handleCallback(Uri callbackUri) async {
    if (errorToThrow != null) throw errorToThrow!;
    return userToReturn ?? _fakeUser();
  }
}

Widget _buildTestApp({
  required _MockAuthStateNotifier authNotifier,
  required WebAuthService webAuthService,
  String initialUrl = '/auth/callback?code=abc&state=xyz',
}) {
  final router = GoRouter(
    initialLocation: initialUrl,
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, __) => const Scaffold(body: Text('Login Page')),
      ),
      GoRoute(
        path: '/',
        builder: (_, __) => const Scaffold(body: Text('Home Page')),
      ),
      GoRoute(
        path: '/auth/callback',
        builder: (_, __) => const AuthCallbackScreen(),
      ),
    ],
  );

  return ProviderScope(
    overrides: [
      authStateProvider.overrideWith((_) => authNotifier),
      webAuthServiceProvider.overrideWithValue(webAuthService),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  group('AuthCallbackScreen', () {
    testWidgets('shows loading spinner while processing', (tester) async {
      final notifier = _MockAuthStateNotifier();
      final service = _FakeWebAuthService(userToReturn: _fakeUser());

      await tester.pumpWidget(
        _buildTestApp(authNotifier: notifier, webAuthService: service),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Completing sign-in…'), findsOneWidget);
    });

    testWidgets('successful callback sets user and navigates home', (
      tester,
    ) async {
      final notifier = _MockAuthStateNotifier();
      final service = _FakeWebAuthService(userToReturn: _fakeUser());

      await tester.pumpWidget(
        _buildTestApp(authNotifier: notifier, webAuthService: service),
      );

      await tester.pumpAndSettle();

      expect(notifier.lastSetUser, isNotNull);
      expect(notifier.lastSetUser!.id, 'web-u1');
      expect(find.text('Home Page'), findsOneWidget);
    });

    testWidgets('AuthFailure shows error message and back button', (
      tester,
    ) async {
      final notifier = _MockAuthStateNotifier();
      final service = _FakeWebAuthService(
        errorToThrow: AuthFailure.serverError('OAuth2 state mismatch'),
      );

      await tester.pumpWidget(
        _buildTestApp(authNotifier: notifier, webAuthService: service),
      );
      await tester.pumpAndSettle();

      expect(find.text('OAuth2 state mismatch'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
      expect(find.text('Back to sign in'), findsOneWidget);
    });

    testWidgets('generic error shows sign-in failed message', (tester) async {
      final notifier = _MockAuthStateNotifier();
      final service = _FakeWebAuthService(
        errorToThrow: Exception('network down'),
      );

      await tester.pumpWidget(
        _buildTestApp(authNotifier: notifier, webAuthService: service),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Sign-in failed'), findsOneWidget);
    });

    testWidgets('back-to-login button navigates to /login', (tester) async {
      final notifier = _MockAuthStateNotifier();
      final service = _FakeWebAuthService(
        errorToThrow: AuthFailure.serverError('bad code'),
      );

      await tester.pumpWidget(
        _buildTestApp(authNotifier: notifier, webAuthService: service),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Back to sign in'));
      await tester.pumpAndSettle();

      expect(find.text('Login Page'), findsOneWidget);
    });
  });
}
