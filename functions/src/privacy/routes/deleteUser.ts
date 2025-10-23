import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { authRequired, parseAuth } from '@shared/middleware/auth';
import { handleCorsAndMethod, unauthorized, serverError } from '@shared/utils/http';

import { deleteUserHandler } from '@privacy/service/deleteService';

export async function deleteUserRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'DELETE', ['DELETE']);
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
    return await deleteUserHandler({ request: req, context, userId: principal.id });
  } catch (error) {
    context.log('privacy.delete.error', error);
    return serverError();
  }
}

app.http('privacy-delete-user', {
  methods: ['DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'user/delete',
  handler: deleteUserRoute,
});
