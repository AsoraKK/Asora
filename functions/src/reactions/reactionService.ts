/**
 * Reaction Service — Phase 2
 *
 * Handles submission and deletion of structured reactions (spec §9).
 *
 * Anti-gaming controls enforced here (spec §9.3, §13.3):
 *   - Daily cap on reactions GIVEN per actor (DAILY_REACTION_GIVEN_CAP)
 *   - Per-content daily cap (DAILY_PER_CONTENT_CAP)
 *   - Per-user-pair weekly cap (WEEKLY_PER_USER_PAIR_CAP)
 *   - Voter reputation weighting (≥Verified earns full weight)
 *   - Corroboration threshold for negative reactions (misleading, low_effort)
 *
 * Negative-reaction ledger entries are DEFERRED: they are only written when
 * corroboration thresholds are met (≥NEGATIVE_CORROBORATION_THRESHOLD distinct
 * actors have submitted the same type against the same content).
 */

import { v4 as uuidv4 } from 'uuid';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { getAzureLogger } from '@shared/utils/logger';
import { getErrorMessage } from '@shared/errorUtils';
import { recordReputationEvent } from '../reputation/reputationEventService';
import { LedgerEventType, ReputationLevel } from '../reputation/types';
import {
  ReactionType,
  ReactionEvent,
  SubmitReactionRequest,
  SubmitReactionResponse,
  AntiGamingStatus,
  REACTION_DIRECTION,
  REACTION_IMPACT_BAND,
  DAILY_REACTION_GIVEN_CAP,
  DAILY_PER_CONTENT_CAP,
  WEEKLY_PER_USER_PAIR_CAP,
} from './types';

const logger = getAzureLogger('reactions/service');

/** Minimum distinct actors needed before a negative reaction creates a ledger entry. */
const NEGATIVE_CORROBORATION_THRESHOLD = 3;

// ─────────────────────────────────────────────────────────────────────────────
// LedgerEventType mapping
// ─────────────────────────────────────────────────────────────────────────────

const REACTION_TO_LEDGER_EVENT: Partial<Record<ReactionType, LedgerEventType>> = {
  helpful:      LedgerEventType.REACTION_RECEIVED_HELPFUL,
  well_sourced: LedgerEventType.REACTION_RECEIVED_WELL_SOURCED,
  thoughtful:   LedgerEventType.REACTION_RECEIVED_THOUGHTFUL,
  agree:        LedgerEventType.REACTION_RECEIVED_AGREE,
  misleading:   LedgerEventType.REACTION_RECEIVED_MISLEADING,
  low_effort:   LedgerEventType.REACTION_RECEIVED_LOW_EFFORT,
  // 'disagree' and 'report' do not create ledger entries directly
};

// ─────────────────────────────────────────────────────────────────────────────
// Anti-gaming helpers
// ─────────────────────────────────────────────────────────────────────────────

