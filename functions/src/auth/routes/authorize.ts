import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { handleCorsAndMethod } from '@shared/utils/http';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

export async function authorizeRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const { authorizeHandler } = await import('@auth/service/authorizeService');
  return authorizeHandler(req, context);
}

/* istanbul ignore next */
const rateLimitedAuthorize = withRateLimit(
  authorizeRoute,
  (req, context) => getPolicyForFunction('auth-authorize')
);

app.http('auth-authorize', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'auth/authorize',
  handler: rateLimitedAuthorize,
});
