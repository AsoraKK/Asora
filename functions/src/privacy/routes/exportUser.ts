import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { authRequired, parseAuth } from '@shared/middleware/auth';
import { handleCorsAndMethod, unauthorized, serverError } from '@shared/utils/http';

import { exportUserHandler } from '@privacy/service/exportService';

export async function exportUserRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
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
    return await exportUserHandler({ request: req, context, userId: principal.id });
  } catch (error) {
    context.log('privacy.export.error', error);
    return serverError();
  }
}

app.http('privacy-export-user', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'user/export',
  handler: exportUserRoute,
});
