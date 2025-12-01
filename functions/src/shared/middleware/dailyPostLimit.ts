import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { Principal } from '@shared/middleware/auth';
import { checkAndIncrementPostCount, DailyPostLimitExceededError } from '@shared/services/dailyPostLimitService';
import { trackAppEvent } from '@shared/appInsights';
import { getAzureLogger } from '@shared/utils/logger';

const logger = getAzureLogger('shared/dailyPostLimit');

/**
 * Assumes the authenticated request already exposes JWT claims via `req.principal`.
 * Tier normalization and defaulting to `free` happens inside the shared service.
 */
export type AuthenticatedRequest = HttpRequest & { principal: Principal };

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  context: InvocationContext
) => Promise<HttpResponseInit>;

export function withDailyPostLimit(handler: AuthenticatedHandler): AuthenticatedHandler {
  return async (req, context) => {
    try {
      const limitResult = await checkAndIncrementPostCount(req.principal.sub, req.principal.tier);
      context.log('posts.create.limitCheck', {
        userId: req.principal.sub.slice(0, 8),
        tier: limitResult.tier,
        newCount: limitResult.newCount,
        remaining: limitResult.remaining,
        limit: limitResult.limit,
      });
    } catch (error) {
      if (error instanceof DailyPostLimitExceededError) {
        logger.warn('posts.create.limitExceeded', {
          userId: req.principal.sub.slice(0, 8),
          tier: error.tier,
          currentCount: error.currentCount,
        });

        trackAppEvent({
          name: 'post_limit_exceeded',
          properties: {
            authorId: req.principal.sub,
            tier: error.tier,
            currentCount: error.currentCount,
            limit: error.limit,
          },
        });

        const payload = {
          code: 'DAILY_POST_LIMIT_EXCEEDED',
          tier: error.tier,
          limit: error.limit,
          resetAt: error.resetDate,
          message: 'Daily post limit reached. Try again tomorrow.',
        };

        return {
          status: error.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '86400',
          },
          body: JSON.stringify(payload),
        };
      }
      throw error;
    }

    return handler(req, context);
  };
}
