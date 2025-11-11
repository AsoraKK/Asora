import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { ensurePrivacyAdmin } from '../common/authz';
import { getDsrRequest, patchDsrRequest } from '../service/dsrStore';
import { enqueueDsrMessage } from '../common/storage';
import { createAuditEntry } from '../common/models';

type Authed = HttpRequest & { principal: Principal };

async function handler(req: Authed): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) return cors.response;
  try {
    ensurePrivacyAdmin(req.principal);
    const id = req.params?.id;
    if (!id) return createErrorResponse(400, 'missing_id');
    const existing = await getDsrRequest(id);
    if (!existing) return createErrorResponse(404, 'not_found');
    if (!['failed', 'canceled'].includes(existing.status)) {
      return createErrorResponse(409, 'invalid_state', 'only failed/canceled can retry');
    }
    const updated = await patchDsrRequest(
      id,
      { status: 'queued', failureReason: undefined },
      createAuditEntry({ by: req.principal.sub, event: 'dsr.retry' }),
    );
    await enqueueDsrMessage({ id, type: existing.type, submittedAt: new Date().toISOString() });
    return createSuccessResponse({ id: updated.id, status: updated.status });
  } catch (error: any) {
    return createErrorResponse(500, 'internal_error', error?.message);
  }
}

const protectedHandler = requireAuth(handler);

app.http('privacy-admin-dsr-retry', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/dsr/{id}/retry',
  handler: protectedHandler,
});
