import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { requireModerator } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, serverError } from '@shared/utils/http';

type AuthenticatedRequest = HttpRequest & { principal: Principal };

/**
 * Review Queue - Requires moderator or admin role
 *
 * GET /moderation/review-queue
 * Returns paginated list of flagged content and pending appeals.
 *
 * Query params:
 *   - limit: number (default 20, max 100)
 *   - continuationToken: string (for pagination)
 *   - type: 'flag' | 'appeal' | 'all' (default 'all')
 */
const protectedReviewQueue = requireModerator(async (req: AuthenticatedRequest, context: InvocationContext) => {
  try {
    const { getReviewQueueHandler } = await import('@moderation/service/reviewQueueService');

    // Parse query parameters
    const limitParam = req.query.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const continuationToken = req.query.get('continuationToken') ?? undefined;
    const filterType = req.query.get('type') as 'flag' | 'appeal' | 'all' | undefined;

    return await getReviewQueueHandler({
      context,
      limit,
      continuationToken,
      filterType: filterType || 'all',
    });
  } catch (error) {
    context.log('moderation.reviewQueue.route.error', { message: (error as Error).message });
    return serverError();
  }
});

export async function reviewQueueRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  return protectedReviewQueue(req, context);
}

app.http('moderation-review-queue', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'moderation/review-queue',
  handler: reviewQueueRoute,
});
