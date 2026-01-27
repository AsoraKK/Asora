import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { requireAuth } from '@shared/middleware/auth';
import { withDeviceIntegrity } from '@shared/middleware/deviceIntegrity';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, serverError } from '@shared/utils/http';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

type AuthenticatedRequest = HttpRequest & { principal: Principal };

const protectedFlagContent = requireAuth(
  withDeviceIntegrity(async (req: AuthenticatedRequest, context: InvocationContext) => {
    try {
      const { flagContentHandler } = await import('@moderation/service/flagService');
      return await flagContentHandler({ request: req, context, userId: req.principal.sub });
    } catch (error) {
      context.log('moderation.flag.error', { message: (error as Error).message });
      return serverError();
    }
  })
);

export async function flagContentRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  return protectedFlagContent(req, context);
}

/* istanbul ignore next */
const rateLimitedFlagContent = withRateLimit(
  flagContentRoute,
  (req, context) => getPolicyForFunction('moderation-flag-content')
);

app.http('moderation-flag-content', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'moderation/flag',
  handler: rateLimitedFlagContent,
});
