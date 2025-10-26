import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { authRequired, parseAuth } from '@shared/middleware/auth';
import { handleCorsAndMethod, unauthorized, serverError } from '@shared/utils/http';

export async function voteOnAppealRoute(
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
    // Azure Functions v4: params is an object, not a Map
    const appealId = req.params.appealId as string | undefined;
    
    // Defer service import to avoid module-level initialization
    const { voteOnAppealHandler } = await import('@moderation/service/voteService');
    return await voteOnAppealHandler({
      request: req,
      context,
      userId: principal.id,
      claims: principal.claims,
      appealId,
    });
  } catch (error) {
    context.log('moderation.appeal.vote.error', error);
    return serverError();
  }
}

app.http('moderation-vote-appeal', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'moderation/appeals/{appealId}/vote',
  handler: voteOnAppealRoute,
});
