import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/auth_service.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';
import 'package:asora/features/auth/domain/user.dart';

class _MockAuthService extends Mock implements AuthService {}

class _MockOAuth2Service extends Mock implements OAuth2Service {}

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
  late _MockAuthService mockAuth;
  late _MockOAuth2Service mockOAuth2;

  setUpAll(() {
    registerFallbackValue(OAuth2Provider.google);
  });

  setUp(() {
    mockAuth = _MockAuthService();
    mockOAuth2 = _MockOAuth2Service();
  });

  ProviderContainer makeContainer() {
    final c = ProviderContainer(
      overrides: [
        enhancedAuthServiceProvider.overrideWithValue(mockAuth),
        oauth2ServiceProvider.overrideWithValue(mockOAuth2),
      ],
    );
    addTearDown(c.dispose);
    return c;
  }

  /// Waits for the initial _loadCurrentUser to settle.
  Future<void> settle() =>
      Future<void>.delayed(const Duration(milliseconds: 200));

  group('AuthStateNotifier', () {
    test('initial load success', () async {
      final user = _fakeUser();
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => user);

      final c = makeContainer();
      AsyncValue<User?>? last;
      c.listen(
        authStateProvider,
        (_, next) => last = next,
        fireImmediately: true,
      );
      await settle();

      expect(last?.value, user);
    });

    test('initial load null user', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);

      final c = makeContainer();
      await settle();

      expect(c.read(authStateProvider).value, isNull);
    });

    test('initial load error', () async {
      when(
        () => mockAuth.getCurrentUser(),
      ).thenAnswer((_) => Future.error(Exception('boom')));

      final c = makeContainer();
      AsyncValue<User?>? last;
      c.listen(
        authStateProvider,
        (_, next) => last = next,
        fireImmediately: true,
      );
      await settle();

      expect(last?.hasError, isTrue);
    });

    test('signInWithOAuth2 success', () async {
      final user = _fakeUser();
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(
        () => mockAuth.signInWithOAuth2(provider: any(named: 'provider')),
      ).thenAnswer((_) async => user);

      final c = makeContainer();
      await settle();

      await c.read(authStateProvider.notifier).signInWithOAuth2();
      expect(c.read(authStateProvider).value, user);
    });

    test('signInWithOAuth2 AuthFailure', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(
        () => mockAuth.signInWithOAuth2(provider: any(named: 'provider')),
      ).thenAnswer((_) => Future.error(AuthFailure.serverError('nope')));

      final c = makeContainer();
      await settle();

      await c.read(authStateProvider.notifier).signInWithOAuth2();
      expect(c.read(authStateProvider).hasError, isTrue);
    });

    test('signInWithOAuth2 generic exception wraps in AuthFailure', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(
        () => mockAuth.signInWithOAuth2(provider: any(named: 'provider')),
      ).thenAnswer((_) => Future.error(Exception('net down')));

      final c = makeContainer();
      await settle();

      await c.read(authStateProvider.notifier).signInWithOAuth2();
      final st = c.read(authStateProvider);
      expect(st.hasError, isTrue);
      expect(st.error, isA<AuthFailure>());
    });

    test('signInWithProvider success', () async {
      final user = _fakeUser();
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(
        () => mockAuth.signInWithOAuth2(provider: any(named: 'provider')),
      ).thenAnswer((_) async => user);

      final c = makeContainer();
      await settle();

      await c
          .read(authStateProvider.notifier)
          .signInWithProvider(OAuth2Provider.apple);
      expect(c.read(authStateProvider).value, user);
    });

    test('signInWithProvider error', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(
        () => mockAuth.signInWithOAuth2(provider: any(named: 'provider')),
      ).thenAnswer((_) => Future.error(Exception('provider err')));

      final c = makeContainer();
      await settle();

      await c
          .read(authStateProvider.notifier)
          .signInWithProvider(OAuth2Provider.google);
      expect(c.read(authStateProvider).hasError, isTrue);
    });

    test('signInWithEmail success', () async {
      final user = _fakeUser();
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(
        () => mockAuth.loginWithEmail(any(), any()),
      ).thenAnswer((_) async => user);

      final c = makeContainer();
      await settle();

      await c.read(authStateProvider.notifier).signInWithEmail('a@b.com', 'pw');
      expect(c.read(authStateProvider).value, user);
    });

    test('signInWithEmail error wraps in AuthFailure', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(
        () => mockAuth.loginWithEmail(any(), any()),
      ).thenAnswer((_) => Future.error(Exception('nope')));

      final c = makeContainer();
      await settle();

      await c.read(authStateProvider.notifier).signInWithEmail('a@b.com', 'pw');
      final st = c.read(authStateProvider);
      expect(st.hasError, isTrue);
      expect(st.error, isA<AuthFailure>());
    });

    test('refreshToken success bumps version', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(() => mockAuth.refreshOAuth2Token()).thenAnswer((_) async {});

      final c = makeContainer();
      await settle();

      final vBefore = c.read(tokenVersionProvider);
      await c.read(authStateProvider.notifier).refreshToken();
      expect(c.read(tokenVersionProvider), greaterThan(vBefore));
    });

    test('refreshToken AuthFailure', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(
        () => mockAuth.refreshOAuth2Token(),
      ).thenAnswer((_) => Future.error(AuthFailure.networkError('err')));

      final c = makeContainer();
      await settle();

      await c.read(authStateProvider.notifier).refreshToken();
      expect(c.read(authStateProvider).hasError, isTrue);
    });

    test('refreshToken generic wraps in AuthFailure', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(
        () => mockAuth.refreshOAuth2Token(),
      ).thenAnswer((_) => Future.error(Exception('fail')));

      final c = makeContainer();
      await settle();

      await c.read(authStateProvider.notifier).refreshToken();
      final st = c.read(authStateProvider);
      expect(st.hasError, isTrue);
      expect(st.error, isA<AuthFailure>());
    });

    test('signOut success', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(() => mockAuth.logout()).thenAnswer((_) async {});

      final c = makeContainer();
      await settle();

      await c.read(authStateProvider.notifier).signOut();
      expect(c.read(authStateProvider).value, isNull);
    });

    test('signOut error still nulls state', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(
        () => mockAuth.logout(),
      ).thenAnswer((_) => Future.error(Exception('fail')));

      final c = makeContainer();
      await settle();

      await c.read(authStateProvider.notifier).signOut();
      expect(c.read(authStateProvider).value, isNull);
    });

    test('validateToken valid reloads user', () async {
      final user = _fakeUser();
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => user);
      when(
        () => mockAuth.validateAndRefreshToken(),
      ).thenAnswer((_) async => true);

      final c = makeContainer();
      await settle();

      await c.read(authStateProvider.notifier).validateToken();
      expect(c.read(authStateProvider).value, user);
    });

    test('validateToken invalid nulls state', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(
        () => mockAuth.validateAndRefreshToken(),
      ).thenAnswer((_) async => false);

      final c = makeContainer();
      await settle();

      await c.read(authStateProvider.notifier).validateToken();
      expect(c.read(authStateProvider).value, isNull);
    });

    test('validateToken error', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(
        () => mockAuth.validateAndRefreshToken(),
      ).thenAnswer((_) => Future.error(Exception('fail')));

      final c = makeContainer();
      await settle();

      await c.read(authStateProvider.notifier).validateToken();
      expect(c.read(authStateProvider).hasError, isTrue);
    });
  });

  group('Convenience providers', () {
    test('isAuthenticatedProvider false when no user', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);

      final c = makeContainer();
      await settle();

      expect(c.read(isAuthenticatedProvider), isFalse);
    });

    test('isAuthenticatedProvider true when user present', () async {
      when(
        () => mockAuth.getCurrentUser(),
      ).thenAnswer((_) async => _fakeUser());

      final c = makeContainer();
      c.listen(authStateProvider, (_, __) {}, fireImmediately: true);
      await settle();

      expect(c.read(isAuthenticatedProvider), isTrue);
    });

    test('currentUserProvider null when no user', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);

      final c = makeContainer();
      await settle();

      expect(c.read(currentUserProvider), isNull);
    });

    test('isAuthLoadingProvider true initially', () {
      when(
        () => mockAuth.getCurrentUser(),
      ).thenAnswer((_) => Completer<User?>().future);

      final c = makeContainer();
      expect(c.read(isAuthLoadingProvider), isTrue);
    });

    test('authErrorProvider null when no error', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);

      final c = makeContainer();
      await settle();

      expect(c.read(authErrorProvider), isNull);
    });
  });

  group('jwtProvider', () {
    test('returns OAuth2 token when available', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(
        () => mockOAuth2.getAccessToken(),
      ).thenAnswer((_) async => 'oauth2-tok');

      final c = makeContainer();
      expect(await c.read(jwtProvider.future), 'oauth2-tok');
    });

    test('falls back to stored when OAuth2 null', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(() => mockOAuth2.getAccessToken()).thenAnswer((_) async => null);
      when(() => mockAuth.getJwtToken()).thenAnswer((_) async => 'stored');

      final c = makeContainer();
      expect(await c.read(jwtProvider.future), 'stored');
    });

    test('falls back to stored when OAuth2 empty', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(() => mockOAuth2.getAccessToken()).thenAnswer((_) async => '');
      when(() => mockAuth.getJwtToken()).thenAnswer((_) async => 'st2');

      final c = makeContainer();
      expect(await c.read(jwtProvider.future), 'st2');
    });

    test('falls back when OAuth2 throws', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(() => mockOAuth2.getAccessToken()).thenThrow(Exception('oauth err'));
      when(() => mockAuth.getJwtToken()).thenAnswer((_) async => 'fb');

      final c = makeContainer();
      expect(await c.read(jwtProvider.future), 'fb');
    });

    test('null when nothing available', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(() => mockOAuth2.getAccessToken()).thenAnswer((_) async => null);
      when(() => mockAuth.getJwtToken()).thenAnswer((_) async => null);

      final c = makeContainer();
      expect(await c.read(jwtProvider.future), isNull);
    });

    test('null when all return empty', () async {
      when(() => mockAuth.getCurrentUser()).thenAnswer((_) async => null);
      when(() => mockOAuth2.getAccessToken()).thenAnswer((_) async => '');
      when(() => mockAuth.getJwtToken()).thenAnswer((_) async => '');

      final c = makeContainer();
      expect(await c.read(jwtProvider.future), isNull);
    });
  });
}
