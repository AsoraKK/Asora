// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/state/models/reputation.dart';
import 'package:asora/state/providers/reputation_providers.dart';
import 'package:asora/ui/components/tier_badge.dart';
import 'package:asora/ui/components/xp_progress_ring.dart';
import 'package:asora/ui/theme/spacing.dart';

class RewardsDashboardScreen extends ConsumerWidget {
  const RewardsDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reputation = ref.watch(reputationProvider);
    final tiers = ref.watch(reputationTiersProvider);
    final nextTier = tiers
        .where((tier) => tier.minXP > reputation.xp)
        .fold<ReputationTier?>(null, (prev, tier) {
          if (prev == null) return tier;
          return tier.minXP < prev.minXP ? tier : prev;
        });
    final progress = nextTier == null
        ? 1.0
        : (reputation.xp / nextTier.minXP).clamp(0.0, 1.0).toDouble();

    return Scaffold(
      appBar: AppBar(title: const Text('Rewards & XP')),
      body: ListView(
        padding: const EdgeInsets.all(Spacing.lg),
        children: [
          Center(
            child: XPProgressRing(
              progress: progress,
              tierLabel: reputation.tier.name,
            ),
          ),
          const SizedBox(height: Spacing.lg),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Missions',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              Text('${reputation.xp} XP'),
            ],
          ),
          const SizedBox(height: Spacing.sm),
          ...reputation.missions.map(
            (mission) => ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                mission.completed
                    ? Icons.check_circle
                    : Icons.timelapse_outlined,
              ),
              title: Text(mission.title),
              trailing: Text('+${mission.xpReward} XP'),
            ),
          ),
          const SizedBox(height: Spacing.lg),
          Text(
            'Upcoming rewards',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: Spacing.sm),
          if (nextTier != null) _tierTile(nextTier),
          const SizedBox(height: Spacing.lg),
          Text(
            'History',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: Spacing.sm),
          ...reputation.recentAchievements.map(
            (item) => ListTile(title: Text(item)),
          ),
        ],
      ),
    );
  }

  Widget _tierTile(ReputationTier tier) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Spacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TierBadge(label: tier.name, highlight: true),
            const SizedBox(height: Spacing.xs),
            ...tier.privileges.map(
              (p) => Padding(
                padding: const EdgeInsets.only(bottom: Spacing.xxs),
                child: Row(
                  children: [
                    const Icon(Icons.check, size: 16),
                    const SizedBox(width: Spacing.xs),
                    Expanded(child: Text(p)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
