// ignore_for_file: public_member_api_docs

import 'package:asora/state/models/reputation.dart';

const List<ReputationTier> mockReputationTiers = [
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
