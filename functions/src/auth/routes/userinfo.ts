import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { authRequired, parseAuth } from '@shared/middleware/auth';
import { handleCorsAndMethod, unauthorized } from '@shared/utils/http';

export async function userInfoRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET', 'POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const principal = parseAuth(req);
  try {
    authRequired(principal);
  } catch {
    return unauthorized();
  }

  // Defer service import to avoid module-level initialization
  const { userInfoHandler } = await import('@auth/service/userinfoService');
  return userInfoHandler(req, context);
}

app.http('auth-userinfo', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'auth/userinfo',
  handler: userInfoRoute,
});
