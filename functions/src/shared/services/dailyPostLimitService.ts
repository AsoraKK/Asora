/**
 * Daily Action Limit Service
 *
 * Tracks and enforces daily quotas per tier using the counters container.
 * Supports multiple action types (posts, comments, appeals) with shared logic.
 */

import type { Container } from '@azure/cosmos';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { getAzureLogger } from '@shared/utils/logger';
import {
  getDailyAppealLimit,
  getDailyCommentLimit,
  getDailyPostLimit,
  normalizeTier,
  type UserTier,
} from './tierLimits';
import { isNotFoundError, getErrorMessage } from '@shared/errorUtils';

const logger = getAzureLogger('shared/dailyPostLimitService');

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type DailyActionType = 'post' | 'comment' | 'appeal';

export interface DailyCounterDocument {
  id: string;
  userId: string;
  counterType: DailyActionType;
  date: string;
  count: number;
  updatedAt: number;
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

export abstract class DailyActionLimitExceededError extends Error {
  readonly code: string;
  readonly payloadCode: string;
  readonly statusCode: number;
  readonly limit: number;
  readonly currentCount: number;
  readonly tier: UserTier;
  readonly resetDate: string;
  readonly action: DailyActionType;

  constructor(
    result: LimitCheckResult,
    action: DailyActionType,
    code: string,
    payloadCode: string,
    message: string,
    statusCode = 429
  ) {
    super(message);
    this.name = `${action}LimitExceededError`;
    this.action = action;
    this.code = code;
    this.payloadCode = payloadCode;
    this.statusCode = statusCode;
    this.limit = result.limit;
    this.currentCount = result.currentCount;
    this.tier = result.tier;
    this.resetDate = result.resetDate;
  }

