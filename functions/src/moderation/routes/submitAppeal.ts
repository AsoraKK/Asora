import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, serverError } from '@shared/utils/http';

type AuthenticatedRequest = HttpRequest & { principal: Principal };

const protectedSubmitAppeal = requireAuth(async (req: AuthenticatedRequest, context: InvocationContext) => {
  try {
    const { submitAppealHandler } = await import('@moderation/service/appealService');
    return await submitAppealHandler({ request: req, context, userId: req.principal.sub });
  } catch (error) {
    context.log('moderation.appeal.submit.error', { message: (error as Error).message });
    return serverError();
  }
});

export async function submitAppealRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  return protectedSubmitAppeal(req, context);
}

app.http('moderation-submit-appeal', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'moderation/appeals',
  handler: submitAppealRoute,
});
