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
      find.text('Choose one of the secure MVP sign-in methods.'),
      findsOneWidget,
    );
    expect(find.text('Continue as guest'), findsNothing);
    expect(find.text('Continue with Google'), findsOneWidget);
    expect(find.text('Continue with email'), findsOneWidget);
    expect(find.text('Redeem invite'), findsNothing);
    // Debug mode button
    expect(find.text('Security Debug'), findsOneWidget);
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

    await tester.tap(find.text('Continue with email'));
    await tester.pumpAndSettle();

    expect(find.text('Sign in with email'), findsNWidgets(2));
    expect(find.text('Create account'), findsOneWidget);
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
