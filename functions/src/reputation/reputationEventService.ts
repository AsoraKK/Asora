/**
 * Reputation Event Service (Pillar Wrapper)
 *
 * This is the primary entry point for recording reputation-affecting events.
 * Every call:
 *   1. Calls `adjustReputation()` from reputationService (backward-compatible)
 *   2. Increments the appropriate pillar aggregate bucket on the user document
 *   3. Appends a LedgerEntry (for non-neutral events) — the user-visible record
 *
 * Raw score deltas are NEVER returned to API clients.
 * Clients see only ReputationLevel (0–5) and impactBand in ledger entries.
 */

import { adjustReputation } from '@shared/services/reputationService';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { getAzureLogger } from '@shared/utils/logger';
import { getErrorMessage } from '@shared/errorUtils';
import { appendLedgerEntry } from './ledgerService';
import {
  LedgerEventType,
  ReputationPillar,
  ReputationImpactBand,
  LedgerEntryCategory,
} from './types';

const logger = getAzureLogger('reputation/reputationEventService');

// ─────────────────────────────────────────────────────────────────────────────
// Event Input Type
// ─────────────────────────────────────────────────────────────────────────────

export interface ReputationEventInput {
  userId: string;
  ledgerEventType: LedgerEventType;
  /** Source content ID (postId, commentId, etc.) */
  sourceId?: string;
  sourceType?: 'post' | 'comment' | 'moderation' | 'system';
  relatedModerationDecisionId?: string;
  /** Override defaults from REPUTATION_EVENTS config */
  overrides?: Partial<ReputationEventDefaults>;
}

