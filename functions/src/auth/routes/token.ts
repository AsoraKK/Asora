import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { handleCorsAndMethod } from '@shared/utils/http';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

export async function tokenRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  // Defer service import to avoid module-level initialization
  const { tokenHandler } = await import('@auth/service/tokenService');
  return tokenHandler(req, context);
}

/* istanbul ignore next */
const rateLimitedTokenRoute = withRateLimit(
  tokenRoute,
  (req, context) => getPolicyForFunction('auth-token')
);

app.http('auth-token', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'auth/token',
  handler: rateLimitedTokenRoute,
});
