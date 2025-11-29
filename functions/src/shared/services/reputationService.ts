/**
 * Reputation Service
 *
 * Manages user reputation scores with atomic, concurrency-safe updates.
 * Uses Cosmos DB ETags for optimistic concurrency control.
 *
 * Reputation Rules:
 *   +1 rep: User creates a post
 *   +2 rep: Another user likes the author's post
 *   -X rep: Content removed for policy violations (configurable by severity)
 */

import type { Container, ItemResponse } from '@azure/cosmos';
import { getCosmosClient } from '@shared/clients/cosmos';
import { getAzureLogger } from '@shared/utils/logger';
import { isNotFoundError, isConflictError, isPreconditionFailedError, getErrorMessage } from '@shared/errorUtils';

const logger = getAzureLogger('shared/reputationService');

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Reputation adjustments for various actions */
export const REPUTATION_ADJUSTMENTS = {
  POST_CREATED: 1,
  POST_LIKED: 2,
  COMMENT_CREATED: 1,
  
  // Penalties (negative values)
  CONTENT_REMOVED_SPAM: -5,
  CONTENT_REMOVED_HARASSMENT: -10,
  CONTENT_REMOVED_HATE_SPEECH: -15,
  CONTENT_REMOVED_VIOLENCE: -20,
  CONTENT_REMOVED_OTHER: -3,
  
  // Default penalty for unknown violations
  CONTENT_REMOVED_DEFAULT: -5,
} as const;

/** Minimum reputation score (floor) */
const MIN_REPUTATION = 0;

/** Maximum retries for ETag conflicts */
const MAX_RETRIES = 3;

/** Delay between retries (ms) */
const RETRY_DELAY_MS = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ReputationReason = keyof typeof REPUTATION_ADJUSTMENTS;

export interface ReputationAdjustment {
  userId: string;
  delta: number;
  reason: ReputationReason;
  idempotencyKey: string;
  sourceId?: string; // postId, commentId, etc.
  sourceType?: 'post' | 'comment' | 'moderation';
}

export interface ReputationResult {
  success: boolean;
  previousScore?: number;
  newScore?: number;
  alreadyApplied?: boolean;
  error?: string;
}

interface UserDocument {
  id: string;
  reputationScore: number;
  _etag?: string;
  [key: string]: unknown;
}