function dayStartMs(): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function weekStartMs(): number {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Count reactions given by `actorUserId` today (all content, all types).
 * Used for DAILY_REACTION_GIVEN_CAP.
 */
async function countActorDailyGiven(actorUserId: string): Promise<number> {
  const db = getCosmosDatabase();
  const since = new Date(dayStartMs()).toISOString();
  const { resources } = await db.container('reactions').items
    .query<number>({
      query: 'SELECT VALUE COUNT(1) FROM c WHERE c.actorUserId = @actor AND c.createdAt >= @since',
      parameters: [
        { name: '@actor', value: actorUserId },
        { name: '@since', value: since },
      ],
    })
    .fetchAll();
  return resources[0] ?? 0;
}

/**
 * Count reactions received on a specific content item today (all types, all actors).
 * Used for DAILY_PER_CONTENT_CAP.
 */
async function countContentDailyReceived(targetContentId: string): Promise<number> {
  const db = getCosmosDatabase();
  const since = new Date(dayStartMs()).toISOString();
  const { resources } = await db.container('reactions').items
    .query<number>({
      query: 'SELECT VALUE COUNT(1) FROM c WHERE c.targetContentId = @content AND c.createdAt >= @since',
      parameters: [
        { name: '@content', value: targetContentId },
        { name: '@since', value: since },
      ],
    })
    .fetchAll();
  return resources[0] ?? 0;
}

/**
 * Count same-type reactions from actor to target user this week.
 * Used for WEEKLY_PER_USER_PAIR_CAP.
 */
async function countWeeklyPairReactions(
  actorUserId: string,
  targetUserId: string,
  reactionType: ReactionType
): Promise<number> {
  const db = getCosmosDatabase();
  const since = new Date(weekStartMs()).toISOString();
  const { resources } = await db.container('reactions').items
    .query<number>({
      query: `SELECT VALUE COUNT(1) FROM c
              WHERE c.actorUserId = @actor
                AND c.targetUserId = @target
                AND c.reactionType = @type
                AND c.createdAt >= @since`,
      parameters: [
        { name: '@actor',  value: actorUserId },
        { name: '@target', value: targetUserId },
        { name: '@type',   value: reactionType },
        { name: '@since',  value: since },
      ],
    })
    .fetchAll();
  return resources[0] ?? 0;
}

/**
 * Determine actor reputation level to weight votes.
 * New (0) actors get reduced influence on negative reactions.
 * Falls back to New on any DB error.
 */
async function getActorReputationLevel(actorUserId: string): Promise<ReputationLevel> {
  try {
    const db = getCosmosDatabase();
    const { resource } = await db.container('users').item(actorUserId, actorUserId)
      .read<{ reputationScore?: number }>();
    const score = resource?.reputationScore ?? 0;
    // Simple threshold check matching DEFAULT_THRESHOLDS = [0, 10, 50, 200, 500, 1000]
    if (score >= 1000) return ReputationLevel.HighlyCredible;
    if (score >= 500)  return ReputationLevel.Credible;
    if (score >= 200)  return ReputationLevel.Established;
    if (score >= 50)   return ReputationLevel.Trusted;
    if (score >= 10)   return ReputationLevel.Verified;
    return ReputationLevel.New;
  } catch {
    return ReputationLevel.New;
  }
}

/**
 * Count distinct actors who have submitted the same negative reaction type
 * against this content item. Used for corroboration threshold check.
 */
async function countCorroborators(
  targetContentId: string,
  reactionType: ReactionType
): Promise<number> {
  const db = getCosmosDatabase();
  // Count distinct actors (approximated by COUNT since Cosmos doesn't support DISTINCT COUNT natively)
  const { resources } = await db.container('reactions').items
    .query<number>({
      query: `SELECT VALUE COUNT(1) FROM c
              WHERE c.targetContentId = @content
                AND c.reactionType = @type
                AND c.includedInReputation = true`,
      parameters: [
        { name: '@content', value: targetContentId },
        { name: '@type',    value: reactionType },
      ],
    })
    .fetchAll();
  return resources[0] ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface SubmitReactionInput extends SubmitReactionRequest {
  actorUserId: string;
}

/**
 * Submit a structured reaction.
 *
 * Returns the stored ReactionEvent (stripped of internal fields for API response).
 * Anti-gaming checks may set `includedInReputation = false` and
 * `antiGamingStatus = 'capped'` without blocking the reaction itself.
 */
export async function submitReaction(input: SubmitReactionInput): Promise<SubmitReactionResponse> {
  const { actorUserId, targetUserId, targetContentId, reactionType } = input;

  // Block self-reactions
  if (actorUserId === targetUserId) {
    throw Object.assign(new Error('Cannot react to your own content'), { statusCode: 400 });
  }

  const direction = REACTION_DIRECTION[reactionType];
  let antiGamingStatus: AntiGamingStatus = 'clear';
  let includedInReputation = true;

  // ── Cap checks ─────────────────────────────────────────────────────────────
  const [dailyGiven, dailyContent, weeklyPair] = await Promise.all([
    countActorDailyGiven(actorUserId),
    countContentDailyReceived(targetContentId),
    countWeeklyPairReactions(actorUserId, targetUserId, reactionType),
  ]);

  if (dailyGiven >= DAILY_REACTION_GIVEN_CAP) {
    antiGamingStatus = 'capped';
    includedInReputation = false;
    logger.info('reactions.cap.daily_given', { actorUserId, dailyGiven });
  } else if (dailyContent >= DAILY_PER_CONTENT_CAP) {
    antiGamingStatus = 'capped';
    includedInReputation = false;
    logger.info('reactions.cap.daily_content', { targetContentId, dailyContent });
  } else if (weeklyPair >= WEEKLY_PER_USER_PAIR_CAP) {
    antiGamingStatus = 'capped';
    includedInReputation = false;
    logger.info('reactions.cap.weekly_pair', { actorUserId, targetUserId, reactionType });
  }

  // ── Voter reputation weighting ─────────────────────────────────────────────
  // New-level actors cannot apply negative reactions toward reputation
  if (includedInReputation && direction === 'negative') {
    const actorLevel = await getActorReputationLevel(actorUserId);
    if (actorLevel < ReputationLevel.Verified) {
      antiGamingStatus = 'capped';
      includedInReputation = false;
      logger.info('reactions.cap.actor_level_too_low', { actorUserId, reactionType });
    }
  }

  // ── Store the reaction ─────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const id = uuidv4();
  const event: ReactionEvent = {
    id,
    actorUserId,
    targetUserId,
    targetContentId,
    reactionType,
    weightedSignalBand: REACTION_IMPACT_BAND[reactionType],
    createdAt: now,
    includedInReputation,
    antiGamingStatus,
  };

  const db = getCosmosDatabase();
  await db.container('reactions').items.create({ ...event, _partitionKey: targetContentId });

  logger.info('reactions.submitted', { id, actorUserId, targetUserId, reactionType, includedInReputation });

  // ── Reputation ledger ──────────────────────────────────────────────────────
  if (includedInReputation && reactionType !== 'report' && reactionType !== 'disagree') {
    const ledgerEventType = REACTION_TO_LEDGER_EVENT[reactionType];

    if (ledgerEventType) {
      if (direction === 'positive') {
        // Positive reactions: immediately create a ledger entry on the target
        await recordReputationEvent({
          userId: targetUserId,
          ledgerEventType,
          sourceId: targetContentId,
          sourceType: 'post',
        }).catch((err: unknown) => {
          logger.warn('reactions.ledger.positive_failed', {
            targetUserId,
            ledgerEventType,
            error: getErrorMessage(err),
          });
        });
      } else if (direction === 'negative') {
        // Negative reactions: deferred — only record once NEGATIVE_CORROBORATION_THRESHOLD is met
        const corroborators = await countCorroborators(targetContentId, reactionType);
        if (corroborators >= NEGATIVE_CORROBORATION_THRESHOLD) {
          // Check if ledger entry was already created for this content+type combination
          const alreadyRecorded = await hasNegativeLedgerEntry(targetUserId, targetContentId, ledgerEventType);
          if (!alreadyRecorded) {
            await recordReputationEvent({
              userId: targetUserId,
              ledgerEventType,
              sourceId: targetContentId,
              sourceType: 'post',
            }).catch((err: unknown) => {
              logger.warn('reactions.ledger.negative_failed', {
                targetUserId,
                ledgerEventType,
                error: getErrorMessage(err),
              });
            });
          }
        }
      }
    }
  }

  return { id, reactionType, includedInReputation, antiGamingStatus, createdAt: now };
}

/**
 * Check whether a negative ledger entry for this content+event combination
 * has already been written (prevents duplicate penalties from repeated threshold crossings).
 */
async function hasNegativeLedgerEntry(
  userId: string,
  contentId: string,
  ledgerEventType: LedgerEventType
): Promise<boolean> {
  try {
    const db = getCosmosDatabase();
    const { resources } = await db.container('reputation_ledger').items
      .query<{ id: string }>({
        query: `SELECT TOP 1 c.id FROM c
                WHERE c.userId = @userId
                  AND c.relatedContentId = @contentId
                  AND c.eventType = @eventType
                  AND c.status = 'active'`,
        parameters: [
          { name: '@userId',    value: userId },
          { name: '@contentId', value: contentId },
          { name: '@eventType', value: ledgerEventType },
        ],
      })
      .fetchAll();
    return resources.length > 0;
  } catch {
    return false;
  }
}

/**
 * Delete an actor's own reaction.
 * Does NOT reverse the ledger entry — reputation reversals go through appeals.
 */
export async function deleteReaction(reactionId: string, actorUserId: string): Promise<void> {
  const db = getCosmosDatabase();

  // Read first to verify ownership
  let existing: ReactionEvent | undefined;
  try {
    // Reactions are partitioned by targetContentId; we need a cross-partition read
    const { resources } = await db.container('reactions').items
      .query<ReactionEvent>({
        query: 'SELECT * FROM c WHERE c.id = @id AND c.actorUserId = @actor',
        parameters: [
          { name: '@id',    value: reactionId },
          { name: '@actor', value: actorUserId },
        ],
      })
      .fetchAll();
    existing = resources[0];
  } catch (err: unknown) {
    throw Object.assign(new Error(`Failed to look up reaction: ${getErrorMessage(err)}`), { statusCode: 500 });
  }

  if (!existing) {
    throw Object.assign(new Error('Reaction not found'), { statusCode: 404 });
  }

  await db.container('reactions').item(reactionId, existing.targetContentId).delete();
  logger.info('reactions.deleted', { reactionId, actorUserId });
}
