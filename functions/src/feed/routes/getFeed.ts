import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { parseAuth } from '@shared/middleware/auth';
import { ok, serverError } from '@shared/utils/http';

import { getFeed as getFeedService } from '@feed/service/feedService';

export async function getFeed(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const principal = parseAuth(req);
    const result = await getFeedService({ principal, context });

    const response = ok(result.body);
    response.headers = {
      ...response.headers,
      ...result.headers,
      Vary: 'Authorization',
      'Cache-Control': principal.kind === 'user' ? 'private, no-store' : 'public, max-age=60',
    };
    return response;
  } catch (error) {
    context.log('feed.get.error', error);
    return serverError();
  }
}

app.http('getFeed', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'feed',
  handler: getFeed,
});
