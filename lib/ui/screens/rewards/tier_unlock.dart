// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/state/models/reputation.dart';
import 'package:asora/ui/components/tier_badge.dart';
import 'package:asora/ui/theme/spacing.dart';

class TierUnlockScreen extends ConsumerWidget {
  const TierUnlockScreen({super.key, required this.tier});

  final ReputationTier tier;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tier unlocked')),
      body: Padding(
        padding: const EdgeInsets.all(Spacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0.8, end: 1.0),
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOutBack,
                builder: (context, value, child) {
                  return Transform.scale(scale: value, child: child);
                },
                child: Column(
                  children: [
                    const Icon(Icons.celebration, size: 64),
                    const SizedBox(height: Spacing.sm),
                    TierBadge(label: tier.name, highlight: true),
                    const SizedBox(height: Spacing.xs),
                    Text(
                      'Min XP: ${tier.minXP}',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: Spacing.lg),
            Text(
              'New privileges',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: Spacing.sm),
            ...tier.privileges.map(
              (p) => ListTile(
                leading: const Icon(Icons.check_circle_outline),
                title: Text(p),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
