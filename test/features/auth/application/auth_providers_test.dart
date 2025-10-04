import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/auth_service.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthService extends Mock implements AuthService {}

class _MockOAuth2Service extends Mock implements OAuth2Service {}

void main() {
  late ProviderContainer container;
  late _MockAuthService authService;
  late _MockOAuth2Service oauth2Service;

  final testUser = User(
    id: 'user-123',
    email: 'test@example.com',
    role: UserRole.user,
    tier: UserTier.bronze,
    reputationScore: 0,
    createdAt: DateTime.utc(2024),
    lastLoginAt: DateTime.utc(2024),
    isTemporary: false,
  );

  setUp(() {
    authService = _MockAuthService();
    oauth2Service = _MockOAuth2Service();
    when(() => oauth2Service.getAccessToken()).thenAnswer((_) async => null);
    when(() => authService.getJwtToken()).thenAnswer((_) async => null);
    container = ProviderContainer(
      overrides: [
        enhancedAuthServiceProvider.overrideWithValue(authService),
        oauth2ServiceProvider.overrideWithValue(oauth2Service),
      ],
    );
  });

  tearDown(() {
    container.dispose();
  });

  group('jwtProvider', () {
    test('caches token until invalidated', () async {
      when(() => authService.getJwtToken()).thenAnswer((_) async => 'token-1');

      final first = await container.read(jwtProvider.future);
      expect(first, 'token-1');

      final second = await container.read(jwtProvider.future);
      expect(second, 'token-1');

      verify(() => authService.getJwtToken()).called(1);
    });

    test('refetches when tokenVersion increments', () async {
      when(() => authService.getJwtToken()).thenAnswer((_) async => 'token-1');

      final first = await container.read(jwtProvider.future);
      expect(first, 'token-1');

      when(() => authService.getJwtToken()).thenAnswer((_) async => 'token-2');

      container.read(tokenVersionProvider.notifier).state++;

      final second = await container.read(jwtProvider.future);
      expect(second, 'token-2');
      verify(() => authService.getJwtToken()).called(2);
    });

    test('returns OAuth token when available', () async {
      when(
        () => oauth2Service.getAccessToken(),
      ).thenAnswer((_) async => 'oauth-token');

      final token = await container.read(jwtProvider.future);
      expect(token, 'oauth-token');
      verifyNever(() => authService.getJwtToken());
    });

    test('falls back to stored token when OAuth fails', () async {
      when(
        () => oauth2Service.getAccessToken(),
      ).thenThrow(Exception('OAuth error'));
      when(
        () => authService.getJwtToken(),
      ).thenAnswer((_) async => 'stored-token');

      final token = await container.read(jwtProvider.future);
      expect(token, 'stored-token');
    });

    test('returns null when no tokens available', () async {
      when(() => oauth2Service.getAccessToken()).thenAnswer((_) async => null);
      when(() => authService.getJwtToken()).thenAnswer((_) async => null);

      final token = await container.read(jwtProvider.future);
      expect(token, isNull);
    });
  });

  group('AuthStateNotifier', () {
    test('loads current user on initialization', () async {
      when(
        () => authService.getCurrentUser(),
      ).thenAnswer((_) async => testUser);

      // Trigger provider build
      container.read(authStateProvider);
      // Wait for async notifier to complete
      await Future(() {});

      verify(() => authService.getCurrentUser()).called(1);
    });

    test('signInWithOAuth2 updates state on success', () async {
      when(
        () => authService.signInWithOAuth2(),
      ).thenAnswer((_) async => testUser);
      when(() => authService.getCurrentUser()).thenAnswer((_) async => null);

      final notifier = container.read(authStateProvider.notifier);
      await notifier.signInWithOAuth2();
      // Allow notifier state update
      await Future(() {});
      final state = container.read(authStateProvider);
      expect(state.value, equals(testUser));
    });

    test('signInWithOAuth2 handles AuthFailure', () async {
      when(
        () => authService.signInWithOAuth2(),
      ).thenAnswer((_) async => throw AuthFailure.cancelledByUser());
      when(() => authService.getCurrentUser()).thenAnswer((_) async => null);

      final notifier = container.read(authStateProvider.notifier);
      await notifier.signInWithOAuth2();
      await Future(() {});
      final state = container.read(authStateProvider);
      expect(state.hasError, isTrue);
      expect(state.error, isA<AuthFailure>());
    });

    test('signInWithOAuth2 wraps generic errors', () async {
      when(
        () => authService.signInWithOAuth2(),
      ).thenAnswer((_) async => throw Exception('Network error'));
      when(() => authService.getCurrentUser()).thenAnswer((_) async => null);

      final notifier = container.read(authStateProvider.notifier);
      await notifier.signInWithOAuth2();
      await Future(() {});
      final state = container.read(authStateProvider);
      expect(state.hasError, isTrue);
      expect(state.error, isA<AuthFailure>());
    });

    test('signInWithEmail updates state on success', () async {
      when(
        () => authService.loginWithEmail(any(), any()),
      ).thenAnswer((_) async => testUser);
      when(() => authService.getCurrentUser()).thenAnswer((_) async => null);

      final notifier = container.read(authStateProvider.notifier);
      await notifier.signInWithEmail('test@example.com', 'password');

      final state = container.read(authStateProvider);
      expect(state.value, equals(testUser));
    });

    test('signInWithEmail handles errors', () async {
      when(
        () => authService.loginWithEmail(any(), any()),
      ).thenAnswer((_) async => throw AuthFailure.invalidCredentials());
      when(() => authService.getCurrentUser()).thenAnswer((_) async => null);

      final notifier = container.read(authStateProvider.notifier);
      await notifier.signInWithEmail('test@example.com', 'wrong');
      await Future(() {});
      final state = container.read(authStateProvider);
      expect(state.hasError, isTrue);
    });

    test('refreshToken updates state on success', () async {
      when(() => authService.refreshOAuth2Token()).thenAnswer((_) async {});
      when(
        () => authService.getCurrentUser(),
      ).thenAnswer((_) async => testUser);

      final notifier = container.read(authStateProvider.notifier);
      await notifier.refreshToken();

      final state = container.read(authStateProvider);
      expect(state.value, equals(testUser));
    });

    test('refreshToken handles failures', () async {
      when(() => authService.refreshOAuth2Token()).thenAnswer(
        (_) async => throw AuthFailure.serverError('Token refresh failed'),
      );
      when(() => authService.getCurrentUser()).thenAnswer((_) async => null);

      final notifier = container.read(authStateProvider.notifier);
      await notifier.refreshToken();
      await Future(() {});
      final state = container.read(authStateProvider);
      expect(state.hasError, isTrue);
    });

    test('signOut clears state', () async {
      when(() => authService.logout()).thenAnswer((_) async {});
      when(
        () => authService.getCurrentUser(),
      ).thenAnswer((_) async => testUser);

      final notifier = container.read(authStateProvider.notifier);
      await notifier.signOut();

      final state = container.read(authStateProvider);
      expect(state.value, isNull);
    });

    test('signOut clears state even on error', () async {
      when(
        () => authService.logout(),
      ).thenAnswer((_) async => throw Exception('Logout failed'));
      when(
        () => authService.getCurrentUser(),
      ).thenAnswer((_) async => testUser);

      final notifier = container.read(authStateProvider.notifier);
      notifier.state = AsyncValue.data(testUser);
      await notifier.signOut();
      await Future(() {});
      final state = container.read(authStateProvider);
      expect(state.value, isNull);
    });

    test('validateToken refreshes when valid', () async {
      when(
        () => authService.validateAndRefreshToken(),
      ).thenAnswer((_) async => true);
      when(
        () => authService.getCurrentUser(),
      ).thenAnswer((_) async => testUser);

      final notifier = container.read(authStateProvider.notifier);
      await notifier.validateToken();

      final state = container.read(authStateProvider);
      expect(state.value, equals(testUser));
    });

    test('validateToken clears state when invalid', () async {
      when(
        () => authService.validateAndRefreshToken(),
      ).thenAnswer((_) async => false);
      when(
        () => authService.getCurrentUser(),
      ).thenAnswer((_) async => testUser);

      final notifier = container.read(authStateProvider.notifier);
      await notifier.validateToken();

      final state = container.read(authStateProvider);
      expect(state.value, isNull);
    });

    test('validateToken handles errors', () async {
      when(
        () => authService.validateAndRefreshToken(),
      ).thenAnswer((_) async => throw Exception('Validation error'));
      when(
        () => authService.getCurrentUser(),
      ).thenAnswer((_) async => testUser);

      final notifier = container.read(authStateProvider.notifier);
      await notifier.validateToken();
      await Future(() {});
      final state = container.read(authStateProvider);
      expect(state.hasError, isTrue);
    });
  });

  group('Convenience providers', () {
    test('isAuthenticatedProvider returns true when user present', () async {
      when(
        () => authService.getCurrentUser(),
      ).thenAnswer((_) async => testUser);

      container.read(authStateProvider);
      await Future.microtask(() {});

      final isAuthenticated = container.read(isAuthenticatedProvider);
      expect(isAuthenticated, isTrue);
    });

    test('isAuthenticatedProvider returns false when no user', () async {
      when(() => authService.getCurrentUser()).thenAnswer((_) async => null);

      container.read(authStateProvider);
      await Future.microtask(() {});

      final isAuthenticated = container.read(isAuthenticatedProvider);
      expect(isAuthenticated, isFalse);
    });

    test('currentUserProvider returns user when present', () async {
      when(
        () => authService.getCurrentUser(),
      ).thenAnswer((_) async => testUser);

      container.read(authStateProvider);
      await Future.microtask(() {});

      final user = container.read(currentUserProvider);
      expect(user, equals(testUser));
    });

    test('currentUserProvider returns null when no user', () async {
      when(() => authService.getCurrentUser()).thenAnswer((_) async => null);

      container.read(authStateProvider);
      await Future.microtask(() {});

      final user = container.read(currentUserProvider);
      expect(user, isNull);
    });

    test('isAuthLoadingProvider returns true during loading', () {
      when(() => authService.getCurrentUser()).thenAnswer(
        (_) =>
            Future.delayed(const Duration(milliseconds: 100), () => testUser),
      );

      final isLoading = container.read(isAuthLoadingProvider);
      expect(isLoading, isTrue);
    });

    test('isAuthLoadingProvider returns false when loaded', () async {
      when(
        () => authService.getCurrentUser(),
      ).thenAnswer((_) async => testUser);

      container.read(authStateProvider);
      await Future.microtask(() {});

      final isLoading = container.read(isAuthLoadingProvider);
      expect(isLoading, isFalse);
    });

    test('authErrorProvider returns error when present', () async {
      when(
        () => authService.getCurrentUser(),
      ).thenThrow(AuthFailure.invalidCredentials());

      container.read(authStateProvider);
      await Future.microtask(() {});

      final error = container.read(authErrorProvider);
      expect(error, isA<AuthFailure>());
    });

    test('authErrorProvider returns null when no error', () async {
      when(
        () => authService.getCurrentUser(),
      ).thenAnswer((_) async => testUser);

      container.read(authStateProvider);
      await Future.microtask(() {});

      final error = container.read(authErrorProvider);
      expect(error, isNull);
    });
  });

  group('tokenVersionProvider', () {
    test('starts at zero', () {
      final version = container.read(tokenVersionProvider);
      expect(version, equals(0));
    });

    test('can be incremented', () {
      container.read(tokenVersionProvider.notifier).state++;
      final version = container.read(tokenVersionProvider);
      expect(version, equals(1));
    });
  });
}
