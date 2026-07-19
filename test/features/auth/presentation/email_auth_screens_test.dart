import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/auth_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/features/auth/presentation/email_auth_screen.dart';
import 'package:asora/features/auth/presentation/email_token_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthService extends Mock implements AuthService {}

class _MockAuthStateNotifier extends StateNotifier<AsyncValue<User?>>
    with Mock
    implements AuthStateNotifier {
  _MockAuthStateNotifier() : super(const AsyncValue.data(null));
}

Future<void> _pump(
  WidgetTester tester,
  Widget child, {
  required AuthService service,
  AuthStateNotifier? notifier,
}) async {
  await tester.binding.setSurfaceSize(const Size(500, 900));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        enhancedAuthServiceProvider.overrideWithValue(service),
        if (notifier != null) authStateProvider.overrideWith((ref) => notifier),
      ],
      child: MaterialApp(home: child),
    ),
  );
  await tester.pump();
}

void main() {
  group('EmailAuthScreen', () {
    testWidgets('registers and renders the neutral verification message', (
      tester,
    ) async {
      final service = _MockAuthService();
      final notifier = _MockAuthStateNotifier();
      when(
        () => service.registerWithEmail('person@example.com', 'StrongPass!123'),
      ).thenAnswer((_) async {});

      await _pump(
        tester,
        const EmailAuthScreen(initialMode: EmailAuthMode.register),
        service: service,
        notifier: notifier,
      );
      expect(find.text('Create an email account'), findsNWidgets(2));
      expect(
        find.text('Use at least 12 characters and three character types.'),
        findsOneWidget,
      );

      await tester.enterText(
        find.byKey(const Key('email-auth-email')),
        ' person@example.com ',
      );
      await tester.enterText(
        find.byKey(const Key('email-auth-password')),
        'StrongPass!123',
      );
      await tester.tap(
        find.widgetWithText(FilledButton, 'Create an email account'),
      );
      await tester.pumpAndSettle();

      verify(
        () => service.registerWithEmail('person@example.com', 'StrongPass!123'),
      ).called(1);
      expect(
        find.text('Check your email to verify your account.'),
        findsOneWidget,
      );

      when(
        () => service.resendEmailVerification('person@example.com'),
      ).thenAnswer((_) async {});
      await tester.tap(find.byKey(const Key('email-auth-resend-verification')));
      await tester.pumpAndSettle();

      verify(
        () => service.resendEmailVerification('person@example.com'),
      ).called(1);
      expect(
        find.text(
          'If the address is eligible, a verification email will be sent.',
        ),
        findsOneWidget,
      );
    });

    testWidgets('shows controlled AuthFailure and generic errors', (
      tester,
    ) async {
      final service = _MockAuthService();
      final notifier = _MockAuthStateNotifier();
      when(
        () => service.registerWithEmail(any(), any()),
      ).thenThrow(AuthFailure.invalidCredentials('Choose a stronger password'));

      await _pump(
        tester,
        const EmailAuthScreen(initialMode: EmailAuthMode.register),
        service: service,
        notifier: notifier,
      );
      await tester.enterText(
        find.byKey(const Key('email-auth-email')),
        'person@example.com',
      );
      await tester.enterText(
        find.byKey(const Key('email-auth-password')),
        'weak',
      );
      await tester.tap(
        find.widgetWithText(FilledButton, 'Create an email account'),
      );
      await tester.pumpAndSettle();
      expect(find.text('Choose a stronger password'), findsOneWidget);

      when(
        () => service.registerWithEmail(any(), any()),
      ).thenThrow(StateError('redacted'));
      await tester.tap(
        find.widgetWithText(FilledButton, 'Create an email account'),
      );
      await tester.pumpAndSettle();
      expect(
        find.text('The request could not be completed. Please try again.'),
        findsOneWidget,
      );
    });

    testWidgets(
      'requests reset with a neutral response and returns to sign in',
      (tester) async {
        final service = _MockAuthService();
        final notifier = _MockAuthStateNotifier();
        when(
          () => service.requestPasswordReset('person@example.com'),
        ).thenAnswer((_) async {});

        await _pump(
          tester,
          const EmailAuthScreen(),
          service: service,
          notifier: notifier,
        );
        await tester.tap(find.text('Forgot password?'));
        await tester.pumpAndSettle();
        expect(find.text('Reset your password'), findsNWidgets(2));
        expect(find.byKey(const Key('email-auth-password')), findsNothing);

        await tester.enterText(
          find.byKey(const Key('email-auth-email')),
          ' person@example.com ',
        );
        await tester.tap(
          find.widgetWithText(FilledButton, 'Reset your password'),
        );
        await tester.pumpAndSettle();
        verify(
          () => service.requestPasswordReset('person@example.com'),
        ).called(1);
        expect(
          find.text('If the account exists, a reset email will be sent.'),
          findsOneWidget,
        );

        await tester.tap(find.text('Back to sign in'));
        await tester.pumpAndSettle();
        expect(find.text('Sign in with email'), findsNWidgets(2));
      },
    );

    testWidgets('delegates email sign-in and handles notifier completion', (
      tester,
    ) async {
      final service = _MockAuthService();
      final notifier = _MockAuthStateNotifier();
      when(
        () => notifier.signInWithEmail('person@example.com', 'StrongPass!123'),
      ).thenAnswer((_) async {});

      await _pump(
        tester,
        const EmailAuthScreen(),
        service: service,
        notifier: notifier,
      );
      await tester.enterText(
        find.byKey(const Key('email-auth-email')),
        'person@example.com',
      );
      await tester.enterText(
        find.byKey(const Key('email-auth-password')),
        'StrongPass!123',
      );
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();

      verify(
        () => notifier.signInWithEmail('person@example.com', 'StrongPass!123'),
      ).called(1);
    });

    testWidgets('switches from sign in to registration', (tester) async {
      final service = _MockAuthService();
      final notifier = _MockAuthStateNotifier();
      await _pump(
        tester,
        const EmailAuthScreen(),
        service: service,
        notifier: notifier,
      );

      await tester.tap(find.text('Create account'));
      await tester.pumpAndSettle();
      expect(find.text('Create an email account'), findsNWidgets(2));
      expect(find.text('Back to sign in'), findsOneWidget);
    });
  });

  group('Email token screens', () {
    testWidgets('verification reports success', (tester) async {
      final service = _MockAuthService();
      when(
        () => service.verifyEmailToken('verification-token'),
      ).thenAnswer((_) async {});

      await _pump(
        tester,
        const EmailVerificationScreen(token: 'verification-token'),
        service: service,
      );
      await tester.pumpAndSettle();
      verify(() => service.verifyEmailToken('verification-token')).called(1);
      expect(find.text('Email verified. You can now sign in.'), findsOneWidget);
    });

    testWidgets('verification reports invalid or expired tokens neutrally', (
      tester,
    ) async {
      final service = _MockAuthService();
      when(
        () => service.verifyEmailToken('invalid-token'),
      ).thenAnswer((_) => Future<void>.error(AuthFailure.invalidCredentials()));

      await _pump(
        tester,
        const EmailVerificationScreen(token: 'invalid-token'),
        service: service,
      );
      await tester.pumpAndSettle();
      expect(
        find.text('This verification link is invalid or expired.'),
        findsOneWidget,
      );
    });

    testWidgets('password reset reports success', (tester) async {
      final service = _MockAuthService();
      when(
        () => service.resetEmailPassword('reset-token', 'NewStrongPass!123'),
      ).thenAnswer((_) async {});

      await _pump(
        tester,
        const PasswordResetScreen(token: 'reset-token'),
        service: service,
      );
      await tester.enterText(
        find.byKey(const Key('reset-password')),
        'NewStrongPass!123',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Reset password'));
      await tester.pumpAndSettle();

      verify(
        () => service.resetEmailPassword('reset-token', 'NewStrongPass!123'),
      ).called(1);
      expect(find.text('Password reset. You can now sign in.'), findsOneWidget);
    });

    testWidgets('password reset reports invalid or expired tokens neutrally', (
      tester,
    ) async {
      final service = _MockAuthService();
      when(
        () => service.resetEmailPassword('invalid-token', any()),
      ).thenThrow(AuthFailure.invalidCredentials());

      await _pump(
        tester,
        const PasswordResetScreen(token: 'invalid-token'),
        service: service,
      );
      await tester.enterText(
        find.byKey(const Key('reset-password')),
        'NewStrongPass!123',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Reset password'));
      await tester.pumpAndSettle();

      expect(
        find.text('This reset link is invalid or expired.'),
        findsOneWidget,
      );
    });
  });
}