  toResponse() {
    return {
      code: this.payloadCode,
      tier: this.tier,
      limit: this.limit,
      current: this.currentCount,
      resetAt: this.resetDate,
      message: this.message,
    };
  }
}

export class DailyPostLimitExceededError extends DailyActionLimitExceededError {
  constructor(result: LimitCheckResult) {
    super(
      result,
      'post',
      'daily_post_limit_reached',
      'DAILY_POST_LIMIT_EXCEEDED',
      'Daily post limit reached. Try again tomorrow.'
    );
  }
}

export class DailyCommentLimitExceededError extends DailyActionLimitExceededError {
  constructor(result: LimitCheckResult) {
    super(
      result,
      'comment',
      'daily_comment_limit_exceeded',
      'DAILY_COMMENT_LIMIT_EXCEEDED',
      'Daily comment limit reached. Try again tomorrow.'
    );
  }
}

export class DailyAppealLimitExceededError extends DailyActionLimitExceededError {
  constructor(result: LimitCheckResult) {
    super(
      result,
      'appeal',
      'daily_appeal_limit_exceeded',
      'DAILY_APPEAL_LIMIT_EXCEEDED',
      'Daily appeal limit reached. Try again tomorrow.'
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COUNTERS_CONTAINER = 'counters';
const COUNTER_TTL_SECONDS = 7 * 24 * 60 * 60;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getUtcDateString(date: Date = new Date()): string {
  const isoString = date.toISOString();
  const datePart = isoString.split('T')[0];
  return datePart ?? isoString.slice(0, 10);
}

export function getNextUtcDateString(date: Date = new Date()): string {
  const nextDay = new Date(date);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  nextDay.setUTCHours(0, 0, 0, 0);
  return nextDay.toISOString();
}

function getCountersContainer(): Container {
  return getCosmosDatabase().container(COUNTERS_CONTAINER);
}

function buildCounterId(userId: string, counterType: DailyActionType, date: string): string {
  return `${userId}:${counterType}:${date}`;
}

function getLimitForAction(action: DailyActionType, tier: string | undefined | null): number {
  switch (action) {
    case 'post':
      return getDailyPostLimit(tier);
    case 'comment':
      return getDailyCommentLimit(tier);
    case 'appeal':
      return getDailyAppealLimit(tier);
  }
}

function createLimitError(action: DailyActionType, result: LimitCheckResult): DailyActionLimitExceededError {
  switch (action) {
    case 'post':
      return new DailyPostLimitExceededError(result);
    case 'comment':
      return new DailyCommentLimitExceededError(result);
    case 'appeal':
      return new DailyAppealLimitExceededError(result);
  }
}

function getActionSlug(action: DailyActionType): string {
  return {
    post: 'posts',
    comment: 'comments',
    appeal: 'appeals',
  }[action];
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getDailyActionCount(
  userId: string,
  action: DailyActionType,
  date: string = getUtcDateString()
): Promise<number> {
  const container = getCountersContainer();
  const counterId = buildCounterId(userId, action, date);

  try {
    const { resource } = await container.item(counterId, userId).read<DailyCounterDocument>();
    return resource?.count ?? 0;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return 0;
    }
    logger.error('getDailyActionCount.error', {
      userId,
      action,
      date,
      error: getErrorMessage(error),
    });
    throw error;
  }
}

export async function checkDailyActionLimit(
  userId: string,
  tier: string | undefined | null,
  action: DailyActionType
): Promise<LimitCheckResult> {
  const normalizedTier = normalizeTier(tier);
  const limit = getLimitForAction(action, tier);
  const date = getUtcDateString();
  const currentCount = await getDailyActionCount(userId, action, date);
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

export async function incrementDailyActionCount(
  userId: string,
  tier: string | undefined | null,
  action: DailyActionType
): Promise<IncrementResult> {
  const container = getCountersContainer();
  const date = getUtcDateString();
  const counterId = buildCounterId(userId, action, date);
  const limit = getLimitForAction(action, tier);
  const now = Date.now();

  try {
    const { resource: existing } = await container.item(counterId, userId).read<DailyCounterDocument>();

    if (existing) {
      const newCount = existing.count + 1;
      await container.item(counterId, userId).replace<DailyCounterDocument>({
        ...existing,
        count: newCount,
        updatedAt: now,
      });

      logger.info('incrementDailyActionCount.updated', {
        userId: userId.slice(0, 8),
        counterType: action,
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
    if (!isNotFoundError(error)) {
      logger.error('incrementDailyActionCount.readError', { userId, action, error: getErrorMessage(error) });
      throw error;
    }
  }

  const newDoc: DailyCounterDocument = {
    id: counterId,
    userId,
    counterType: action,
    date,
    count: 1,
    updatedAt: now,
    ttl: COUNTER_TTL_SECONDS,
  };

  await container.items.create(newDoc);

  logger.info('incrementDailyActionCount.created', {
    userId: userId.slice(0, 8),
    counterType: action,
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

export async function checkAndIncrementDailyActionCount(
  userId: string,
  tier: string | undefined | null,
  action: DailyActionType
): Promise<IncrementResult> {
  const checkResult = await checkDailyActionLimit(userId, tier, action);

  if (!checkResult.allowed) {
    logger.warn('checkAndIncrementDailyActionCount.limitReached', {
      userId: userId.slice(0, 8),
      tier: checkResult.tier,
      count: checkResult.currentCount,
      limit: checkResult.limit,
      counterType: action,
    });
    throw createLimitError(action, checkResult);
  }

  return incrementDailyActionCount(userId, tier, action);
}

export async function enforceDailyPostLimit(
  userId: string,
  tier: string | undefined | null
): Promise<LimitCheckResult> {
  const result = await checkDailyActionLimit(userId, tier, 'post');

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

export async function checkAndIncrementPostCount(
  userId: string,
  tier: string | undefined | null
): Promise<IncrementResult> {
  return checkAndIncrementDailyActionCount(userId, tier, 'post');
}

export async function getDailyPostCount(userId: string, date: string = getUtcDateString()): Promise<number> {
  return getDailyActionCount(userId, 'post', date);
}

export async function checkDailyPostLimit(
  userId: string,
  tier: string | undefined | null
): Promise<LimitCheckResult> {
  return checkDailyActionLimit(userId, tier, 'post');
}

export async function incrementDailyPostCount(
  userId: string,
  tier: string | undefined | null
): Promise<IncrementResult> {
  return incrementDailyActionCount(userId, tier, 'post');
}

export async function checkAndIncrementCommentCount(
  userId: string,
  tier: string | undefined | null
): Promise<IncrementResult> {
  return checkAndIncrementDailyActionCount(userId, tier, 'comment');
}

export async function checkAndIncrementAppealCount(
  userId: string,
  tier: string | undefined | null
): Promise<IncrementResult> {
  return checkAndIncrementDailyActionCount(userId, tier, 'appeal');
}

export const __testing = {
  buildCounterId,
  getLimitForAction,
};
