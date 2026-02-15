import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:asora/core/analytics/analytics_client.dart';
import 'package:asora/core/analytics/analytics_providers.dart';
import 'package:asora/features/auth/presentation/auth_choice_screen.dart';

class _MockAnalytics extends Mock implements AnalyticsClient {}

void main() {
  late _MockAnalytics mockAnalytics;

  setUp(() {
    mockAnalytics = _MockAnalytics();
    when(
      () => mockAnalytics.logEvent(any(), properties: any(named: 'properties')),
    ).thenAnswer((_) async {});
  });

  Widget buildScreen({List<Override> overrides = const []}) {
    return ProviderScope(
      overrides: [
        analyticsClientProvider.overrideWithValue(mockAnalytics),
        ...overrides,
      ],
      child: const MaterialApp(home: AuthChoiceScreen()),
    );
  }

  testWidgets('renders welcome text and all buttons', (tester) async {
    tester.view.physicalSize = const Size(1200, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(buildScreen());
    await tester.pump();

    expect(find.text('Welcome to Lythaus'), findsOneWidget);
    expect(
      find.text('Browse the feed as a guest or sign in to interact.'),
      findsOneWidget,
    );
    expect(find.text('Continue as guest'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Create account'), findsOneWidget);
    expect(find.text('Redeem invite'), findsOneWidget);
    // Debug mode button
    expect(find.text('Security Debug'), findsOneWidget);
  });

  testWidgets('guest continue calls signOut', (tester) async {
    tester.view.physicalSize = const Size(1200, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(buildScreen());
    await tester.pump();

    await tester.tap(find.text('Continue as guest'));
    await tester.pump();

    verify(
      () => mockAnalytics.logEvent(any(), properties: any(named: 'properties')),
    ).called(greaterThanOrEqualTo(1));
  });

  testWidgets('sign in shows provider picker', (tester) async {
    tester.view.physicalSize = const Size(1200, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(buildScreen());
    await tester.pump();

    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    // Bottom sheet should show provider options
    expect(find.text('Sign in with'), findsOneWidget);
    expect(find.text('Google'), findsOneWidget);
    expect(find.text('Apple'), findsOneWidget);
    expect(find.text('World ID'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
  });

  testWidgets('create account shows provider picker', (tester) async {
    tester.view.physicalSize = const Size(1200, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(buildScreen());
    await tester.pump();

    await tester.tap(find.text('Create account'));
    await tester.pumpAndSettle();

    expect(find.text('Create account with'), findsOneWidget);
    expect(find.text('Google'), findsOneWidget);
  });

  testWidgets('redeem invite navigates', (tester) async {
    tester.view.physicalSize = const Size(1200, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(buildScreen());
    await tester.pump();

    await tester.tap(find.text('Redeem invite'));
    await tester.pumpAndSettle();

    // Should have navigated away
    expect(find.text('Welcome to Lythaus'), findsNothing);
  });

  testWidgets('logs screen view on init', (tester) async {
    tester.view.physicalSize = const Size(1200, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(buildScreen());
    await tester.pumpAndSettle();

    verify(
      () => mockAnalytics.logEvent(any(), properties: any(named: 'properties')),
    ).called(greaterThanOrEqualTo(1));
  });
}
