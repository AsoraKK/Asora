import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { authRequired, parseAuth } from '@shared/middleware/auth';
import { handleCorsAndMethod, unauthorized, serverError } from '@shared/utils/http';

export async function submitAppealRoute(
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
    const { submitAppealHandler } = await import('@moderation/service/appealService');
    return await submitAppealHandler({ request: req, context, userId: principal.id });
  } catch (error) {
    context.log('moderation.appeal.submit.error', error);
    return serverError();
  }
}

app.http('moderation-submit-appeal', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'moderation/appeals',
  handler: submitAppealRoute,
});
