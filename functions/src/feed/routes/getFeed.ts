import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { parseAuth } from '@shared/middleware/auth';
import { ok, serverError } from '@shared/utils/http';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

export async function getFeed(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const principal = await parseAuth(req);

    // Defer service import to avoid module-level initialization
    const { getFeed: getFeedService } = await import('@feed/service/feedService');
    const result = await getFeedService({ principal: principal ?? null, context });

    const response = ok(result.body);
    response.headers = {
      ...response.headers,
      ...result.headers,
      Vary: 'Authorization',
      'Cache-Control': principal ? 'private, no-store' : 'public, max-age=60',
    };
    return response;
  } catch (error) {
    context.log('feed.get.error', error);
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
