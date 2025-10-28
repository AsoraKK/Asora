import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, serverError } from '@shared/utils/http';

type AuthenticatedRequest = HttpRequest & { principal: Principal };

const protectedExportUser = requireAuth(async (req: AuthenticatedRequest, context: InvocationContext) => {
  try {
    const { exportUserHandler } = await import('@privacy/service/exportService');
    return await exportUserHandler({ request: req, context, userId: req.principal.sub });
  } catch (error) {
    context.log('privacy.export.error', { message: (error as Error).message });
    return serverError();
  }
});

export async function exportUserRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  return protectedExportUser(req, context);
}

app.http('privacy-export-user', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'user/export',
  handler: exportUserRoute,
});
