import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { requireActiveAdmin } from '../adminAuthUtils';
import { recordAdminAudit } from '../auditLogger';
import { fetchContentById } from '../moderationAdminUtils';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForRoute } from '@rate-limit/policies';

type AppealDecision = 'approve' | 'reject';

interface AppealDecisionBody {
  reasonCode?: string;
  note?: string;
}

const DECISION_TO_STATUS: Record<AppealDecision, 'approved' | 'rejected'> = {
  approve: 'approved',
  reject: 'rejected',
};

const DECISION_TO_AUDIT: Record<AppealDecision, 'APPEAL_APPROVE' | 'APPEAL_REJECT'> = {
  approve: 'APPEAL_APPROVE',
  reject: 'APPEAL_REJECT',
};

async function handleAppealDecision(
  decision: AppealDecision,
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const appealId = req.params.appealId;
  if (!appealId) {
    return createErrorResponse(400, 'missing_appeal_id', 'appealId is required');
  }

  const body = (await req.json().catch(() => null)) as AppealDecisionBody | null;
  const reasonCode = body?.reasonCode?.trim();
  if (!reasonCode) {
    return createErrorResponse(400, 'missing_reason', 'reasonCode is required');
  }
  const note = body?.note?.trim() || null;

  const actorId = (req as HttpRequest & { principal: { sub: string } }).principal.sub;
  const nowIso = new Date().toISOString();

  try {
    const db = getTargetDatabase();
    const { resources } = await db.appeals.items
      .query(
        {
          query: 'SELECT * FROM c WHERE c.id = @appealId',
          parameters: [{ name: '@appealId', value: appealId }],
        },
        { maxItemCount: 1 }
      )
      .fetchAll();

    const appeal = resources[0];
    if (!appeal || !appeal.contentType) {
      return createErrorResponse(404, 'not_found', 'Appeal not found');
    }

    const contentType = appeal.contentType as 'post' | 'comment' | 'user';
    const contentId = appeal.contentId as string;
    const contentLookup = await fetchContentById(contentType, contentId);
    if (!contentLookup) {
      return createErrorResponse(404, 'content_not_found', 'Content not found');
    }

    const { container, document, partitionKey } = contentLookup;
    const updatedAtValue = typeof document.updatedAt === 'number' ? Date.now() : nowIso;
    const contentStatus = decision === 'approve' ? 'published' : 'blocked';

    const contentPatch: import('@azure/cosmos').PatchOperation[] = [
      { op: 'set' as const, path: '/status', value: contentStatus },
      { op: 'set' as const, path: '/appealStatus', value: DECISION_TO_STATUS[decision] },
      { op: 'set' as const, path: '/updatedAt', value: updatedAtValue },
    ];

    if (decision === 'approve') {
      contentPatch.push({ op: 'set' as const, path: '/restoredAt', value: nowIso });
    } else {
      contentPatch.push({ op: 'set' as const, path: '/blockedAt', value: nowIso });
    }

    if (document.moderation) {
      contentPatch.push({
        op: 'set' as const,
        path: '/moderation/status',
        value: decision === 'approve' ? 'clean' : 'blocked',
      });
      contentPatch.push({
        op: 'set' as const,
        path: '/moderation/checkedAt',
        value: Date.now(),
      });
    }

    await container.item(contentId, partitionKey).patch(contentPatch);

    await db.appeals.item(appeal.id, appeal.contentId).patch([
      { op: 'set' as const, path: '/status', value: DECISION_TO_STATUS[decision] },
      { op: 'set' as const, path: '/finalDecision', value: DECISION_TO_STATUS[decision] },
      { op: 'set' as const, path: '/updatedAt', value: nowIso },
      { op: 'set' as const, path: '/resolvedAt', value: nowIso },
      { op: 'set' as const, path: '/resolvedBy', value: actorId },
      { op: 'set' as const, path: '/decisionReasonCode', value: reasonCode },
      { op: 'set' as const, path: '/decisionNote', value: note },
    ]);

    await recordAdminAudit({
      actorId,
      action: DECISION_TO_AUDIT[decision],
      subjectId: appeal.id,
      targetType: 'appeal',
      reasonCode,
      note,
      before: { status: appeal.status ?? 'pending' },
      after: { status: DECISION_TO_STATUS[decision].toUpperCase() },
      correlationId: context.invocationId,
      metadata: { contentId, contentType },
    });

    return createSuccessResponse({
      appealId: appeal.id,
      status: DECISION_TO_STATUS[decision].toUpperCase(),
      contentId,
      contentStatus: contentStatus.toUpperCase(),
    });
  } catch (error) {
    context.error('admin.appeals.decision_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to update appeal');
  }
}

export async function approveAppeal(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return handleAppealDecision('approve', req, context);
}

export async function rejectAppeal(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return handleAppealDecision('reject', req, context);
}

app.http('admin_appeals_approve', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/appeals/{appealId}/approve',
  handler: withRateLimit(requireActiveAdmin(approveAppeal), (req) => getPolicyForRoute(req)),
});

app.http('admin_appeals_reject', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/appeals/{appealId}/reject',
  handler: withRateLimit(requireActiveAdmin(rejectAppeal), (req) => getPolicyForRoute(req)),
});
