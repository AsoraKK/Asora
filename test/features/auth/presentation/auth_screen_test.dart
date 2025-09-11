import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asora/features/auth/presentation/auth_screen.dart';
import 'package:asora/features/auth/application/auth_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';

class MockAuthService extends Mock implements AuthService {}

void main() {
  group('AuthScreen Widget Tests', () {
    late MockAuthService mockService;

    setUp(() {
      mockService = MockAuthService();
    });

    Future<void> pumpScreen(WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [authServiceProvider.overrideWithValue(mockService)],
          child: MaterialApp(
            home: Scaffold(body: AuthScreen()),
          ),
        ),
      );
    }

    testWidgets('shows success snackbar on successful login', (tester) async {
      when(mockService.signInWithGoogle()).thenAnswer((_) async {
        await Future.delayed(const Duration(milliseconds: 10));
        return 'token';
      });

      await pumpScreen(tester);
      await tester.tap(find.text('Sign in with Google'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(find.byType(SnackBar), findsOneWidget);
      expect(
          find.textContaining('Logged in successfully', findRichText: true),
          findsOneWidget);
      verify(mockService.signInWithGoogle()).called(1);
    });

    testWidgets('shows error snackbar on AuthFailure', (tester) async {
      when(mockService.signInWithGoogle()).thenAnswer((_) async {
        await Future.delayed(const Duration(milliseconds: 10));
        throw AuthFailure.serverError('failure');
      });

      await pumpScreen(tester);
      await tester.tap(find.text('Sign in with Google'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(find.byType(SnackBar), findsOneWidget);
      expect(
          find.textContaining('failure', findRichText: true), findsOneWidget);
    });

    testWidgets('toggles loading indicator during login', (tester) async {
      final completer = Completer<String>();
      when(mockService.signInWithGoogle()).thenAnswer((_) => completer.future);

      await pumpScreen(tester);
      await tester.tap(find.text('Sign in with Google'));
      await tester.pump();
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      completer.complete('token');
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });
  });
}
