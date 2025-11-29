import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { requirePrivacyAdmin } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { placeLegalHold } from '../service/dsrStore';
import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';

type Authed = HttpRequest & { principal: Principal };
const Schema = z.object({
  scope: z.enum(['user', 'post', 'case']),
  scopeId: z.string().min(3),
  reason: z.string().min(3).max(500),
  expiresAt: z.string().optional(),
});

async function handler(req: Authed): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) return cors.response;
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return createErrorResponse(400, 'invalid_request');
    const now = new Date().toISOString();
    const holdId = uuidv7();
    const hold = {
      id: holdId,
      scope: parsed.data.scope,
      scopeId: parsed.data.scopeId,
      reason: parsed.data.reason,
      requestedBy: req.principal.sub,
      startedAt: now,
      expiresAt: parsed.data.expiresAt,
      active: true,
      audit: [
        {
          at: now,
          by: req.principal.sub,
          event: 'placed',
          note: parsed.data.reason,
        },
      ],
    };
    await placeLegalHold(hold as any);
    return createSuccessResponse({ id: hold.id, scope: hold.scope, scopeId: hold.scopeId });
  } catch (error: any) {
    return createErrorResponse(500, 'internal_error', error?.message);
  }
}

const protectedHandler = requirePrivacyAdmin(handler);

app.http('privacy-admin-dsr-place-hold', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/dsr/legal-holds',
  handler: protectedHandler,
});
