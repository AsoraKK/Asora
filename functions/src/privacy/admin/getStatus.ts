import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { requirePrivacyAdmin } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { getErrorMessage } from '@shared/errorUtils';
import { getDsrRequest } from '../service/dsrStore';

type Authed = HttpRequest & { principal: Principal };

async function handler(req: Authed): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) return cors.response;
  try {
    const id = req.params?.id || req.query.get('id');
    if (!id) {
      return createErrorResponse(400, 'missing_id');
    }
    const request = await getDsrRequest(id);
    if (!request) return createErrorResponse(404, 'not_found');
    return createSuccessResponse(request);
  } catch (error: unknown) {
    return createErrorResponse(500, 'internal_error', getErrorMessage(error));
  }
}

const protectedHandler = requirePrivacyAdmin(handler);

app.http('privacy-admin-dsr-status', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/dsr/{id}',
  handler: protectedHandler,
});
