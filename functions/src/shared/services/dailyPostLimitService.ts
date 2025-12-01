/**
 * Daily Post Limit Service
 *
 * Tracks and enforces daily post limits per user based on their tier.
 * Uses a lightweight counter collection in Cosmos DB for efficient tracking.
 *
 * Counter documents are keyed by userId:date for automatic daily reset.
 */

import type { Container } from '@azure/cosmos';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { getAzureLogger } from '@shared/utils/logger';
import { getDailyPostLimit, normalizeTier, type UserTier } from './tierLimits';
import { isNotFoundError, getErrorMessage } from '@shared/errorUtils';

const logger = getAzureLogger('shared/dailyPostLimitService');

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyCounterDocument {
  /** Composite key: userId:YYYY-MM-DD */
  id: string;
  /** Partition key: userId */
  userId: string;
  /** Counter type (post, comment, like) */
  counterType: 'post' | 'comment' | 'like';
  /** Date string (YYYY-MM-DD) in UTC */
  date: string;
  /** Current count */
  count: number;
  /** Last updated timestamp */
  updatedAt: number;
  /** TTL in seconds - auto-delete after 7 days */
  ttl: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  tier: UserTier;
  resetDate: string;
}

export interface IncrementResult {
  success: boolean;
  newCount: number;
  limit: number;
  remaining: number;
}

export class DailyPostLimitExceededError extends Error {
  readonly code = 'daily_post_limit_reached';
  readonly statusCode = 429;
  readonly limit: number;
  readonly currentCount: number;
  readonly tier: UserTier;
  readonly resetDate: string;

  constructor(result: LimitCheckResult) {
    super(`Daily post limit reached (${result.currentCount}/${result.limit})`);
    this.name = 'DailyPostLimitExceededError';
    this.limit = result.limit;
    this.currentCount = result.currentCount;
    this.tier = result.tier;
    this.resetDate = result.resetDate;
  }

  toResponse() {
    return {
      error: 'Daily post limit reached. Try again tomorrow.',
      code: this.code,
      limit: this.limit,
      current: this.currentCount,
      tier: this.tier,
      resetAt: this.resetDate,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COUNTERS_CONTAINER = 'counters';
/** TTL: 7 days (counters auto-expire after a week) */
const COUNTER_TTL_SECONDS = 7 * 24 * 60 * 60;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get current UTC date string (YYYY-MM-DD)
 */
export function getUtcDateString(date: Date = new Date()): string {
  const isoString = date.toISOString();
  const datePart = isoString.split('T')[0];
  // ISO format guarantees YYYY-MM-DDTHH:mm:ss.sssZ, so split always has date
  return datePart ?? isoString.slice(0, 10);
}

/**
 * Get the next UTC date string for reset time display
 */
export function getNextUtcDateString(date: Date = new Date()): string {
  const nextDay = new Date(date);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  nextDay.setUTCHours(0, 0, 0, 0);
  return nextDay.toISOString();
}

/**
 * Build counter document ID
 */
function buildCounterId(userId: string, counterType: string, date: string): string {
  return `${userId}:${counterType}:${date}`;
}

/**
 * Get the counters container
 */
function getCountersContainer(): Container {
  return getCosmosDatabase().container(COUNTERS_CONTAINER);
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current post count for a user on a given date
 */
export async function getDailyPostCount(
  userId: string,
  date: string = getUtcDateString()
): Promise<number> {
  const container = getCountersContainer();
  const counterId = buildCounterId(userId, 'post', date);

  try {
    const { resource } = await container.item(counterId, userId).read<DailyCounterDocument>();
    return resource?.count ?? 0;
  } catch (error: unknown) {
    // 404 means no posts today
    if (isNotFoundError(error)) {
      return 0;
    }
    logger.error('getDailyPostCount.error', { userId, date, error: getErrorMessage(error) });
    throw error;
  }
}

/**
 * Check if user can create a post based on their tier limit
 */
export async function checkDailyPostLimit(
  userId: string,
  tier: string | undefined | null
): Promise<LimitCheckResult> {
  const normalizedTier = normalizeTier(tier);
  const limit = getDailyPostLimit(tier);
  const date = getUtcDateString();
  const currentCount = await getDailyPostCount(userId, date);
  const resetDate = getNextUtcDateString();

  return {
    allowed: currentCount < limit,
    currentCount,
    limit,
    remaining: Math.max(0, limit - currentCount),
    tier: normalizedTier,
    resetDate,
  };
}

/**
 * Increment the daily post count for a user
 * Uses upsert for atomic increment
 */
export async function incrementDailyPostCount(
  userId: string,
  tier: string | undefined | null
): Promise<IncrementResult> {
  const container = getCountersContainer();
  const date = getUtcDateString();
  const counterId = buildCounterId(userId, 'post', date);
  const limit = getDailyPostLimit(tier);
  const now = Date.now();

  try {
    // Try to read existing counter
    const { resource: existing } = await container.item(counterId, userId).read<DailyCounterDocument>();

    if (existing) {
      // Update existing counter
      const newCount = existing.count + 1;
      await container.item(counterId, userId).replace<DailyCounterDocument>({
        ...existing,
        count: newCount,
        updatedAt: now,
      });

      logger.info('incrementDailyPostCount.updated', {
        userId: userId.slice(0, 8),
        date,
        newCount,
        limit,
      });

      return {
        success: true,
        newCount,
        limit,
        remaining: Math.max(0, limit - newCount),
      };
    }
  } catch (error: unknown) {
    // 404 is expected if counter doesn't exist yet
    if (!isNotFoundError(error)) {
      logger.error('incrementDailyPostCount.readError', { userId, error: getErrorMessage(error) });
      throw error;
    }
  }

  // Create new counter
  const newDoc: DailyCounterDocument = {
    id: counterId,
    userId,
    counterType: 'post',
    date,
    count: 1,
    updatedAt: now,
    ttl: COUNTER_TTL_SECONDS,
  };

  await container.items.create(newDoc);

  logger.info('incrementDailyPostCount.created', {
    userId: userId.slice(0, 8),
    date,
    newCount: 1,
    limit,
  });

  return {
    success: true,
    newCount: 1,
    limit,
    remaining: Math.max(0, limit - 1),
  };
}

/**
 * Check limit and throw if exceeded (convenience wrapper)
 * Call this at the start of post creation to enforce limits
 */
export async function enforceDailyPostLimit(
  userId: string,
  tier: string | undefined | null
): Promise<LimitCheckResult> {
  const result = await checkDailyPostLimit(userId, tier);

  if (!result.allowed) {
    logger.warn('enforceDailyPostLimit.exceeded', {
      userId: userId.slice(0, 8),
      tier: result.tier,
      count: result.currentCount,
      limit: result.limit,
    });
    throw new DailyPostLimitExceededError(result);
  }

  return result;
}

/**
 * Combined check-and-increment for atomic limit enforcement
 * Returns the new count if allowed, throws DailyPostLimitExceededError if limit reached
 */
export async function checkAndIncrementPostCount(
  userId: string,
  tier: string | undefined | null
): Promise<IncrementResult> {
  // First check the limit
  const checkResult = await checkDailyPostLimit(userId, tier);

  if (!checkResult.allowed) {
    logger.warn('checkAndIncrementPostCount.limitReached', {
      userId: userId.slice(0, 8),
      tier: checkResult.tier,
      count: checkResult.currentCount,
      limit: checkResult.limit,
    });
    throw new DailyPostLimitExceededError(checkResult);
  }

  // Then increment
  return incrementDailyPostCount(userId, tier);
}
