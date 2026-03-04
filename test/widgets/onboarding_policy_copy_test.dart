import 'package:asora/screens/lock_screen.dart';
import 'package:asora/ui/screens/onboarding/onboarding_intro.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const policyLines = [
    'AI-generated content is blocked at publish time.',
    "If content is blocked, you'll see a neutral notice.",
    'You can appeal decisions. Appeals are reviewed by the community and moderators.',
    'This is an invite-only beta focused on authentic human content.',
  ];

  testWidgets('onboarding intro shows moderation policy copy', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: OnboardingIntroScreen()));

    for (final line in policyLines) {
      expect(find.text(line), findsOneWidget);
    }
  });

  testWidgets('first post lock screen shows moderation policy copy', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: FirstPostLockScreen())),
    );

    for (final line in policyLines) {
      expect(find.text(line), findsOneWidget);
    }
  });
}
