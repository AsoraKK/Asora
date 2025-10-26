import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { handleCorsAndMethod } from '@shared/utils/http';

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

app.http('auth-authorize', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'auth/authorize',
  handler: authorizeRoute,
});
