import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/auth/presentation/auth_screen.dart';
import 'package:asora/features/auth/application/auth_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';

class _FakeAuthService extends AuthService {
  bool shouldThrow = false;
  String token = 'token';

  @override
  Future<String> signInWithGoogle() async {
    if (shouldThrow) throw AuthFailure.serverError('Oops');
    return token;
  }
}

void main() {
  testWidgets('shows button and success snackbar on sign-in', (tester) async {
    final fake = _FakeAuthService();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [authServiceProvider.overrideWithValue(fake)],
        child: const MaterialApp(home: AuthScreen()),
      ),
    );

    expect(find.text('Sign in with Google'), findsOneWidget);
    await tester.tap(find.text('Sign in with Google'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Logged in successfully'), findsOneWidget);
  });

  testWidgets('shows error snackbar on failure', (tester) async {
    final fake = _FakeAuthService()..shouldThrow = true;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [authServiceProvider.overrideWithValue(fake)],
        child: const MaterialApp(home: AuthScreen()),
      ),
    );

    await tester.tap(find.text('Sign in with Google'));
    await tester.pumpAndSettle();
    expect(find.text('Oops'), findsOneWidget);
  });
}