export interface ReputationEventDefaults {
  pillar: ReputationPillar;
  impactBand: ReputationImpactBand;
  eventCategory: LedgerEntryCategory;
  rawDelta: number;
  publicLabel: string;
  internalReasonCode: string;
  appealable: boolean;
  visibility: 'user' | 'public';
  /** Days until the entry expires (undefined = never decays) */
  decayDays?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Config Map
// Maps LedgerEventType → default ReputationEventDefaults.
// Override at call-site via `overrides` field.
// ─────────────────────────────────────────────────────────────────────────────

export const REPUTATION_EVENTS: Record<LedgerEventType, ReputationEventDefaults> = {
  [LedgerEventType.HUMAN_TEXT_250_PLUS]: {
    pillar: 'human_contribution',
    impactBand: 'small_positive',
    eventCategory: 'positive',
    rawDelta: 1,
    publicLabel: '+ Reputation: Substantive human-authored contribution.',
    internalReasonCode: 'human_text_250_plus',
    appealable: false,
    visibility: 'user',
  },
  [LedgerEventType.WELL_SOURCED_POST]: {
    pillar: 'content_quality',
    impactBand: 'medium_positive',
    eventCategory: 'positive',
    rawDelta: 3,
    publicLabel: '+ Reputation: Well-sourced content recognised.',
    internalReasonCode: 'well_sourced_post',
    appealable: false,
    visibility: 'user',
  },
  [LedgerEventType.HELPFUL_REPLY]: {
    pillar: 'interaction_quality',
    impactBand: 'small_positive',
    eventCategory: 'positive',
    rawDelta: 1,
    publicLabel: '+ Reputation: Helpful reply.',
    internalReasonCode: 'helpful_reply',
    appealable: false,
    visibility: 'user',
  },
  [LedgerEventType.VERIFIED_EMAIL]: {
    pillar: 'verification_strength',
    impactBand: 'medium_positive',
    eventCategory: 'positive',
    rawDelta: 5,
    publicLabel: '+ Reputation: Email address verified.',
    internalReasonCode: 'verified_email',
    appealable: false,
    visibility: 'user',
  },
  [LedgerEventType.WORLD_ID_VERIFIED]: {
    pillar: 'verification_strength',
    impactBand: 'large_positive',
    eventCategory: 'positive',
    rawDelta: 20,
    publicLabel: '+ Reputation: Identity verified.',
    internalReasonCode: 'world_id_verified',
    appealable: false,
    visibility: 'user',
  },
  [LedgerEventType.AI_ASSISTED_DISCLOSURE]: {
    pillar: 'behaviour_trust',
    impactBand: 'neutral',
    eventCategory: 'neutral',
    rawDelta: 0,
    publicLabel: 'Noted: AI-assisted content disclosed.',
    internalReasonCode: 'ai_assisted_disclosure',
    appealable: false,
    visibility: 'user',
  },
  [LedgerEventType.AI_GENERATED_TEXT]: {
    pillar: 'behaviour_trust',
    impactBand: 'neutral',
    eventCategory: 'neutral',
    rawDelta: 0,
    publicLabel: 'Noted: AI-generated content label applied.',
    internalReasonCode: 'ai_generated_text',
    appealable: false,
    visibility: 'user',
  },
  [LedgerEventType.UNDISCLOSED_AI_TEXT]: {
    pillar: 'behaviour_trust',
    impactBand: 'medium_negative',
    eventCategory: 'negative',
    rawDelta: -8,
    publicLabel: '− Reputation: AI-generated content was not disclosed.',
    internalReasonCode: 'undisclosed_ai_text',
    appealable: true,
    visibility: 'user',
    decayDays: 90,
  },
  [LedgerEventType.AI_MEDIA_ATTEMPT]: {
    pillar: 'behaviour_trust',
    impactBand: 'medium_negative',
    eventCategory: 'negative',
    rawDelta: -5,
    publicLabel: '− Reputation: AI-generated media was not disclosed.',
    internalReasonCode: 'ai_media_attempt',
    appealable: true,
    visibility: 'user',
    decayDays: 90,
  },
  [LedgerEventType.MODERATION_VIOLATION]: {
    pillar: 'behaviour_trust',
    impactBand: 'medium_negative',
    eventCategory: 'negative',
    rawDelta: -5,
    publicLabel: '− Reputation: Policy violation confirmed.',
    internalReasonCode: 'moderation_violation',
    appealable: true,
    visibility: 'user',
  },
  [LedgerEventType.MODERATION_VIOLATION_SPAM]: {
    pillar: 'behaviour_trust',
    impactBand: 'medium_negative',
    eventCategory: 'negative',
    rawDelta: -5,
    publicLabel: '− Reputation: Spam policy violation confirmed.',
    internalReasonCode: 'moderation_violation_spam',
    appealable: true,
    visibility: 'user',
  },
  [LedgerEventType.MODERATION_VIOLATION_HARASSMENT]: {
    pillar: 'behaviour_trust',
    impactBand: 'large_negative',
    eventCategory: 'negative',
    rawDelta: -10,
    publicLabel: '− Reputation: Harassment policy violation confirmed.',
    internalReasonCode: 'moderation_violation_harassment',
    appealable: true,
    visibility: 'user',
  },
  [LedgerEventType.MODERATION_VIOLATION_HATE_SPEECH]: {
    pillar: 'behaviour_trust',
    impactBand: 'large_negative',
    eventCategory: 'negative',
    rawDelta: -15,
    publicLabel: '− Reputation: Hate speech policy violation confirmed.',
    internalReasonCode: 'moderation_violation_hate_speech',
    appealable: true,
    visibility: 'user',
  },
  [LedgerEventType.MODERATION_VIOLATION_VIOLENCE]: {
    pillar: 'behaviour_trust',
    impactBand: 'severe_negative',
    eventCategory: 'negative',
    rawDelta: -20,
    publicLabel: '− Reputation: Violence policy violation confirmed.',
    internalReasonCode: 'moderation_violation_violence',
    appealable: true,
    visibility: 'user',
  },
  [LedgerEventType.APPEAL_RESTORED]: {
    pillar: 'behaviour_trust',
    impactBand: 'neutral',
    eventCategory: 'neutral',
    rawDelta: 0,
    publicLabel: 'Reputation penalty reversed following successful appeal.',
    internalReasonCode: 'appeal_restored',
    appealable: false,
    visibility: 'user',
  },
  [LedgerEventType.DECAY_EXPIRED]: {
    pillar: 'behaviour_trust',
    impactBand: 'neutral',
    eventCategory: 'neutral',
    rawDelta: 0,
    publicLabel: 'A past reputation entry has expired.',
    internalReasonCode: 'decay_expired',
    appealable: false,
    visibility: 'user',
  },

  // ── Phase 2: reactions received ───────────────────────────────────────────
  [LedgerEventType.REACTION_RECEIVED_HELPFUL]: {
    pillar: 'interaction_quality',
    impactBand: 'small_positive',
    eventCategory: 'positive',
    rawDelta: 1,
    publicLabel: '+ Reputation: Content marked Helpful by the community.',
    internalReasonCode: 'reaction_received_helpful',
    appealable: false,
    visibility: 'user',
    decayDays: 60,
  },
  [LedgerEventType.REACTION_RECEIVED_WELL_SOURCED]: {
    pillar: 'content_quality',
    impactBand: 'medium_positive',
    eventCategory: 'positive',
    rawDelta: 3,
    publicLabel: '+ Reputation: Content marked Well Sourced by the community.',
    internalReasonCode: 'reaction_received_well_sourced',
    appealable: false,
    visibility: 'user',
    decayDays: 90,
  },
  [LedgerEventType.REACTION_RECEIVED_THOUGHTFUL]: {
    pillar: 'interaction_quality',
    impactBand: 'small_positive',
    eventCategory: 'positive',
    rawDelta: 1,
    publicLabel: '+ Reputation: Content marked Thoughtful by the community.',
    internalReasonCode: 'reaction_received_thoughtful',
    appealable: false,
    visibility: 'user',
    decayDays: 60,
  },
  [LedgerEventType.REACTION_RECEIVED_AGREE]: {
    pillar: 'interaction_quality',
    impactBand: 'small_positive',
    eventCategory: 'positive',
    rawDelta: 0,     // agree is a weak signal; no score delta but logged
    publicLabel: '+ Noted: Content agreed with by the community.',
    internalReasonCode: 'reaction_received_agree',
    appealable: false,
    visibility: 'user',
    decayDays: 30,
  },
  [LedgerEventType.REACTION_RECEIVED_MISLEADING]: {
    pillar: 'behaviour_trust',
    impactBand: 'medium_negative',
    eventCategory: 'negative',
    rawDelta: -3,    // only applied when corroborated (≥3 votes)
    publicLabel: '− Reputation: Content flagged as Misleading by multiple users.',
    internalReasonCode: 'reaction_received_misleading',
    appealable: true,
    visibility: 'user',
    decayDays: 60,
  },
  [LedgerEventType.REACTION_RECEIVED_LOW_EFFORT]: {
    pillar: 'content_quality',
    impactBand: 'small_negative',
    eventCategory: 'negative',
    rawDelta: -1,    // capped; soft signal
    publicLabel: '− Reputation: Content marked Low Effort by multiple users.',
    internalReasonCode: 'reaction_received_low_effort',
    appealable: false,
    visibility: 'user',
    decayDays: 30,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Pillar update helper
// ─────────────────────────────────────────────────────────────────────────────

const PILLAR_FIELD_MAP: Record<ReputationPillar, string> = {
  human_contribution: 'pillarScores.human_contribution',
  content_quality: 'pillarScores.content_quality',
  behaviour_trust: 'pillarScores.behaviour_trust',
  interaction_quality: 'pillarScores.interaction_quality',
  verification_strength: 'pillarScores.verification_strength',
  community_trust: 'pillarScores.community_trust',
};

async function incrementPillarScore(
  userId: string,
  pillar: ReputationPillar,
  delta: number
): Promise<void> {
  if (delta === 0) {
    return;
  }

  const db = getCosmosDatabase();
  const usersContainer = db.container('users');

  try {
    const { resource: user } = await usersContainer.item(userId, userId).read<Record<string, unknown>>();
    if (!user) {
      logger.warn('reputation.pillar.user_not_found', { userId });
      return;
    }

    const pillarScores = (user.pillarScores as Record<string, number> | undefined) ?? {};
    const fieldKey = pillar; // key within pillarScores object
    const current = Number(pillarScores[fieldKey] ?? 0);
    const updated = Math.max(0, current + delta);

    await usersContainer.item(userId, userId).replace({
      ...user,
      pillarScores: {
        ...pillarScores,
        [fieldKey]: updated,
      },
    });
  } catch (error: unknown) {
    // Non-fatal: pillar scores are supplemental; don't fail the event
    logger.warn('reputation.pillar.update_failed', {
      userId,
      pillar,
      error: getErrorMessage(error),
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record a reputation event.
 *
 * This is the canonical way to mutate reputation from feature code.
 * It wraps the legacy `adjustReputation()` for backward compat, increments
 * the pillar bucket, and appends a user-visible LedgerEntry.
 */
export async function recordReputationEvent(input: ReputationEventInput): Promise<void> {
  const { userId, ledgerEventType, sourceId, sourceType, relatedModerationDecisionId } = input;

  const defaults = REPUTATION_EVENTS[ledgerEventType];
  if (!defaults) {
    logger.error('reputation.event.unknown_type', { userId, ledgerEventType });
    return;
  }

  const config: ReputationEventDefaults = { ...defaults, ...input.overrides };

  // 1. Adjust raw reputation score (backward-compatible with existing reputationService)
  if (config.rawDelta !== 0) {
    try {
      await adjustReputation({
        userId,
        delta: config.rawDelta,
        reason: 'CONTENT_REMOVED_OTHER', // placeholder key; delta drives the value
        idempotencyKey: `evt:${ledgerEventType}:${sourceId ?? userId}:${Date.now()}`,
        sourceId,
        sourceType: sourceType === 'system' ? undefined : sourceType,
      });
    } catch (error: unknown) {
      logger.warn('reputation.event.adjust_failed', {
        userId,
        ledgerEventType,
        error: getErrorMessage(error),
      });
      // Non-fatal: continue to record ledger entry
    }
  }

  // 2. Increment pillar aggregate on user doc
  await incrementPillarScore(userId, config.pillar, config.rawDelta);

  // 3. Append every configured ledger event. Neutral zero-delta entries are
  // still user-visible explanations for disclosures, appeals, and decay.
  if (config.publicLabel) {
    try {
      const decaysAt = config.decayDays
        ? new Date(Date.now() + config.decayDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      await appendLedgerEntry({
        userId,
        eventType: ledgerEventType,
        eventCategory: config.eventCategory,
        pillar: config.pillar,
        publicLabel: config.publicLabel,
        internalReasonCode: config.internalReasonCode,
        rawDelta: config.rawDelta,
        impactBand: config.impactBand,
        relatedContentId: sourceId,
        relatedModerationDecisionId,
        visibility: config.visibility,
        appealable: config.appealable,
        status: 'active',
        decaysAt,
      });
    } catch (error: unknown) {
      logger.warn('reputation.event.ledger_append_failed', {
        userId,
        ledgerEventType,
        error: getErrorMessage(error),
      });
    }
  }

  logger.info('reputation.event.recorded', {
    userId,
    ledgerEventType,
    pillar: config.pillar,
    impactBand: config.impactBand,
    rawDelta: config.rawDelta,
  });
}
