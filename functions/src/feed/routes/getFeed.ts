import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { parseAuth } from '@shared/middleware/auth';
import { createSuccessResponse, serverError } from '@shared/utils/http';
import { HttpError } from '@shared/utils/errors';
import { ChaosError } from '@shared/chaos/chaosInjectors';
import { getChaosContext } from '@shared/chaos/chaosConfig';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

export async function getFeed(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const principal = await parseAuth(req);
    const cursor = typeof req.query?.get === 'function' ? req.query.get('cursor') ?? null : null;
    const since = typeof req.query?.get === 'function' ? req.query.get('since') ?? null : null;
    const limit = typeof req.query?.get === 'function' ? req.query.get('limit') ?? null : null;
    const authorId = typeof req.query?.get === 'function' ? req.query.get('authorId') ?? null : null;
    const chaosContext = getChaosContext(req);

    // Defer service import to avoid module-level initialization
    const { getFeed: getFeedService } = await import('@feed/service/feedService');
    const result = await getFeedService({
      principal: principal ?? null,
      context,
      cursor,
      since,
      limit,
      authorId,
      chaosContext,
    });

    return createSuccessResponse(result.body, {
      ...result.headers,
      Vary: 'Authorization',
      'Cache-Control': principal ? 'private, no-store' : 'public, max-age=60, stale-while-revalidate=30',
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        status: error.status,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: error.message }),
      };
    }

    if (error instanceof ChaosError) {
      return {
        status: error.status,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            code: error.code,
            kind: error.kind,
            message: error.message,
          },
        }),
      };
    }

    context.log('feed.get.error', { message: (error as Error).message });
    return serverError();
  }
}

/* istanbul ignore next */
const rateLimitedGetFeed = withRateLimit(getFeed, (req, context) => getPolicyForFunction('getFeed'));

app.http('getFeed', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'feed',
  handler: rateLimitedGetFeed,
});
