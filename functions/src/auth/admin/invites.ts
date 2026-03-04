/**
 * Admin Invite Endpoints
 *
 * POST /admin/invites - Create a new invite code
 * GET /admin/invites - List invite codes
 * DELETE /admin/invites/{code} - Delete an invite code
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireActiveAdmin } from '@admin/adminAuthUtils';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { validateEmail } from '@shared/utils/validate';
import { recordAdminAudit } from '@admin/auditLogger';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForRoute } from '@rate-limit/policies';
import {
  createInvite,
  listInvitesPage,
  getInvite,
  revokeInvite,
} from '../service/inviteStore';

type Authed = HttpRequest & { principal: Principal };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_EXPIRY_DAYS = 30;
const MAX_EXPIRY_DAYS = 365;
const DEFAULT_MAX_USES = 1;
const MAX_MAX_USES = 1000;
const MAX_BATCH_SIZE = 200;

function parseMaxUses(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_MAX_USES) {
    return null;
  }
  return parsed;
}

function resolveUsageCount(invite: { usageCount?: number; usedAt?: string | null }): number {
  if (typeof invite.usageCount === 'number' && Number.isFinite(invite.usageCount)) {
    return Math.max(0, Math.floor(invite.usageCount));
  }
  return invite.usedAt ? 1 : 0;
}

function resolveMaxUses(invite: { maxUses?: number }): number {
  if (typeof invite.maxUses === 'number' && Number.isFinite(invite.maxUses)) {
    return Math.max(1, Math.floor(invite.maxUses));
  }
  return DEFAULT_MAX_USES;
}

function resolveInviteStatus(invite: {
  revokedAt?: string | null;
  expiresAt?: string;
  maxUses?: number;
  usageCount?: number;
  usedAt?: string | null;
}): 'ACTIVE' | 'REVOKED' | 'EXHAUSTED' {
  if (invite.revokedAt) {
    return 'REVOKED';
  }
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return 'EXHAUSTED';
  }
  const usageCount = resolveUsageCount(invite);
  const maxUses = resolveMaxUses(invite);
  if (usageCount >= maxUses) {
    return 'EXHAUSTED';
  }
  return 'ACTIVE';
}

/**
 * POST /admin/invites
 * Create a new invite code.
 */
export async function createInviteHandler(req: Authed, context: InvocationContext): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) return cors.response;

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    // Optional email restriction
    let email: string | undefined;
    if (body.email && typeof body.email === 'string') {
      const emailValidation = validateEmail(body.email);
      if (!emailValidation.valid) {
        return createErrorResponse(400, 'invalid_email', 'Invalid email format');
      }
      email = body.email.toLowerCase();
    }

    // Optional expiry in days
    let expiresInDays = DEFAULT_EXPIRY_DAYS;
    if (body.expiresInDays !== undefined) {
      const days = Number(body.expiresInDays);
      if (!Number.isInteger(days) || days < 1 || days > MAX_EXPIRY_DAYS) {
        return createErrorResponse(
          400,
          'invalid_expiry',
          `expiresInDays must be an integer between 1 and ${MAX_EXPIRY_DAYS}`
        );
      }
      expiresInDays = days;
    }

    const maxUses = parseMaxUses(body.maxUses);
    if (body.maxUses !== undefined && maxUses === null) {
      return createErrorResponse(
        400,
        'invalid_max_uses',
        `maxUses must be an integer between 1 and ${MAX_MAX_USES}`
      );
    }

    const label = typeof body.label === 'string' ? body.label.trim() : undefined;

    const invite = await createInvite({
      email,
      createdBy: req.principal.sub,
      expiresInDays,
      maxUses: maxUses ?? DEFAULT_MAX_USES,
      label,
    });

    context.log('admin.invites.created', {
      inviteCode: invite.inviteCode,
      email: email ?? 'any',
      createdBy: req.principal.sub,
    });

    await recordAdminAudit({
      actorId: req.principal.sub,
      action: 'INVITE_CREATE',
      subjectId: invite.inviteCode,
      targetType: 'invite',
      reasonCode: 'INVITE_CREATE',
      note: label ?? null,
      before: null,
      after: {
        status: 'ACTIVE',
        maxUses: invite.maxUses,
      },
      correlationId: context.invocationId,
    });

    const usageCount = resolveUsageCount(invite);
    const status = resolveInviteStatus(invite);

    return createSuccessResponse({
      inviteCode: invite.inviteCode,
      email: invite.email,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      maxUses: invite.maxUses,
      usageCount,
      lastUsedAt: invite.lastUsedAt ?? invite.usedAt ?? null,
      label: invite.label ?? null,
      status,
    }, { 'Content-Type': 'application/json' }, 201);
  } catch (error) {
    context.error('admin.invites.create_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to create invite');
  }
}

