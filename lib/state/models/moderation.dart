enum ModerationDecision { pending, approved, rejected }

class ModerationCase {
  final String id;
  final String anonymizedContent;
  final String reason;
  final double aiConfidence;
  final ModerationDecision decision;
  final DateTime submittedAt;
  final int xpReward;

  const ModerationCase({
    required this.id,
    required this.anonymizedContent,
    required this.reason,
    required this.aiConfidence,
    required this.decision,
    required this.submittedAt,
    this.xpReward = 0,
  });
}

class AppealCase {
  final String id;
  final String authorStatement;
  final String evidence;
  final int votesFor;
  final int votesAgainst;
  final double weightFor;
  final double weightAgainst;
  final ModerationDecision decision;

  const AppealCase({
    required this.id,
    required this.authorStatement,
    required this.evidence,
    required this.votesFor,
    required this.votesAgainst,
    required this.weightFor,
    required this.weightAgainst,
    required this.decision,
  });
}

class ModerationStats {
  final int queueSize;
  final int appealOpen;
  final int decisionsToday;

  const ModerationStats({
    required this.queueSize,
    required this.appealOpen,
    required this.decisionsToday,
  });
}
