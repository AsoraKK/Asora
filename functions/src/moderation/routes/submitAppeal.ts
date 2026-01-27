import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { requireActiveUser } from '@shared/middleware/activeUser';
import { withDeviceIntegrity } from '@shared/middleware/deviceIntegrity';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, serverError } from '@shared/utils/http';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';
import { withDailyAppealLimit } from '@shared/middleware/dailyPostLimit';

type AuthenticatedRequest = HttpRequest & { principal: Principal };

const tierLimitedSubmitAppeal = requireActiveUser(
  withDeviceIntegrity(
    withDailyAppealLimit(async (req: AuthenticatedRequest, context: InvocationContext) => {
      try {
        const { submitAppealHandler } = await import('@moderation/service/appealService');
        return await submitAppealHandler({ request: req, context, userId: req.principal.sub });
      } catch (error) {
        context.log('moderation.appeal.submit.error', { message: (error as Error).message });
        return serverError();
      }
    })
  )
);

export async function submitAppealRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  return tierLimitedSubmitAppeal(req, context);
}

/* istanbul ignore next */
const rateLimitedSubmitAppeal = withRateLimit(
  submitAppealRoute,
  (req, context) => getPolicyForFunction('moderation-submit-appeal')
);

app.http('moderation-submit-appeal', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'moderation/appeals',
  handler: rateLimitedSubmitAppeal,
});