interface BatchCreateRequest {
  count?: number;
  maxUses?: number;
  label?: string;
  expiresInDays?: number;
}

export async function createInviteBatchHandler(
  req: Authed,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) return cors.response;

  try {
    const body = await req.json().catch(() => ({})) as BatchCreateRequest;
    const count = Number(body.count ?? 0);
    if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH_SIZE) {
      return createErrorResponse(
        400,
        'invalid_count',
        `count must be an integer between 1 and ${MAX_BATCH_SIZE}`
      );
    }

    const maxUses = parseMaxUses(body.maxUses);
    if (body.maxUses !== undefined && maxUses === null) {
      return createErrorResponse(
        400,
        'invalid_max_uses',
        `maxUses must be an integer between 1 and ${MAX_MAX_USES}`
      );
    }

    let expiresInDays = DEFAULT_EXPIRY_DAYS;
    if (body.expiresInDays !== undefined) {
      const days = Number(body.expiresInDays);
      if (!Number.isInteger(days) || days < 1 || days > MAX_EXPIRY_DAYS) {
        return createErrorResponse(
          400,
          'invalid_expiry',
          `expiresInDays must be an integer between 1 and ${MAX_EXPIRY_DAYS}`
        );
      }
      expiresInDays = days;
    }

    const label = typeof body.label === 'string' ? body.label.trim() : undefined;

    const invites = [];
    for (let i = 0; i < count; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const invite = await createInvite({
        createdBy: req.principal.sub,
        expiresInDays,
        maxUses: maxUses ?? DEFAULT_MAX_USES,
        label,
      });
      invites.push(invite);
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await recordAdminAudit({
      actorId: req.principal.sub,
      action: 'INVITE_BATCH_CREATE',
      subjectId: batchId,
      targetType: 'invite',
      reasonCode: 'INVITE_BATCH_CREATE',
      note: label ?? null,
      before: null,
      after: { count, maxUses: maxUses ?? DEFAULT_MAX_USES },
      correlationId: context.invocationId,
      metadata: { inviteCodes: invites.map((invite) => invite.inviteCode) },
    });

    return createSuccessResponse({
      count: invites.length,
      invites: invites.map((invite) => ({
        inviteCode: invite.inviteCode,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        usageCount: resolveUsageCount(invite),
        lastUsedAt: invite.lastUsedAt ?? invite.usedAt ?? null,
        label: invite.label ?? null,
        status: resolveInviteStatus(invite),
      })),
    }, { 'Content-Type': 'application/json' }, 201);
  } catch (error) {
    context.error('admin.invites.batch_create_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to create invite batch');
  }
}

/**
 * GET /admin/invites
 * List invite codes.
 */
export async function listInvitesHandler(req: Authed, context: InvocationContext): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) return cors.response;

  try {
    // Parse query parameters
    const createdBy = req.query.get('createdBy') ?? undefined;
    const unusedOnly = req.query.get('unused') === 'true';
    const limitParam = req.query.get('limit');
    const cursor = req.query.get('cursor') ?? undefined;

    // Parse limit
    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (isNaN(parsed) || parsed < 1) {
        return createErrorResponse(400, 'invalid_limit', 'limit must be a positive integer');
      }
      limit = Math.min(parsed, MAX_LIMIT);
    }

    const page = await listInvitesPage({
      createdBy,
      unused: unusedOnly,
      limit,
      cursor,
    });

    return createSuccessResponse({
      invites: page.items.map(inv => ({
        inviteCode: inv.inviteCode,
        email: inv.email,
        createdBy: inv.createdBy,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        maxUses: resolveMaxUses(inv),
        usageCount: resolveUsageCount(inv),
        lastUsedAt: inv.lastUsedAt ?? inv.usedAt ?? null,
        status: resolveInviteStatus(inv),
        label: inv.label ?? null,
      })),
      count: page.items.length,
      nextCursor: page.continuationToken,
    });
  } catch (error) {
    context.error('admin.invites.list_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to list invites');
  }
}

