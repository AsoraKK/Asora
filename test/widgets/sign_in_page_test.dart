import 'package:asora/features/auth/application/auth_controller.dart';
import 'package:asora/features/auth/presentation/sign_in_page.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:asora/services/oauth2_service.dart';

class _DummyService extends OAuth2Service {
  _DummyService()
    : super(dio: Dio(), secureStorage: const FlutterSecureStorage());
}

class _FakeAuthController extends AuthController {
  _FakeAuthController() : super(_DummyService());

  int emailCalls = 0;
  int googleCalls = 0;

  @override
  Future<void> signInEmail() async {
    emailCalls++;
  }

  @override
  Future<void> signInGoogle() async {
    googleCalls++;
  }

  @override
  Future<void> signOut() async {}
}

void main() {
  testWidgets('SignInPage renders buttons and triggers actions', (
    tester,
  ) async {
    final mockController = _FakeAuthController();

    final provider = StateNotifierProvider<AuthController, AuthControllerState>(
      (ref) => mockController,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [authControllerProvider.overrideWithProvider(provider)],
        child: const MaterialApp(home: SignInPage()),
      ),
    );

    // Renders both buttons
    expect(find.text('Continue with Email'), findsOneWidget);
    expect(find.text('Continue with Google'), findsOneWidget);

    // Tap Google
    await tester.tap(find.text('Continue with Google'));
    await tester.pump();

    // Tap Email
    await tester.tap(find.text('Continue with Email'));
    await tester.pump();

    // Verify calls incremented
    expect(mockController.googleCalls, 1);
    expect(mockController.emailCalls, 1);
  });

  testWidgets('Shows loading indicator when isLoading', (tester) async {
    final mockController = _FakeAuthController();
    mockController.state = const AuthControllerState(isLoading: true);

    final provider = StateNotifierProvider<AuthController, AuthControllerState>(
      (ref) => mockController as dynamic,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [authControllerProvider.overrideWithProvider(provider)],
        child: const MaterialApp(home: SignInPage()),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('Shows error banner when error present', (tester) async {
    final mockController = _FakeAuthController();
    mockController.state = const AuthControllerState(error: 'Oops');

    final provider = StateNotifierProvider<AuthController, AuthControllerState>(
      (ref) => mockController as dynamic,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [authControllerProvider.overrideWithProvider(provider)],
        child: const MaterialApp(home: SignInPage()),
      ),
    );

    expect(find.textContaining('Oops'), findsOneWidget);
  });
}
