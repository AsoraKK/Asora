import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { ensurePrivacyAdmin } from '../common/authz';
import { getDsrRequest, patchDsrRequest } from '../service/dsrStore';
import { createAuditEntry } from '../common/models';
import { isBeyondRetention } from '../common/retention';
import { createUserDelegationUrl } from '../common/storage';

type Authed = HttpRequest & { principal: Principal };
const TTL = Number(process.env.DSR_EXPORT_SIGNED_URL_TTL_HOURS ?? '12');
const RETENTION_DAYS = Number(process.env.DSR_EXPORT_RETENTION_DAYS ?? '30');

export async function releaseHandler(req: Authed): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) return cors.response;
  try {
    ensurePrivacyAdmin(req.principal);
    const id = req.params?.id;
    if (!id) return createErrorResponse(400, 'missing_id');
    const existing = await getDsrRequest(id);
    if (!existing) return createErrorResponse(404, 'not_found');
    if (existing.type !== 'export') return createErrorResponse(409, 'invalid_type');
    if (existing.status !== 'ready_to_release') return createErrorResponse(409, 'invalid_state');
    if (!existing.exportBlobPath) return createErrorResponse(409, 'missing_blob');
    if (isBeyondRetention(existing.completedAt, RETENTION_DAYS)) {
      return createErrorResponse(409, 'retention_expired', 'export older than retention window');
    }
    const { url, expiresAt } = await createUserDelegationUrl(existing.exportBlobPath, TTL);
    const updated = await patchDsrRequest(
      id,
      { status: 'released' },
      createAuditEntry({ by: req.principal.sub, event: 'export.released', meta: { expiresAt } }),
    );
    // Do NOT persist SAS URL. Return only in response.
    return createSuccessResponse({
      id: updated.id,
      status: updated.status,
      downloadUrl: url,
      signedUrl: url,
      expiresAt,
    });
  } catch (error: any) {
    return createErrorResponse(500, 'internal_error', error?.message);
  }
}

const protectedHandler = requireAuth(releaseHandler);

app.http('privacy-admin-dsr-release', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/dsr/{id}/release',
  handler: protectedHandler,
});
