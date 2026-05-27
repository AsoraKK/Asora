/**
 * Reputation System — Core Types
 *
 * Shared type definitions for the Lythaus Reputation, Rewards &
 * Public Feed Eligibility System v1.
 *
 * Design constraints:
 *   - `ReputationLevel` is a plain enum (0–5). Editorial is a separate
 *     `ReputationStatus` type, not a numeric level.
 *   - Raw score deltas are NEVER returned to API clients; only `reputationLevel`,
 *     `reputationBand`, and `impactBand` are exposed externally.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Numeric reputation level (0–5).
 * Do NOT add Editorial here — use ReputationStatus instead.
 */
export enum ReputationLevel {
  New = 0,
  Verified = 1,
  Trusted = 2,
  Established = 3,
  Credible = 4,
  HighlyCredible = 5,
}

/**
 * Editorial is a separate merit/status layer granted by the Editorial team.
 * It is not a numeric score level and backend scoring never assigns it.
 */
export type ReputationStatus = 'standard' | 'editorial';

/**
 * The 6 scoring pillars that make up a user's reputation profile.
 */
export type ReputationPillar =
  | 'human_contribution'
  | 'content_quality'
  | 'behaviour_trust'
  | 'interaction_quality'
  | 'verification_strength'
  | 'community_trust';

/**
 * Qualitative band describing the direction and magnitude of a reputation event.
 * Exposed to clients instead of raw numeric deltas.
 */
export type ReputationImpactBand =
  | 'neutral'
  | 'small_positive'
  | 'medium_positive'
  | 'large_positive'
  | 'small_negative'
  | 'medium_negative'
  | 'large_negative'
  | 'severe_negative';

/**
 * Event codes matching spec §11.3. Each code maps to a default event config
 * in `reputationEventService.REPUTATION_EVENTS`.
 */
export enum LedgerEventType {
  // Positive — human contribution
  HUMAN_TEXT_250_PLUS = 'HUMAN_TEXT_250_PLUS',
  WELL_SOURCED_POST = 'WELL_SOURCED_POST',
  HELPFUL_REPLY = 'HELPFUL_REPLY',

  // Positive — verification
  VERIFIED_EMAIL = 'VERIFIED_EMAIL',
  WORLD_ID_VERIFIED = 'WORLD_ID_VERIFIED',

  // Neutral / informational
  AI_ASSISTED_DISCLOSURE = 'AI_ASSISTED_DISCLOSURE',
  AI_GENERATED_TEXT = 'AI_GENERATED_TEXT',

  // Negative — AI policy
  UNDISCLOSED_AI_TEXT = 'UNDISCLOSED_AI_TEXT',
  AI_MEDIA_ATTEMPT = 'AI_MEDIA_ATTEMPT',

  // Negative — moderation
  MODERATION_VIOLATION = 'MODERATION_VIOLATION',
  MODERATION_VIOLATION_SPAM = 'MODERATION_VIOLATION_SPAM',
  MODERATION_VIOLATION_HARASSMENT = 'MODERATION_VIOLATION_HARASSMENT',
  MODERATION_VIOLATION_HATE_SPEECH = 'MODERATION_VIOLATION_HATE_SPEECH',
  MODERATION_VIOLATION_VIOLENCE = 'MODERATION_VIOLATION_VIOLENCE',

  // Reversal
  APPEAL_RESTORED = 'APPEAL_RESTORED',

  // System
  DECAY_EXPIRED = 'DECAY_EXPIRED',

  // Phase 2 — reactions received (target user reputation)
  REACTION_RECEIVED_HELPFUL      = 'REACTION_RECEIVED_HELPFUL',
  REACTION_RECEIVED_WELL_SOURCED = 'REACTION_RECEIVED_WELL_SOURCED',
  REACTION_RECEIVED_THOUGHTFUL   = 'REACTION_RECEIVED_THOUGHTFUL',
  REACTION_RECEIVED_AGREE        = 'REACTION_RECEIVED_AGREE',
  REACTION_RECEIVED_MISLEADING   = 'REACTION_RECEIVED_MISLEADING',
  REACTION_RECEIVED_LOW_EFFORT   = 'REACTION_RECEIVED_LOW_EFFORT',
}

// ─────────────────────────────────────────────────────────────────────────────
// Ledger
// ─────────────────────────────────────────────────────────────────────────────

export type LedgerEntryStatus = 'active' | 'expired' | 'reversed';
export type LedgerEntryCategory = 'positive' | 'neutral' | 'negative';
export type AppealStatus = 'pending' | 'accepted' | 'rejected';

/**
 * A single entry in the user-visible Reputation Ledger (spec §16.2).
 *
 * Internal-only fields (`internalReasonCode`, `rawDelta`) are present on the
 * stored document but MUST be stripped before returning to API clients.
 */
export interface LedgerEntry {
  id: string;
  userId: string;
  eventType: LedgerEventType;
  eventCategory: LedgerEntryCategory;
  pillar: ReputationPillar;

  /** Human-readable label shown to the user. */
  publicLabel: string;

  /** Internal audit code — never returned to clients. */
  internalReasonCode: string;

  /** Raw score delta — never returned to clients. */
  rawDelta: number;

  impactBand: ReputationImpactBand;

  relatedContentId?: string;
  relatedModerationDecisionId?: string;

  visibility: 'user' | 'public';
  appealable: boolean;
  appealStatus?: AppealStatus;

  createdAt: string;
  decaysAt?: string;
  status: LedgerEntryStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary (public-facing API shape)
// ─────────────────────────────────────────────────────────────────────────────

export type FeedEligibilityStatus = 'eligible' | 'restricted' | 'ineligible';
export type RewardEligibilityStatus = 'eligible' | 'ineligible' | 'pending_verification';

/**
 * Full reputation summary returned by GET /api/reputation/me (spec §16.1).
 * Pillar scores are normalised floats (0.0–1.0).
 */
export interface ReputationSummary {
  userId: string;
  reputationLevel: ReputationLevel;
  reputationStatus: ReputationStatus;
  reputationBand: string;

  // Pillar scores normalised to [0, 1]
  humanContributionScore: number;
  contentQualityScore: number;
  behaviourTrustScore: number;
  interactionQualityScore: number;
  verificationStrengthScore: number;
  communityTrustScore: number;

  publicFeedEligibilityStatus: FeedEligibilityStatus;
  rewardEligibilityStatus: RewardEligibilityStatus;

  lastCalculatedAt: string;
  version: number;
}

/**
 * Public-safe shape for GET /api/reputation/users/{id}.
 * No pillar scores, no ledger.
 */
export interface PublicReputationView {
  userId: string;
  reputationLevel: ReputationLevel;
  reputationStatus: ReputationStatus;
  reputationBand: string;
  levelName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Paginated ledger response
// ─────────────────────────────────────────────────────────────────────────────

/** LedgerEntry with internal fields stripped for API responses. */
export type PublicLedgerEntry = Omit<LedgerEntry, 'internalReasonCode' | 'rawDelta'>;

export interface LedgerPage {
  entries: PublicLedgerEntry[];
  nextCursor?: string;
  total?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter
// ─────────────────────────────────────────────────────────────────────────────

export type LedgerFilter = 'positive' | 'neutral' | 'negative' | 'appeal' | 'expired' | 'all';
