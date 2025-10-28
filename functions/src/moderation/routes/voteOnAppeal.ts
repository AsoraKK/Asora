import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, serverError } from '@shared/utils/http';

type AuthenticatedRequest = HttpRequest & { principal: Principal };

const protectedVoteOnAppeal = requireAuth(async (req: AuthenticatedRequest, context: InvocationContext) => {
  try {
    const appealId = req.params.appealId as string | undefined;
    const { voteOnAppealHandler } = await import('@moderation/service/voteService');
    return await voteOnAppealHandler({
      request: req,
      context,
      userId: req.principal.sub,
      claims: req.principal.claims,
      appealId,
    });
  } catch (error) {
    context.log('moderation.appeal.vote.error', { message: (error as Error).message });
    return serverError();
  }
});

export async function voteOnAppealRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  return protectedVoteOnAppeal(req, context);
}

app.http('moderation-vote-appeal', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'moderation/appeals/{appealId}/vote',
  handler: voteOnAppealRoute,
});
