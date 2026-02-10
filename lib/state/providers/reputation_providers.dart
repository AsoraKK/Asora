// ignore_for_file: public_member_api_docs

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/services/service_providers.dart';
import 'package:asora/services/subscription/subscription_service.dart';
import 'package:asora/state/models/reputation.dart';

const List<ReputationTier> _lythausReputationTiers = [
  ReputationTier(
    id: 'free',
    name: 'Free',
    minXP: 0,
    privileges: [
      'Discovery + News feeds',
      '1 custom feed with personalized filters',
      '1 reputation reward available',
    ],
  ),
  ReputationTier(
    id: 'premium',
    name: 'Premium',
    minXP: 1200,
    privileges: [
      'Discovery + News feeds',
      '2 custom feeds with personalized filters',
      '5 reputation rewards available',
    ],
  ),
  ReputationTier(
    id: 'black',
    name: 'Black',
    minXP: 3200,
    privileges: [
      'Discovery + News feeds',
      '5 custom feeds with personalized filters',
      'All reputation rewards',
    ],
  ),
];

final reputationProvider = FutureProvider<UserReputation>((ref) async {
  final user = ref.watch(currentUserProvider);
  final token = await ref.watch(jwtProvider.future);

  SubscriptionStatus? status;
  if (token != null && token.isNotEmpty) {
    try {
      status = await ref
          .read(subscriptionServiceProvider)
          .checkStatus(token: token);
    } catch (_) {
      status = null;
    }
  }

  final tierId = _resolveTierId(status?.tier, user);
  final tier = _lythausReputationTiers.firstWhere(
    (candidate) => candidate.id == tierId,
    orElse: () => _lythausReputationTiers.first,
  );

  return UserReputation(
    xp: user?.reputationScore ?? 0,
    tier: tier,
    missions: _buildEntitlementMissions(status?.entitlements),
    recentAchievements: _buildRecentAchievements(status, tier),
  );
});

final reputationTiersProvider = Provider<List<ReputationTier>>(
  (ref) => _lythausReputationTiers,
);

String _resolveTierId(String? subscriptionTier, User? user) {
  final normalized = (subscriptionTier ?? '').toLowerCase().trim();
  if (normalized == 'free' ||
      normalized == 'premium' ||
      normalized == 'black') {
    return normalized;
  }

  if (user == null) {
    return 'free';
  }

  switch (user.tier) {
    case UserTier.bronze:
      return 'free';
    case UserTier.silver:
      return 'premium';
    case UserTier.gold:
      return 'premium';
    case UserTier.platinum:
      return 'black';
  }
}

List<Mission> _buildEntitlementMissions(
  SubscriptionEntitlements? entitlements,
) {
  if (entitlements == null) {
    return const [];
  }

  return [
    Mission(
      id: 'entitlement_daily_posts',
      title: 'Daily post limit: ${entitlements.dailyPosts}',
      xpReward: 0,
      completed: true,
    ),
    Mission(
      id: 'entitlement_media_per_post',
      title: 'Media attachments per post: ${entitlements.maxMediaPerPost}',
      xpReward: 0,
      completed: true,
    ),
    Mission(
      id: 'entitlement_media_size',
      title: 'Max media size: ${entitlements.maxMediaSizeMB} MB',
      xpReward: 0,
      completed: true,
    ),
  ];
}

List<String> _buildRecentAchievements(
  SubscriptionStatus? status,
  ReputationTier tier,
) {
  final achievements = <String>['Tier active: ${tier.name}'];

  if (status?.isPaid == true) {
    achievements.add('Paid tier entitlements active');
  }
  if (status?.isExpiring == true && status?.currentPeriodEnd != null) {
    achievements.add(
      'Renews through ${status!.currentPeriodEnd!.toLocal().toIso8601String().split('T').first}',
    );
  }

  return achievements;
}
