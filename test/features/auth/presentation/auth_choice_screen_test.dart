import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:asora/core/analytics/analytics_client.dart';
import 'package:asora/core/analytics/analytics_providers.dart';
import 'package:asora/features/auth/presentation/auth_choice_screen.dart';

void main() {
  testWidgets('auth choice screen renders primary actions', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          analyticsClientProvider.overrideWithValue(
            const NullAnalyticsClient(),
          ),
        ],
        child: const MaterialApp(home: AuthChoiceScreen()),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Welcome to Lythaus'), findsOneWidget);
    expect(find.text('Continue as guest'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Create account'), findsOneWidget);
    expect(find.text('Security Debug'), findsOneWidget);
  });
}
