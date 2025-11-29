import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { requirePrivacyAdmin } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { getDsrRequest, patchDsrRequest } from '../service/dsrStore';
import { createAuditEntry } from '../common/models';

type Authed = HttpRequest & { principal: Principal };

async function handler(req: Authed): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) return cors.response;
  try {
    const id = req.params?.id;
    if (!id) return createErrorResponse(400, 'missing_id');
    const existing = await getDsrRequest(id);
    if (!existing) return createErrorResponse(404, 'not_found');
    if (!['queued', 'running'].includes(existing.status)) {
      return createErrorResponse(409, 'invalid_state');
    }
    const updated = await patchDsrRequest(
      id,
      { status: 'canceled', completedAt: new Date().toISOString() },
      createAuditEntry({ by: req.principal.sub, event: 'dsr.canceled' }),
    );
    return createSuccessResponse({ id: updated.id, status: updated.status });
  } catch (error: any) {
    return createErrorResponse(500, 'internal_error', error?.message);
  }
}

const protectedHandler = requirePrivacyAdmin(handler);

app.http('privacy-admin-dsr-cancel', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/dsr/{id}/cancel',
  handler: protectedHandler,
});
