// ignore_for_file: public_member_api_docs

class ReputationTier {
  final String id;
  final String name;
  final int minXP;
  final List<String> privileges;

  const ReputationTier({
    required this.id,
    required this.name,
    required this.minXP,
    required this.privileges,
  });
}

class Mission {
  final String id;
  final String title;
  final int xpReward;
  final bool completed;

  const Mission({
    required this.id,
    required this.title,
    required this.xpReward,
    this.completed = false,
  });
}

class UserReputation {
  final int xp;
  final ReputationTier tier;
  final List<Mission> missions;
  final List<String> recentAchievements;

  const UserReputation({
    required this.xp,
    required this.tier,
    this.missions = const [],
    this.recentAchievements = const [],
  });

  UserReputation copyWith({
    int? xp,
    ReputationTier? tier,
    List<Mission>? missions,
    List<String>? recentAchievements,
  }) {
    return UserReputation(
      xp: xp ?? this.xp,
      tier: tier ?? this.tier,
      missions: missions ?? this.missions,
      recentAchievements: recentAchievements ?? this.recentAchievements,
    );
  }
}