interface ReputationAuditDocument {
  id: string;
  userId: string;
  delta: number;
  reason: string;
  previousScore: number;
  newScore: number;
  sourceId?: string;
  sourceType?: string;
  createdAt: string;
  _partitionKey: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Container Cache
// ─────────────────────────────────────────────────────────────────────────────

let cachedUsersContainer: Container | null = null;
let cachedAuditContainer: Container | null = null;

function getUsersContainer(): Container {
  if (cachedUsersContainer) {
    return cachedUsersContainer;
  }
  const client = getCosmosClient();
  const databaseName = process.env.COSMOS_DATABASE_NAME || 'asora';
  cachedUsersContainer = client.database(databaseName).container('users');
  return cachedUsersContainer;
}

function getAuditContainer(): Container {
  if (cachedAuditContainer) {
    return cachedAuditContainer;
  }
  const client = getCosmosClient();
  const databaseName = process.env.COSMOS_DATABASE_NAME || 'asora';
  cachedAuditContainer = client.database(databaseName).container('reputation_audit');
  return cachedAuditContainer;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if an adjustment has already been applied (idempotency check).
 */
async function isAlreadyApplied(idempotencyKey: string): Promise<boolean> {
  const auditId = `rep_${idempotencyKey}`;
  const auditContainer = getAuditContainer();

  try {
    const { resource } = await auditContainer.item(auditId, auditId).read();
    return !!resource;
  } catch (error: unknown) {
    // 404 means not found = not applied yet
    if (isNotFoundError(error)) {
      return false;
    }
    // Log other errors but don't block - fail open for idempotency check
    logger.warn('Error checking idempotency', { auditId, error: getErrorMessage(error) });
    return false;
  }
}

/**
 * Record the adjustment in the audit log.
 */
async function recordAudit(
  adjustment: ReputationAdjustment,
  previousScore: number,
  newScore: number
): Promise<void> {
  const auditId = `rep_${adjustment.idempotencyKey}`;
  const auditContainer = getAuditContainer();

  const auditDoc: ReputationAuditDocument = {
    id: auditId,
    userId: adjustment.userId,
    delta: adjustment.delta,
    reason: adjustment.reason,
    previousScore,
    newScore,
    sourceId: adjustment.sourceId,
    sourceType: adjustment.sourceType,
    createdAt: new Date().toISOString(),
    _partitionKey: auditId, // Self-partitioned for point reads
  };

  try {
    await auditContainer.items.create(auditDoc);
    logger.info('Reputation audit recorded', {
      userId: adjustment.userId,
      delta: adjustment.delta,
      reason: adjustment.reason,
      previousScore,
      newScore,
    });
  } catch (error: unknown) {
    // If audit record already exists (409), that's fine - idempotency protection worked
    if (isConflictError(error)) {
      logger.warn('Audit record already exists', { auditId });
      return;
    }
    // Log but don't fail the operation for audit failures
    logger.error('Failed to record reputation audit', {
      auditId,
      error: getErrorMessage(error),
    });
  }
}

/**
 * Attempt to update user reputation with ETag-based optimistic concurrency.
 * Returns the updated user document or throws on conflict.
 */
async function attemptReputationUpdate(
  userId: string,
  delta: number,
  currentEtag?: string
): Promise<{ user: UserDocument; previousScore: number; newScore: number }> {
  const usersContainer = getUsersContainer();

  // Read current user with ETag
  const readResponse: ItemResponse<UserDocument> = await usersContainer
    .item(userId, userId)
    .read<UserDocument>();

  const user = readResponse.resource;
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const etag = readResponse.etag;
  const previousScore = user.reputationScore ?? 0;
  const newScore = Math.max(MIN_REPUTATION, previousScore + delta);

  // Update with ETag condition for optimistic concurrency
  const updatedUser: UserDocument = {
    ...user,
    reputationScore: newScore,
  };

  await usersContainer.item(userId, userId).replace(updatedUser, {
    accessCondition: {
      type: 'IfMatch',
      condition: etag!,
    },
  });

  return { user: updatedUser, previousScore, newScore };
}

/**
 * Adjust a user's reputation score atomically.
 *
 * Features:
 * - Idempotent: Won't apply the same adjustment twice (uses idempotencyKey)
 * - Concurrency-safe: Uses ETag for optimistic locking with retry
 * - Audited: Records all adjustments in reputation_audit container
 * - Bounded: Score can't go below MIN_REPUTATION
 */
export async function adjustReputation(
  adjustment: ReputationAdjustment
): Promise<ReputationResult> {
  const { userId, delta, reason, idempotencyKey } = adjustment;

  // 1. Idempotency check
  const alreadyApplied = await isAlreadyApplied(idempotencyKey);
  if (alreadyApplied) {
    logger.info('Reputation adjustment already applied', { idempotencyKey });
    return { success: true, alreadyApplied: true };
  }

  // 2. Retry loop for ETag conflicts
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { previousScore, newScore } = await attemptReputationUpdate(userId, delta);

      // 3. Record audit (after successful update)
      await recordAudit(adjustment, previousScore, newScore);

      logger.info('Reputation adjusted', {
        userId,
        delta,
        reason,
        previousScore,
        newScore,
        attempt,
      });

      return {
        success: true,
        previousScore,
        newScore,
      };
    } catch (error: unknown) {
      lastError = error;

      // Check if it's a precondition failure (ETag mismatch)
      if (isPreconditionFailedError(error)) {
        logger.warn('ETag conflict, retrying', {
          userId,
          attempt,
          maxRetries: MAX_RETRIES,
        });

        if (attempt < MAX_RETRIES) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
          continue;
        }
      }

      // For non-retriable errors, break immediately
      if (isNotFoundError(error)) {
        logger.warn('User not found for reputation update', { userId });
        return {
          success: false,
          error: 'User not found',
        };
      }

      break;
    }
  }

  logger.error('Failed to adjust reputation after retries', {
    userId,
    delta,
    reason,
    error: getErrorMessage(lastError),
  });

  return {
    success: false,
    error: getErrorMessage(lastError),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Award reputation for creating a post.
 */
export async function awardPostCreated(
  userId: string,
  postId: string
): Promise<ReputationResult> {
  return adjustReputation({
    userId,
    delta: REPUTATION_ADJUSTMENTS.POST_CREATED,
    reason: 'POST_CREATED',
    idempotencyKey: `post_created:${postId}`,
    sourceId: postId,
    sourceType: 'post',
  });
}

/**
 * Award reputation when a post is liked (to the post author).
 */
export async function awardPostLiked(
  authorId: string,
  postId: string,
  likerId: string
): Promise<ReputationResult> {
  // Don't award rep for self-likes
  if (authorId === likerId) {
    logger.info('Skipping reputation for self-like', { authorId, postId });
    return { success: true, alreadyApplied: true };
  }

  return adjustReputation({
    userId: authorId,
    delta: REPUTATION_ADJUSTMENTS.POST_LIKED,
    reason: 'POST_LIKED',
    idempotencyKey: `post_liked:${postId}:${likerId}`,
    sourceId: postId,
    sourceType: 'post',
  });
}

/**
 * Deduct reputation when content is removed for policy violations.
 */
export async function penalizeContentRemoval(
  userId: string,
  contentId: string,
  contentType: 'post' | 'comment',
  violationType?: string
): Promise<ReputationResult> {
  // Map violation types to penalty amounts
  let reason: ReputationReason = 'CONTENT_REMOVED_DEFAULT';
  
  const normalizedViolation = violationType?.toLowerCase() ?? '';
  
  if (normalizedViolation.includes('spam')) {
    reason = 'CONTENT_REMOVED_SPAM';
  } else if (normalizedViolation.includes('harass')) {
    reason = 'CONTENT_REMOVED_HARASSMENT';
  } else if (normalizedViolation.includes('hate')) {
    reason = 'CONTENT_REMOVED_HATE_SPEECH';
  } else if (normalizedViolation.includes('violen')) {
    reason = 'CONTENT_REMOVED_VIOLENCE';
  } else if (violationType) {
    reason = 'CONTENT_REMOVED_OTHER';
  }

  return adjustReputation({
    userId,
    delta: REPUTATION_ADJUSTMENTS[reason],
    reason,
    idempotencyKey: `content_removed:${contentId}`,
    sourceId: contentId,
    sourceType: contentType,
  });
}

/**
 * Revoke the like reputation bonus when a post is unliked.
 * Note: We don't penalize - just remove the bonus if it was awarded.
 */
export async function revokePostLiked(
  authorId: string,
  postId: string,
  likerId: string
): Promise<ReputationResult> {
  // Don't revoke for self-likes (they never got rep)
  if (authorId === likerId) {
    return { success: true, alreadyApplied: true };
  }

  return adjustReputation({
    userId: authorId,
    delta: -REPUTATION_ADJUSTMENTS.POST_LIKED,
    reason: 'POST_LIKED', // Same reason, negative delta
    idempotencyKey: `post_unliked:${postId}:${likerId}`,
    sourceId: postId,
    sourceType: 'post',
  });
}

/**
 * Get a user's current reputation score.
 */
export async function getReputationScore(userId: string): Promise<number | null> {
  const usersContainer = getUsersContainer();

  try {
    const { resource: user } = await usersContainer
      .item(userId, userId)
      .read<UserDocument>();
    
    return user?.reputationScore ?? 0;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Batch get reputation scores for multiple users.
 * Returns a Map of userId -> reputationScore.
 * Users not found return defaultReputation.
 */
export async function getBatchReputationScores(
  userIds: string[],
  defaultReputation = 0
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  
  if (!userIds.length) {
    return result;
  }

  // Deduplicate userIds
  const uniqueIds = [...new Set(userIds)];
  
  // Initialize all with default
  for (const id of uniqueIds) {
    result.set(id, defaultReputation);
  }

  const usersContainer = getUsersContainer();

  try {
    // Use IN query to batch fetch users
    const placeholders = uniqueIds.map((_, i) => `@id${i}`).join(', ');
    const parameters = uniqueIds.map((id, i) => ({ name: `@id${i}`, value: id }));

    const query = {
      query: `SELECT c.id, c.reputationScore FROM c WHERE c.id IN (${placeholders})`,
      parameters,
    };

    const { resources } = await usersContainer.items
      .query<{ id: string; reputationScore?: number }>(query)
      .fetchAll();

    for (const user of resources) {
      if (user.id && typeof user.reputationScore === 'number') {
        result.set(user.id, user.reputationScore);
      }
    }
  } catch (error) {
    logger.warn('getBatchReputationScores failed, using defaults', {
      error: (error as Error).message,
      userCount: uniqueIds.length,
    });
    // Keep defaults on error
  }

  return result;
}

/**
 * Get reputation history for a user.
 */
export async function getReputationHistory(
  userId: string,
  limit = 50
): Promise<ReputationAuditDocument[]> {
  const auditContainer = getAuditContainer();

  const query = {
    query: `
      SELECT * FROM c 
      WHERE c.userId = @userId 
      ORDER BY c.createdAt DESC
    `,
    parameters: [{ name: '@userId', value: userId }],
  };

  const { resources } = await auditContainer.items
    .query<ReputationAuditDocument>(query, { maxItemCount: limit })
    .fetchAll();

  return resources;
}

// ─────────────────────────────────────────────────────────────────────────────
// For Testing
// ─────────────────────────────────────────────────────────────────────────────

export function resetContainerCache(): void {
  cachedUsersContainer = null;
  cachedAuditContainer = null;
}
