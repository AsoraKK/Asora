import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { authRequired, parseAuth } from '@shared/middleware/auth';
import { handleCorsAndMethod, unauthorized, serverError } from '@shared/utils/http';

export async function flagContentRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const principal = parseAuth(req);
  try {
    authRequired(principal);
  } catch {
    return unauthorized();
  }

  try {
    // Defer service import to avoid module-level initialization
    const { flagContentHandler } = await import('@moderation/service/flagService');
    return await flagContentHandler({ request: req, context, userId: principal.id });
  } catch (error) {
    context.log('moderation.flag.error', error);
    return serverError();
  }
}

app.http('moderation-flag-content', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'moderation/flag',
  handler: flagContentRoute,
});
