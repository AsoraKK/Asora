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

/**
 * Assumes the authenticated request already exposes JWT claims via `req.principal`.
 * Tier normalization and defaulting to `free` happens inside the shared service.
 */
export type AuthenticatedRequest = HttpRequest & { principal: Principal };

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  context: InvocationContext
) => Promise<HttpResponseInit>;

function buildLimitResponse(error: DailyActionLimitExceededError): HttpResponseInit {
  const payload = error.toResponse();
  return {
    status: error.statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': DAILY_RETRY_AFTER_SECONDS.toString(),
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
      if (error instanceof DailyActionLimitExceededError && error.action === action) {
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

        return buildLimitResponse(error);
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
  return createDailyLimitMiddleware('appeals.submit', handler, 'appeals.create', 'appeal_limit_exceeded');
}
