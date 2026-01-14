// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';

import 'package:asora/ui/theme/spacing.dart';

class OnboardingIntroScreen extends StatelessWidget {
  const OnboardingIntroScreen({super.key, this.onContinue});

  final VoidCallback? onContinue;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(Spacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Spacer(),
            Text(
              'Welcome to Asora',
              style: Theme.of(
                context,
              ).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: Spacing.sm),
            Text(
              'The authentic social network. Curated feeds, credible voices, '
              'and calm interactions.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const Spacer(),
            FilledButton(
              onPressed: onContinue ?? () => Navigator.of(context).maybePop(),
              child: const Text('Continue'),
            ),
            const SizedBox(height: Spacing.md),
          ],
        ),
      ),
    );
  }
}
