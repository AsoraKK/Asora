import '../../state/models/reputation.dart';

const List<ReputationTier> mockReputationTiers = [
  ReputationTier(
    id: 'free',
    name: 'Free',
    minXP: 0,
    privileges: ['1 custom feed', 'Community voting'],
  ),
  ReputationTier(
    id: 'premium',
    name: 'Premium',
    minXP: 1200,
    privileges: ['3 custom feeds', 'Priority support', 'Early features'],
  ),
  ReputationTier(
    id: 'black',
    name: 'Black',
    minXP: 3200,
    privileges: [
      '10 custom feeds',
      'Pro newsroom tools',
      'Advanced moderation panel',
    ],
  ),
];

const List<Mission> mockMissions = [
  Mission(id: 'm1', title: 'Review 3 appeals', xpReward: 40),
  Mission(id: 'm2', title: 'Post one verified update', xpReward: 25),
  Mission(id: 'm3', title: 'Tag 5 trusted sources', xpReward: 15),
];

final UserReputation mockReputation = UserReputation(
  xp: 780,
  tier: mockReputationTiers.first,
  missions: mockMissions,
  recentAchievements: const ['Streak: 7 days', 'Appeal accuracy 92%'],
);
