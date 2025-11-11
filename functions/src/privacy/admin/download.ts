import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { ensurePrivacyAdmin } from '../common/authz';
import { getDsrRequest } from '../service/dsrStore';
import { createUserDelegationUrl } from '../common/storage';

type Authed = HttpRequest & { principal: Principal };

async function handler(req: Authed): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) return cors.response;
  try {
    ensurePrivacyAdmin(req.principal);
    const id = req.params?.id;
    if (!id) return createErrorResponse(400, 'missing_id');
    const existing = await getDsrRequest(id);
    if (!existing) return createErrorResponse(404, 'not_found');
    if (existing.type !== 'export') return createErrorResponse(409, 'invalid_type');
    // Only allow download once released; generate a fresh SAS URL on demand.
    if (existing.status !== 'released' && existing.status !== 'succeeded') {
      return createErrorResponse(409, 'not_released');
    }
    if (!existing.exportBlobPath) return createErrorResponse(409, 'missing_blob');
    const ttlHours = Number(process.env.DSR_EXPORT_SIGNED_URL_TTL_HOURS ?? '12');
    const { url, expiresAt } = await createUserDelegationUrl(existing.exportBlobPath, ttlHours);
    return createSuccessResponse({ id: existing.id, signedUrl: url, expiresAt });
  } catch (error: any) {
    return createErrorResponse(500, 'internal_error', error?.message);
  }
}

const protectedHandler = requireAuth(handler);

app.http('privacy-admin-dsr-download', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/dsr/{id}/download',
  handler: protectedHandler,
});
