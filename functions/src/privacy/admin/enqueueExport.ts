import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { ensurePrivacyAdmin } from '../common/authz';
// fallback id generation without uuid v7 to avoid type issues
import { z } from 'zod';
import { createDsrRequest } from '../service/dsrStore';
import { enqueueDsrMessage } from '../common/storage';
import { createAuditEntry, DsrRequest } from '../common/models';

type Authed = HttpRequest & { principal: Principal };

const Schema = z.object({
  userId: z.string().min(3),
  requestedBy: z.string().min(1),
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
    const { userId, requestedBy } = parsed.data;
  const id = `dsr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();
    const request: DsrRequest = {
      id,
      type: 'export',
      userId,
      requestedBy,
      requestedAt: now,
      status: 'queued',
      attempt: 0,
      review: {},
      audit: [createAuditEntry({ by: requestedBy, event: 'export.enqueued' })],
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
