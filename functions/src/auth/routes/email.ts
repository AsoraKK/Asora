import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';

import { handleCorsAndMethod } from '@shared/utils/http';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

export async function emailLoginRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }
  const { emailLoginHandler } = await import('@auth/service/emailLoginService');
  return emailLoginHandler(req, context);
}

app.http('auth-email-login', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'auth/email',
  handler: withRateLimit(emailLoginRoute, () => getPolicyForFunction('auth-email-login')),
});
