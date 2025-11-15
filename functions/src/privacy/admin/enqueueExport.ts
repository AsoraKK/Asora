import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { ensurePrivacyAdmin } from '../common/authz';
import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';
import { createDsrRequest } from '../service/dsrStore';
import { enqueueDsrMessage } from '../common/storage';
import { createAuditEntry, DsrRequest } from '../common/models';

type Authed = HttpRequest & { principal: Principal };

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const Schema = z.object({
  userId: z.string().regex(UUID_V7_REGEX, 'uuidv7'),
  note: z.string().max(500).optional(),
});

async function handler(req: Authed, context: InvocationContext): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) return cors.response;
  try {
    ensurePrivacyAdmin(req.principal);
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(400, 'invalid_request', 'validation failed');
    }
    const { userId, note } = parsed.data;
    const requestedBy = req.principal?.sub;
    if (!requestedBy) {
      return createErrorResponse(500, 'internal_error', 'missing principal subject');
    }
    const id = uuidv7();
    const now = new Date().toISOString();
    const request: DsrRequest = {
      id,
      type: 'export',
      userId,
      requestedBy,
      requestedAt: now,
      note,
      status: 'queued',
      attempt: 0,
      review: {},
      audit: [createAuditEntry({ by: requestedBy, event: 'export.enqueued', meta: note ? { note } : undefined })],
    };
    await createDsrRequest(request);
    await enqueueDsrMessage({ id, type: 'export', submittedAt: now });
    context.log('dsr.export.enqueued', { id, userId });
    return createSuccessResponse({ id, status: request.status });
  } catch (error: any) {
    context.log('dsr.export.enqueue.error', { message: error?.message });
    return createErrorResponse(500, 'internal_error', error?.message);
  }
}

const protectedHandler = requireAuth(handler);

app.http('privacy-admin-dsr-enqueue-export', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/dsr/export',
  handler: protectedHandler,
});
