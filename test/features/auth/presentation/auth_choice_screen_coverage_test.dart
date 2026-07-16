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
      find.text(
        'Browse as a guest or use one of the secure MVP sign-in methods.',
      ),
      findsOneWidget,
    );
    expect(find.text('Continue as guest'), findsOneWidget);
    expect(find.text('Google'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
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

  testWidgets('deferred providers are not rendered', (tester) async {
    tester.view.physicalSize = const Size(1200, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(buildScreen());
    await tester.pump();

    expect(find.textContaining('Apple'), findsNothing);
    expect(find.textContaining('World ID'), findsNothing);
  });

  testWidgets('email action opens email authentication', (tester) async {
    tester.view.physicalSize = const Size(1200, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(buildScreen());
    await tester.pump();

    await tester.tap(find.text('Email'));
    await tester.pumpAndSettle();

    expect(find.text('Sign in with email'), findsNWidgets(2));
    expect(find.text('Create account'), findsOneWidget);
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
