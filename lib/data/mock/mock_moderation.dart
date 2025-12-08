import '../../state/models/moderation.dart';

final List<ModerationCase> mockModerationQueue = [
  ModerationCase(
    id: 'mc1',
    anonymizedContent:
        '“Breaking: local spill at waterfront, source unverified.”',
    reason: 'Credibility check',
    aiConfidence: 0.74,
    decision: ModerationDecision.pending,
    submittedAt: DateTime(2024, 11, 18, 9, 30),
    xpReward: 12,
  ),
  ModerationCase(
    id: 'mc2',
    anonymizedContent: '“Live stream link” + short url',
    reason: 'Possible scam',
    aiConfidence: 0.63,
    decision: ModerationDecision.pending,
    submittedAt: DateTime(2024, 11, 18, 8, 45),
    xpReward: 15,
  ),
  ModerationCase(
    id: 'mc3',
    anonymizedContent: 'Image: protest crowd with timestamp overlay',
    reason: 'Context needed',
    aiConfidence: 0.51,
    decision: ModerationDecision.pending,
    submittedAt: DateTime(2024, 11, 18, 7, 20),
    xpReward: 10,
  ),
];

const List<AppealCase> mockAppeals = [
  AppealCase(
    id: 'ap1',
    authorStatement:
        'I posted footage from my camera; metadata shows the correct time.',
    evidence: 'Video hash and location metadata attached.',
    votesFor: 26,
    votesAgainst: 4,
    weightFor: 0.72,
    weightAgainst: 0.28,
    decision: ModerationDecision.pending,
  ),
  AppealCase(
    id: 'ap2',
    authorStatement: 'My comment quoted an official memo, not opinion.',
    evidence: 'Link to memo and screenshot.',
    votesFor: 14,
    votesAgainst: 11,
    weightFor: 0.55,
    weightAgainst: 0.45,
    decision: ModerationDecision.pending,
  ),
];

const ModerationStats mockModerationStats = ModerationStats(
  queueSize: 18,
  appealOpen: 5,
  decisionsToday: 42,
);
