import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { requireActiveAdmin } from '../adminAuthUtils';
import { recordAdminAudit } from '../auditLogger';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForRoute } from '@rate-limit/policies';

type UserAction = 'disable' | 'enable';

interface UserActionBody {
  reasonCode?: string;
  note?: string;
}

const ACTION_TO_AUDIT: Record<UserAction, 'USER_DISABLE' | 'USER_ENABLE'> = {
  disable: 'USER_DISABLE',
  enable: 'USER_ENABLE',
};

async function handleUserAction(
  action: UserAction,
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const userId = req.params.userId;
  if (!userId) {
    return createErrorResponse(400, 'missing_user_id', 'userId is required');
  }

  const body = (await req.json().catch(() => null)) as UserActionBody | null;
  const reasonCode = body?.reasonCode?.trim();
  const note = body?.note?.trim() || null;

  if (action === 'disable') {
    if (!reasonCode) {
      return createErrorResponse(400, 'missing_reason', 'reasonCode is required');
    }
    if (!note) {
      return createErrorResponse(400, 'missing_note', 'note is required');
    }
  }

  const actorId = (req as HttpRequest & { principal: { sub: string } }).principal.sub;
  const nowIso = new Date().toISOString();

  try {
    const db = getTargetDatabase();
    const { resource: user } = await db.users.item(userId, userId).read();
    if (!user) {
      return createErrorResponse(404, 'not_found', 'User not found');
    }

    const beforeStatus = user.isActive === false ? 'DISABLED' : 'ACTIVE';

    const patchOps: import('@azure/cosmos').PatchOperation[] = [
      { op: 'set' as const, path: '/isActive', value: action === 'enable' },
      { op: 'set' as const, path: '/updatedAt', value: nowIso },
    ];

    if (action === 'disable') {
      patchOps.push({ op: 'set' as const, path: '/disabledAt', value: nowIso });
      patchOps.push({ op: 'set' as const, path: '/disabledBy', value: actorId });
      patchOps.push({ op: 'set' as const, path: '/disabledReasonCode', value: reasonCode });
      patchOps.push({ op: 'set' as const, path: '/disabledNote', value: note });
    } else {
      patchOps.push({ op: 'set' as const, path: '/disabledAt', value: null });
      patchOps.push({ op: 'set' as const, path: '/disabledBy', value: null });
      patchOps.push({ op: 'set' as const, path: '/disabledReasonCode', value: null });
      patchOps.push({ op: 'set' as const, path: '/disabledNote', value: null });
      patchOps.push({ op: 'set' as const, path: '/enabledAt', value: nowIso });
    }

    await db.users.item(userId, userId).patch(patchOps);

    await recordAdminAudit({
      actorId,
      action: ACTION_TO_AUDIT[action],
      subjectId: userId,
      targetType: 'user',
      reasonCode: reasonCode ?? ACTION_TO_AUDIT[action],
      note,
      before: { status: beforeStatus },
      after: { status: action === 'enable' ? 'ACTIVE' : 'DISABLED' },
      correlationId: context.invocationId,
    });

    return createSuccessResponse({
      userId,
      status: action === 'enable' ? 'ACTIVE' : 'DISABLED',
    });
  } catch (error) {
    context.error('admin.users.action_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to update user');
  }
}

export async function disableUser(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return handleUserAction('disable', req, context);
}

export async function enableUser(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return handleUserAction('enable', req, context);
}

app.http('admin_users_disable', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/users/{userId}/disable',
  handler: withRateLimit(requireActiveAdmin(disableUser), (req) => getPolicyForRoute(req)),
});

app.http('admin_users_enable', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/users/{userId}/enable',
  handler: withRateLimit(requireActiveAdmin(enableUser), (req) => getPolicyForRoute(req)),
});
