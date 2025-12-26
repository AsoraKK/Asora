import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { requirePrivacyAdmin } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { getErrorMessage } from '@shared/errorUtils';
import { clearLegalHold } from '../service/dsrStore';

type Authed = HttpRequest & { principal: Principal };

async function handler(req: Authed): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) return cors.response;
  try {
    const id = req.params?.id;
    if (!id) return createErrorResponse(400, 'missing_id');
    await clearLegalHold(id);
    return createSuccessResponse({ id, cleared: true });
  } catch (error: unknown) {
    return createErrorResponse(500, 'internal_error', getErrorMessage(error));
  }
}

const protectedHandler = requirePrivacyAdmin(handler);

app.http('privacy-admin-dsr-clear-hold', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/dsr/legal-holds/{id}/clear',
  handler: protectedHandler,
});
