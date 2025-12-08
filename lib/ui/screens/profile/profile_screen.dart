import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../state/providers/reputation_providers.dart';
import '../../components/tier_badge.dart';
import '../../theme/spacing.dart';
import '../rewards/rewards_dashboard.dart';
import '../mod/moderation_hub.dart';
import 'settings_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reputation = ref.watch(reputationProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(Spacing.lg),
        children: [
          Row(
            children: [
              const CircleAvatar(radius: 28, child: Text('A')),
              const SizedBox(width: Spacing.md),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Asora Member',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  TierBadge(label: reputation.tier.name, highlight: true),
                ],
              ),
            ],
          ),
          const SizedBox(height: Spacing.lg),
          ListTile(
            leading: const Icon(Icons.emoji_events_outlined),
            title: const Text('Rewards & XP'),
            subtitle: Text('${reputation.xp} XP'),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const RewardsDashboardScreen(),
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.shield_outlined),
            title: const Text('Moderation hub'),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ModerationHubScreen()),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.settings_outlined),
            title: const Text('Settings'),
            onTap: () {
              Navigator.of(
                context,
              ).push(MaterialPageRoute(builder: (_) => const SettingsScreen()));
            },
          ),
        ],
      ),
    );
  }
}
