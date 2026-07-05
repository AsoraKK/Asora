import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { Principal } from '@shared/middleware/auth';
import {
  checkAndIncrementDailyActionCount,
  DailyActionLimitExceededError,
  DailyActionType,
} from '@shared/services/dailyPostLimitService';
import { trackAppEvent } from '@shared/appInsights';
import { getAzureLogger } from '@shared/utils/logger';

const logger = getAzureLogger('shared/dailyPostLimit');
const DAILY_RETRY_AFTER_SECONDS = 86400;

function extractTraceId(context: InvocationContext): string | null {
  const traceParent =
    context.traceContext?.traceParent ?? (context.traceContext as { traceparent?: string } | undefined)?.traceparent;
  if (!traceParent) {
    return null;
  }

  const segments = traceParent.split('-');
  return segments.length >= 3 ? (segments[1] ?? null) : null;
}

function toResetUnixSeconds(resetDate: string): string {
  const resetAt = Date.parse(resetDate);
  if (Number.isNaN(resetAt)) {
    return '0';
  }
  return Math.max(0, Math.ceil(resetAt / 1000)).toString();
}

/**
 * Type guard to check if an error is a DailyActionLimitExceededError.
 * Uses property checking instead of instanceof to avoid issues with class inheritance in CommonJS.
 */
function isDailyActionLimitExceededError(error: unknown): error is DailyActionLimitExceededError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'action' in error &&
    'code' in error &&
    'statusCode' in error &&
    'tier' in error &&
    'currentCount' in error &&
    'toResponse' in error
  );
}

/**
 * Assumes the authenticated request already exposes JWT claims via `req.principal`.
 * Tier normalization and defaulting to `free` happens inside the shared service.
 */
export type AuthenticatedRequest = HttpRequest & { principal: Principal };

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  context: InvocationContext
) => Promise<HttpResponseInit>;

function buildLimitResponse(
  error: DailyActionLimitExceededError,
  context: InvocationContext
): HttpResponseInit {
  const payload = error.toResponse(extractTraceId(context));
  const limit = typeof payload.limit === 'number' ? payload.limit : 0;
  const resetAt = typeof payload.resetAt === 'string' ? payload.resetAt : error.resetDate;
  return {
    status: error.statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': DAILY_RETRY_AFTER_SECONDS.toString(),
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': toResetUnixSeconds(resetAt),
    },
    body: JSON.stringify(payload),
  };
}

function createDailyLimitMiddleware(
  action: DailyActionType,
  handler: AuthenticatedHandler,
  logPrefix: string,
  trackEventName: string
): AuthenticatedHandler {
  return async (req, context) => {
    try {
      const limitResult = await checkAndIncrementDailyActionCount(
        req.principal.sub,
        req.principal.tier,
        action
      );

      context.log(`${logPrefix}.limitCheck`, {
        userId: req.principal.sub.slice(0, 8),
        tier: req.principal.tier,
        newCount: limitResult.newCount,
        remaining: limitResult.remaining,
        limit: limitResult.limit,
      });
    } catch (error) {
      if (isDailyActionLimitExceededError(error) && error.action === action) {
        logger.warn(`${logPrefix}.limitExceeded`, {
          userId: req.principal.sub.slice(0, 8),
          tier: error.tier,
          currentCount: error.currentCount,
        });

        trackAppEvent({
          name: trackEventName,
          properties: {
            authorId: req.principal.sub,
            tier: error.tier,
            currentCount: error.currentCount,
            limit: error.limit,
          },
        });

        return buildLimitResponse(error, context);
      }
      throw error;
    }

    return handler(req, context);
  };
}

export function withDailyPostLimit(handler: AuthenticatedHandler): AuthenticatedHandler {
  return createDailyLimitMiddleware('post', handler, 'posts.create', 'post_limit_exceeded');
}

export function withDailyCommentLimit(handler: AuthenticatedHandler): AuthenticatedHandler {
  return createDailyLimitMiddleware('comment', handler, 'comments.create', 'comment_limit_exceeded');
}

export function withDailyAppealLimit(handler: AuthenticatedHandler): AuthenticatedHandler {
  return createDailyLimitMiddleware('appeal', handler, 'appeals.create', 'appeal_limit_exceeded');
}
