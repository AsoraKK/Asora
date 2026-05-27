// ignore_for_file: public_member_api_docs

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: Reputation Level (0–5) — replaces XP-tier model
// ─────────────────────────────────────────────────────────────────────────────

/// Numeric reputation level. Matches backend `ReputationLevel` enum (0–5).
enum ReputationLevel {
  newUser(0, 'New'),
  verified(1, 'Verified'),
  trusted(2, 'Trusted'),
  established(3, 'Established'),
  credible(4, 'Credible'),
  highlyCredible(5, 'Highly Credible');

  const ReputationLevel(this.value, this.displayName);
  final int value;
  final String displayName;
}

/// Compute a [ReputationLevel] from a raw score using default thresholds.
/// Thresholds: [0, 10, 50, 200, 500, 1000]
ReputationLevel computeLevelFromScore(int rawScore) {
  const thresholds = [0, 10, 50, 200, 500, 1000];
  var level = 0;
  for (var i = 1; i < thresholds.length; i++) {
    if (rawScore >= thresholds[i]) {
      level = i;
    }
  }
  return ReputationLevel.values.firstWhere(
    (l) => l.value == level,
    orElse: () => ReputationLevel.newUser,
  );
}

/// Display-friendly level name (same as [ReputationLevel.displayName]).
String levelDisplayName(ReputationLevel level) => level.displayName;

// ─────────────────────────────────────────────────────────────────────────────
// Ledger Entry (user-visible, internal fields stripped)
// ─────────────────────────────────────────────────────────────────────────────

class LedgerEntry {
  const LedgerEntry({
    required this.id,
    required this.userId,
    required this.eventType,
    required this.eventCategory,
    required this.pillar,
    required this.publicLabel,
    required this.impactBand,
    required this.visibility,
    required this.appealable,
    required this.status,
    required this.createdAt,
    this.relatedContentId,
    this.relatedModerationDecisionId,
    this.appealStatus,
    this.decaysAt,
  });

  final String id;
  final String userId;
  final String eventType;
  final String eventCategory;
  final String pillar;
  final String publicLabel;
  final String impactBand;
  final String visibility;
  final bool appealable;
  final String status;
  final DateTime createdAt;
  final String? relatedContentId;
  final String? relatedModerationDecisionId;
  final String? appealStatus;
  final DateTime? decaysAt;

  factory LedgerEntry.fromJson(Map<String, dynamic> json) {
    return LedgerEntry(
      id: json['id'] as String,
      userId: json['userId'] as String,
      eventType: json['eventType'] as String,
      eventCategory: json['eventCategory'] as String,
      pillar: json['pillar'] as String,
      publicLabel: json['publicLabel'] as String,
      impactBand: json['impactBand'] as String,
      visibility: json['visibility'] as String,
      appealable: json['appealable'] as bool? ?? false,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      relatedContentId: json['relatedContentId'] as String?,
      relatedModerationDecisionId:
          json['relatedModerationDecisionId'] as String?,
      appealStatus: json['appealStatus'] as String?,
      decaysAt: json['decaysAt'] != null
          ? DateTime.parse(json['decaysAt'] as String)
          : null,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UserReputation (updated to include level-based model alongside legacy fields)
// ─────────────────────────────────────────────────────────────────────────────

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

  /// Phase 1: computed reputation level (0–5).
  final ReputationLevel reputationLevel;

  /// Phase 1: human-readable band / status string.
  final String reputationBand;

  const UserReputation({
    required this.xp,
    required this.tier,
    this.missions = const [],
    this.recentAchievements = const [],
    this.reputationLevel = ReputationLevel.newUser,
    this.reputationBand = 'New',
  });

  UserReputation copyWith({
    int? xp,
    ReputationTier? tier,
    List<Mission>? missions,
    List<String>? recentAchievements,
    ReputationLevel? reputationLevel,
    String? reputationBand,
  }) {
    return UserReputation(
      xp: xp ?? this.xp,
      tier: tier ?? this.tier,
      missions: missions ?? this.missions,
      recentAchievements: recentAchievements ?? this.recentAchievements,
      reputationLevel: reputationLevel ?? this.reputationLevel,
      reputationBand: reputationBand ?? this.reputationBand,
    );
  }
}
