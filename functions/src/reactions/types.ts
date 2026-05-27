/**
 * Reaction types — Phase 2.
 *
 * Structured reactions with reputation weighting and anti-gaming controls.
 * Feature flag STRUCTURED_REACTIONS_ENABLED must be true before deploying endpoints.
 */

/** All reaction types supported in the system (spec §9.1). */
export type ReactionType =
  | 'helpful'
  | 'well_sourced'
  | 'thoughtful'
  | 'agree'
  | 'disagree'
  | 'misleading'
  | 'low_effort'
  | 'report';

/**
 * Which reactions are positive vs negative vs neutral.
 * Used for reputation weighting and ledger event routing.
 */
export const REACTION_DIRECTION: Record<ReactionType, 'positive' | 'negative' | 'neutral'> = {
  helpful:      'positive',
  well_sourced: 'positive',
  thoughtful:   'positive',
  agree:        'positive',
  disagree:     'negative',
  misleading:   'negative',
  low_effort:   'negative',
  report:       'neutral',   // no direct penalty until validated
};

/**
 * Impact bands per reaction type — used for ledger entries.
 * Maps to ReputationImpactBand from reputation/types.
 */
export const REACTION_IMPACT_BAND: Record<ReactionType, string> = {
  helpful:      'small_positive',
  well_sourced: 'medium_positive',
  thoughtful:   'small_positive',
  agree:        'small_positive',
  disagree:     'small_negative',
  misleading:   'medium_negative',   // only applied if corroborated
  low_effort:   'small_negative',
  report:       'neutral',
};

// ─────────────────────────────────────────────────────────────────────────────
// Anti-gaming caps (spec §9.3, §13.3)
// ─────────────────────────────────────────────────────────────────────────────

/** Max positive reputation events a single user can trigger per day via reactions given. */
export const DAILY_REACTION_GIVEN_CAP = 20;
/** Max reputation events a single piece of content can receive per day. */
export const DAILY_PER_CONTENT_CAP = 50;
/** Max same-type reactions a user can give to the same target user per week. */
export const WEEKLY_PER_USER_PAIR_CAP = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Stored document
// ─────────────────────────────────────────────────────────────────────────────

export type AntiGamingStatus = 'clear' | 'capped' | 'suspicious' | 'excluded';

/** Stored document in the `reactions` Cosmos container (spec §16.4). */
export interface ReactionEvent {
  id: string;
  actorUserId: string;
  targetUserId: string;
  targetContentId: string;
  reactionType: ReactionType;
  /** Normalised impact band string from REACTION_IMPACT_BAND. */
  weightedSignalBand: string;
  createdAt: string;
  /** Whether this reaction was included in reputation scoring. */
  includedInReputation: boolean;
  antiGamingStatus: AntiGamingStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// API shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface SubmitReactionRequest {
  targetContentId: string;
  targetUserId: string;
  reactionType: ReactionType;
}

export interface SubmitReactionResponse {
  id: string;
  reactionType: ReactionType;
  includedInReputation: boolean;
  antiGamingStatus: AntiGamingStatus;
  createdAt: string;
}

/**
 * Feature flag: structured reactions endpoints and ledger scoring.
 * Flip to `true` in Phase 2 once the `reactions` container is provisioned.
 */
export const STRUCTURED_REACTIONS_ENABLED = true;