/**
 * GET /admin/invites/{code}
 * Get a single invite by code.
 */
export async function getInviteHandler(req: Authed, context: InvocationContext): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) return cors.response;

  try {
    const code = req.params.code;
    if (!code) {
      return createErrorResponse(400, 'missing_code', 'Invite code is required');
    }

    const invite = await getInvite(code);
    if (!invite) {
      return createErrorResponse(404, 'not_found', 'Invite not found');
    }

    return createSuccessResponse({
      inviteCode: invite.inviteCode,
      email: invite.email,
      createdBy: invite.createdBy,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      maxUses: resolveMaxUses(invite),
      usageCount: resolveUsageCount(invite),
      lastUsedAt: invite.lastUsedAt ?? invite.usedAt ?? null,
      usedByUserId: invite.usedByUserId,
      status: resolveInviteStatus(invite),
      label: invite.label ?? null,
    });
  } catch (error) {
    context.error('admin.invites.get_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to get invite');
  }
}

/**
 * DELETE /admin/invites/{code}
 * Delete an invite code.
 */
interface RevokeInviteBody {
  reasonCode?: string;
  note?: string;
}

async function revokeInviteInternal(req: Authed, context: InvocationContext): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST', 'DELETE']);
  if (cors.shouldReturn && cors.response) return cors.response;

  try {
    const code = req.params.code;
    if (!code) {
      return createErrorResponse(400, 'missing_code', 'Invite code is required');
    }

    const body = (await req.json().catch(() => null)) as RevokeInviteBody | null;
    const reasonCode = body?.reasonCode?.trim() || 'INVITE_REVOKE';
    const note = body?.note?.trim() || null;

    const revoked = await revokeInvite(code, req.principal.sub);
    if (!revoked) {
      return createErrorResponse(404, 'not_found', 'Invite not found');
    }

    await recordAdminAudit({
      actorId: req.principal.sub,
      action: 'INVITE_REVOKE',
      subjectId: code.toUpperCase(),
      targetType: 'invite',
      reasonCode,
      note,
      before: { status: 'ACTIVE' },
      after: { status: 'REVOKED' },
      correlationId: context.invocationId,
    });

    context.log('admin.invites.revoked', { inviteCode: code, revokedBy: req.principal.sub });

    return createSuccessResponse({ revoked: true });
  } catch (error) {
    context.error('admin.invites.revoke_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to revoke invite');
  }
}

export async function revokeInviteHandler(req: Authed, context: InvocationContext): Promise<HttpResponseInit> {
  return revokeInviteInternal(req, context);
}

export async function deleteInviteHandler(req: Authed, context: InvocationContext): Promise<HttpResponseInit> {
  return revokeInviteInternal(req, context);
}

// Route registration with admin auth guard
// Combined handler for POST/GET on same route (Azure Functions v4 has issues with separate handlers)
app.http('admin-invites', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/invites',
  handler: withRateLimit(
    requireActiveAdmin(async (req: Authed, context: InvocationContext): Promise<HttpResponseInit> => {
      const method = req.method?.toUpperCase();
      if (method === 'POST') {
        return createInviteHandler(req, context);
      } else if (method === 'GET') {
        return listInvitesHandler(req, context);
      } else if (method === 'OPTIONS') {
        return handleCorsAndMethod('OPTIONS', ['GET', 'POST']).response!;
      }
      return createErrorResponse(405, 'method_not_allowed', `Method ${method} not allowed`);
    }),
    (req) => getPolicyForRoute(req)
  ),
});

app.http('admin-invites-batch', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/invites/batch',
  handler: withRateLimit(requireActiveAdmin(createInviteBatchHandler), (req) => getPolicyForRoute(req)),
});

app.http('admin-invites-get', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/invites/{code}',
  handler: requireActiveAdmin(getInviteHandler),
});

app.http('admin-invites-delete', {
  methods: ['DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/invites/{code}',
  handler: withRateLimit(requireActiveAdmin(deleteInviteHandler), (req) => getPolicyForRoute(req)),
});

app.http('admin-invites-revoke', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/invites/{code}/revoke',
  handler: withRateLimit(requireActiveAdmin(revokeInviteHandler), (req) => getPolicyForRoute(req)),
});
