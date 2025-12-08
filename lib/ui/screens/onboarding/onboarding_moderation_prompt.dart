import 'package:flutter/material.dart';

import '../../components/moderation_card.dart';
import '../../theme/spacing.dart';
import '../mod/moderation_case.dart';
import '../../../state/models/moderation.dart';

class OnboardingModerationPrompt extends StatelessWidget {
  const OnboardingModerationPrompt({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Community moderation')),
      body: Padding(
        padding: const EdgeInsets.all(Spacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Earn XP reviewing cases',
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: Spacing.sm),
            Text(
              'Help validate flagged content. Decisions are weighted by '
              'reputation and expertise.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: Spacing.lg),
            ModerationCard(
              caseItem: ModerationCase(
                id: 'preview',
                anonymizedContent:
                    'Example: “Source claims outage at data center.”',
                reason: 'Credibility review',
                aiConfidence: 0.68,
                decision: ModerationDecision.pending,
                submittedAt: DateTime(2024, 11, 18, 10, 0),
                xpReward: 12,
              ),
            ),
            const Spacer(),
            FilledButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const ModerationCaseScreen(),
                  ),
                );
              },
              child: const Text('Open moderation hub'),
            ),
          ],
        ),
      ),
    );
  }
}
