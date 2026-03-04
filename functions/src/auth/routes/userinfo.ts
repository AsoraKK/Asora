import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod } from '@shared/utils/http';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

type AuthenticatedRequest = HttpRequest & { principal: Principal };

const protectedUserInfo = requireAuth(async (req: AuthenticatedRequest, context: InvocationContext) => {
  const { userInfoHandler } = await import('@auth/service/userinfoService');
  return userInfoHandler(req, context);
});

export async function userInfoRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET', 'POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  return protectedUserInfo(req, context);
}

/* istanbul ignore next */
const rateLimitedUserInfo = withRateLimit(
  userInfoRoute,
  (req, context) => getPolicyForFunction('auth-userinfo')
);

app.http('auth-userinfo', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'auth/userinfo',
  handler: rateLimitedUserInfo,
});
