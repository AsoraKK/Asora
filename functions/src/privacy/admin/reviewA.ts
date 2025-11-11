import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { ensurePrivacyAdmin } from '../common/authz';
import { getDsrRequest, patchDsrRequest } from '../service/dsrStore';
import { createAuditEntry } from '../common/models';
import { z } from 'zod';

type Authed = HttpRequest & { principal: Principal };
const Schema = z.object({ pass: z.boolean(), notes: z.string().max(500).optional() });

async function handler(req: Authed): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) return cors.response;
  try {
    ensurePrivacyAdmin(req.principal);
    const id = req.params?.id;
    if (!id) return createErrorResponse(400, 'missing_id');
    const existing = await getDsrRequest(id);
    if (!existing) return createErrorResponse(404, 'not_found');
    if (existing.status !== 'awaiting_review' && existing.status !== 'ready_to_release') {
      return createErrorResponse(409, 'invalid_state');
    }
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return createErrorResponse(400, 'invalid_request');
    const reviewerA = {
      by: req.principal.sub,
      at: new Date().toISOString(),
      pass: parsed.data.pass,
      notes: parsed.data.notes,
    };
    const nextStatus = parsed.data.pass && existing.review.reviewerB?.pass ? 'ready_to_release' : existing.status;
    const updated = await patchDsrRequest(
      id,
      { status: nextStatus, review: { reviewerA } },
      createAuditEntry({ by: req.principal.sub, event: 'review.a' }),
    );
    return createSuccessResponse({ id: updated.id, status: updated.status, review: updated.review });
  } catch (error: any) {
    return createErrorResponse(500, 'internal_error', error?.message);
  }
}

const protectedHandler = requireAuth(handler);

app.http('privacy-admin-dsr-reviewA', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/dsr/{id}/reviewA',
  handler: protectedHandler,
});
