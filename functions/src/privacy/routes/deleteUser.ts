import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, serverError } from '@shared/utils/http';

type AuthenticatedRequest = HttpRequest & { principal: Principal };

const protectedDeleteUser = requireAuth(async (req: AuthenticatedRequest, context: InvocationContext) => {
  try {
    const { deleteUserHandler } = await import('@privacy/service/deleteService');
    return await deleteUserHandler({ request: req, context, userId: req.principal.sub });
  } catch (error) {
    context.log('privacy.delete.error', { message: (error as Error).message });
    return serverError();
  }
});

export async function deleteUserRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'DELETE', ['DELETE']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }
  return protectedDeleteUser(req, context);
}

app.http('privacy-delete-user', {
  methods: ['DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'user/delete',
  handler: deleteUserRoute,
});
