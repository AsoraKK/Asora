// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/admin/ui/control_panel_shell.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/profile/application/profile_providers.dart';
import 'package:asora/features/profile/domain/public_user.dart';
import 'package:asora/ui/components/tier_badge.dart';
import 'package:asora/ui/theme/spacing.dart';
import 'package:asora/ui/screens/rewards/rewards_dashboard.dart';
import 'package:asora/ui/screens/mod/moderation_hub.dart';
import 'package:asora/ui/screens/profile/settings_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentUser = ref.watch(currentUserProvider);

    if (currentUser == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Profile')),
        body: const Center(
          child: Text('Sign in to view your profile details.'),
        ),
      );
    }

    final profileState = ref.watch(publicUserProvider(currentUser.id));
    return profileState.when(
      data: (profile) => _buildProfile(context, ref, profile),
      loading: () => Scaffold(
        appBar: AppBar(title: const Text('Profile')),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (error, stack) => Scaffold(
        appBar: AppBar(title: const Text('Profile')),
        body: Center(
          child: Text(
            'Unable to load profile: ${error.toString()}',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }

  Scaffold _buildProfile(
    BuildContext context,
    WidgetRef ref,
    PublicUser profile,
  ) {
    return Scaffold(
      appBar: AppBar(
        title: Text(profile.displayName),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(publicUserProvider(profile.id)),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(Spacing.lg),
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 32,
                backgroundImage: profile.avatarUrl != null
                    ? NetworkImage(profile.avatarUrl!)
                    : null,
                child: profile.avatarUrl == null
                    ? Text(
                        profile.displayName.isNotEmpty
                            ? profile.displayName[0]
                            : profile.handleLabel[0],
                      )
                    : null,
              ),
              const SizedBox(width: Spacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile.displayName,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: Spacing.xs),
                    Text(
                      profile.handleLabel,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: Spacing.xs),
                    TierBadge(label: profile.tier, highlight: true),
                  ],
                ),
              ),
            ],
          ),
          if (profile.journalistVerified) ...[
            const SizedBox(height: Spacing.sm),
            const Row(
              children: [
                Icon(Icons.verified, size: 18),
                SizedBox(width: Spacing.xs),
                Text('Journalist verified'),
              ],
            ),
          ],
          if (profile.badges.isNotEmpty) ...[
            const SizedBox(height: Spacing.lg),
            Text('Badges', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: Spacing.xs),
            Wrap(
              spacing: Spacing.xs,
              runSpacing: Spacing.xs,
              children: profile.badges
                  .map((badge) => Chip(label: Text(badge)))
                  .toList(),
            ),
          ],
          const SizedBox(height: Spacing.lg),
          ListTile(
            leading: const Icon(Icons.emoji_events_outlined),
            title: const Text('Reputation'),
            subtitle: Text('${profile.reputationScore} points'),
            trailing: TierBadge(label: profile.tier),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const RewardsDashboardScreen(),
                ),
              );
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.shield_outlined),
            title: const Text('Moderation hub'),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const ModerationHubScreen(),
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.admin_panel_settings_outlined),
            title: const Text('Control Panel'),
            subtitle: const Text('Admin tools & app preview'),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const ControlPanelShell(),
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.settings_outlined),
            title: const Text('Settings'),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const SettingsScreen()),
              );
            },
          ),
        ],
      ),
    );
  }
}
