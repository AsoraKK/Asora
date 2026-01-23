// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/admin/ui/control_panel_shell.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/core/analytics/analytics_events.dart';
import 'package:asora/core/analytics/analytics_providers.dart';
import 'package:asora/features/profile/application/profile_providers.dart';
import 'package:asora/features/profile/application/follow_providers.dart';
import 'package:asora/features/profile/application/follow_service.dart';
import 'package:asora/features/profile/domain/public_user.dart';
import 'package:asora/design_system/components/lyth_button.dart';
import 'package:asora/design_system/components/lyth_snackbar.dart';
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
    final currentUser = ref.read(currentUserProvider);
    if (currentUser != null && currentUser.id == profile.id) {
      _logProfileComplete(ref, profile, currentUser.id);
    }

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
          if (currentUser != null && currentUser.id != profile.id) ...[
            const SizedBox(height: Spacing.lg),
            _FollowSection(
              profileId: profile.id,
              currentUserId: currentUser.id,
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

  void _logProfileComplete(WidgetRef ref, PublicUser profile, String userId) {
    if (!_isProfileComplete(profile)) {
      return;
    }
    Future<void>(() async {
      await ref
          .read(analyticsEventTrackerProvider)
          .logEventOnce(
            ref.read(analyticsClientProvider),
            AnalyticsEvents.profileComplete,
            userId: userId,
          );
    });
  }

  bool _isProfileComplete(PublicUser profile) {
    return profile.displayName.trim().isNotEmpty;
  }
}

class _FollowSection extends ConsumerWidget {
  const _FollowSection({required this.profileId, required this.currentUserId});

  final String profileId;
  final String currentUserId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final followState = ref.watch(followStatusProvider(profileId));

    return followState.when(
      data: (status) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LythButton.secondary(
            label: status.following ? 'Following' : 'Follow',
            icon: status.following ? Icons.check : Icons.person_add,
            onPressed: () => _toggleFollow(context, ref, status),
          ),
          const SizedBox(height: Spacing.xs),
          Text(
            '${status.followerCount} followers',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LythButton.secondary(
            label: 'Follow',
            icon: Icons.person_add,
            onPressed: () => _retryLoad(ref),
          ),
          const SizedBox(height: Spacing.xs),
          Text(
            'Unable to load follow status.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  void _retryLoad(WidgetRef ref) {
    ref.invalidate(followStatusProvider(profileId));
  }

  Future<void> _toggleFollow(
    BuildContext context,
    WidgetRef ref,
    FollowStatus status,
  ) async {
    final token = await ref.read(jwtProvider.future);
    if (token == null || token.isEmpty) {
      LythSnackbar.error(
        context: context,
        message: 'Sign in to follow accounts.',
      );
      return;
    }

    try {
      final service = ref.read(followServiceProvider);
      final updated = status.following
          ? await service.unfollow(targetUserId: profileId, accessToken: token)
          : await service.follow(targetUserId: profileId, accessToken: token);
      ref.invalidate(followStatusProvider(profileId));

      if (!status.following && updated.following) {
        await ref
            .read(analyticsEventTrackerProvider)
            .logEventOnce(
              ref.read(analyticsClientProvider),
              AnalyticsEvents.firstFollow,
              userId: currentUserId,
            );
      }
    } catch (error) {
      LythSnackbar.error(
        context: context,
        message: 'Follow action failed. Try again.',
      );
    }
  }
}
