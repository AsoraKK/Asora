/**
 * Admin Invite Endpoints
 *
 * POST /admin/invites - Create a new invite code
 * GET /admin/invites - List invite codes
 * DELETE /admin/invites/{code} - Delete an invite code
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAdmin } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { validateEmail } from '@shared/utils/validate';
import {
  createInvite,
  listInvites,
  getInvite,
  deleteInvite,
} from '../service/inviteStore';

type Authed = HttpRequest & { principal: Principal };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_EXPIRY_DAYS = 30;
const MAX_EXPIRY_DAYS = 365;

/**
 * POST /admin/invites
 * Create a new invite code.
 */
export async function createInviteHandler(req: Authed, context: InvocationContext): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) return cors.response;

  try {
    const body = await req.json().catch(() => ({})) as any;

    // Optional email restriction
    let email: string | undefined;
    if (body.email) {
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

    const invite = await createInvite({
      email,
      createdBy: req.principal.sub,
      expiresInDays,
    });

    context.log('admin.invites.created', {
      inviteCode: invite.inviteCode,
      email: email ?? 'any',
      createdBy: req.principal.sub,
    });

    return createSuccessResponse({
      inviteCode: invite.inviteCode,
      email: invite.email,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    }, { 'Content-Type': 'application/json' }, 201);
  } catch (error) {
    context.error('admin.invites.create_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to create invite');
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

    // Parse limit
    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (isNaN(parsed) || parsed < 1) {
        return createErrorResponse(400, 'invalid_limit', 'limit must be a positive integer');
      }
      limit = Math.min(parsed, MAX_LIMIT);
    }

    const invites = await listInvites({
      createdBy,
      unused: unusedOnly,
      limit,
    });

    return createSuccessResponse({
      invites: invites.map(inv => ({
        inviteCode: inv.inviteCode,
        email: inv.email,
        createdBy: inv.createdBy,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        usedAt: inv.usedAt,
        usedByUserId: inv.usedByUserId,
      })),
      count: invites.length,
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
      usedAt: invite.usedAt,
      usedByUserId: invite.usedByUserId,
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
export async function deleteInviteHandler(req: Authed, context: InvocationContext): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'DELETE', ['DELETE']);
  if (cors.shouldReturn && cors.response) return cors.response;

  try {
    const code = req.params.code;
    if (!code) {
      return createErrorResponse(400, 'missing_code', 'Invite code is required');
    }

    const deleted = await deleteInvite(code);
    if (!deleted) {
      return createErrorResponse(404, 'not_found', 'Invite not found');
    }

    context.log('admin.invites.deleted', { inviteCode: code, deletedBy: req.principal.sub });

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    context.error('admin.invites.delete_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to delete invite');
  }
}

// Route registration with admin auth guard
app.http('admin-invites-create', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/invites',
  handler: requireAdmin(createInviteHandler),
});

app.http('admin-invites-list', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/invites',
  handler: requireAdmin(listInvitesHandler),
});

app.http('admin-invites-get', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/invites/{code}',
  handler: requireAdmin(getInviteHandler),
});

app.http('admin-invites-delete', {
  methods: ['DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/invites/{code}',
  handler: requireAdmin(deleteInviteHandler),
});
