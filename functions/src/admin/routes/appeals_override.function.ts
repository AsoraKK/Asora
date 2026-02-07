import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { v7 as uuidv7 } from 'uuid';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { requireActiveModerator } from '../adminAuthUtils';
import { fetchContentById } from '../moderationAdminUtils';
import { recordAdminAudit } from '../auditLogger';

type OverrideDecision = 'allow' | 'block';
type OverrideReasonCode = 'policy_exception' | 'false_positive' | 'safety_risk' | 'other';
type AppealStatus = 'pending' | 'approved' | 'rejected' | 'overridden';

interface OverrideBody {
  decision?: OverrideDecision;
  reasonCode?: OverrideReasonCode;
  reasonNote?: string;
}

const VALID_REASON_CODES = new Set<OverrideReasonCode>([
  'policy_exception',
  'false_positive',
  'safety_risk',
  'other',
]);

function normalizeDecision(value: unknown): OverrideDecision | null {
  const decision = typeof value === 'string' ? value.toLowerCase() : '';
  if (decision === 'allow' || decision === 'block') {
    return decision;
  }
  return null;
}

function normalizeReasonCode(value: unknown): OverrideReasonCode | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (VALID_REASON_CODES.has(trimmed as OverrideReasonCode)) {
    return trimmed as OverrideReasonCode;
  }
  return null;
}

function toSafeCount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.floor(parsed));
}

function normalizeAppealStatus(status: string | undefined, finalDecision?: string): AppealStatus {
  const value = (status || '').toLowerCase();
  if (value === 'overridden') {
    return 'overridden';
  }
  if (value === 'pending') {
    return 'pending';
  }
  if (value === 'approved' || value === 'upheld') {
    return 'approved';
  }
  if (value === 'rejected' || value === 'denied' || value === 'expired') {
    return 'rejected';
  }
  if (value === 'resolved') {
    const decision = (finalDecision || '').toLowerCase();
    if (decision === 'approved' || decision === 'allow') {
      return 'approved';
    }
    if (decision === 'rejected' || decision === 'block') {
      return 'rejected';
    }
  }
  return 'rejected';
}

function normalizeFinalDecision(value: unknown): OverrideDecision | null {
  const decision = typeof value === 'string' ? value.toLowerCase() : '';
  if (decision === 'allow' || decision === 'approved' || decision === 'upheld') {
    return 'allow';
  }
  if (decision === 'block' || decision === 'rejected' || decision === 'denied') {
    return 'block';
  }
  return null;
}

function hasReachedQuorum(appeal: Record<string, unknown>, totalVotes: number): boolean {
  const required = toSafeCount(appeal.requiredVotes);
  const reachedFlag = typeof appeal.hasReachedQuorum === 'boolean' ? appeal.hasReachedQuorum : null;
  if (reachedFlag !== null) {
    return reachedFlag;
  }
  return required > 0 && totalVotes >= required;
}

function buildSuccessResponse(appealId: string, decision: OverrideDecision) {
  return createSuccessResponse({
    appealId,
    status: 'overridden',
    finalDecision: decision,
  });
}

export async function overrideAppeal(
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

  const body = (await req.json().catch(() => null)) as OverrideBody | null;
  const decision = normalizeDecision(body?.decision);
  if (!decision) {
    return createErrorResponse(400, 'invalid_decision', 'decision must be allow or block');
  }

  const reasonCode = normalizeReasonCode(body?.reasonCode);
  if (!reasonCode) {
    return createErrorResponse(400, 'missing_reason', 'reasonCode is required');
  }

  const reasonNote = typeof body?.reasonNote === 'string' ? body.reasonNote.trim() : '';
  if (reasonNote.length > 500) {
    return createErrorResponse(400, 'note_too_long', 'reasonNote must be 500 characters or less');
  }

  const idempotencyKey = req.headers.get('idempotency-key')?.trim() || null;
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

    const appeal = resources[0] as Record<string, unknown> | undefined;
    if (!appeal || !appeal.contentType) {
      return createErrorResponse(404, 'not_found', 'Appeal not found');
    }

    const contentType = String(appeal.contentType);
    const contentId = String(appeal.contentId);

    const voteFor = toSafeCount(appeal.votesFor);
    const voteAgainst = toSafeCount(appeal.votesAgainst);
    const totalVotes = toSafeCount(appeal.totalVotes) || voteFor + voteAgainst;
    const status = normalizeAppealStatus(
      appeal.status as string | undefined,
      appeal.finalDecision as string | undefined
    );
    const storedDecision = normalizeFinalDecision(appeal.finalDecision);
    const quorumReached = hasReachedQuorum(appeal, totalVotes);

    if (status === 'overridden') {
      const storedKey = typeof appeal.overrideIdempotencyKey === 'string' ? appeal.overrideIdempotencyKey : null;
      if (storedDecision === decision && (!storedKey || (idempotencyKey && storedKey === idempotencyKey))) {
        return buildSuccessResponse(appealId, decision);
      }
      return createErrorResponse(409, 'appeal_overridden', 'Appeal already overridden');
    }

    if (!(status === 'pending' || (quorumReached && storedDecision === null))) {
      return createErrorResponse(409, 'override_not_allowed', 'Override is not allowed for this appeal');
    }

    const contentLookup = await fetchContentById(
      contentType as 'post' | 'comment' | 'user',
      contentId
    );
    if (!contentLookup) {
      return createErrorResponse(404, 'content_not_found', 'Content not found');
    }

    const { container, document, partitionKey } = contentLookup;
    const updatedAtValue = typeof document.updatedAt === 'number' ? Date.now() : nowIso;
    const contentStatus = decision === 'allow' ? 'published' : 'blocked';

    const contentPatch: import('@azure/cosmos').PatchOperation[] = [
      { op: 'set' as const, path: '/status', value: contentStatus },
      { op: 'set' as const, path: '/appealStatus', value: 'overridden' },
      { op: 'set' as const, path: '/updatedAt', value: updatedAtValue },
    ];

    if (decision === 'allow') {
      contentPatch.push({ op: 'set' as const, path: '/restoredAt', value: nowIso });
    } else {
      contentPatch.push({ op: 'set' as const, path: '/blockedAt', value: nowIso });
    }

    if (document.moderation) {
      contentPatch.push({
        op: 'set' as const,
        path: '/moderation/status',
        value: decision === 'allow' ? 'clean' : 'blocked',
      });
      contentPatch.push({
        op: 'set' as const,
        path: '/moderation/checkedAt',
        value: Date.now(),
      });
    }

    const appealPatch: import('@azure/cosmos').PatchOperation[] = [
      { op: 'set' as const, path: '/status', value: 'overridden' },
      { op: 'set' as const, path: '/finalDecision', value: decision },
      { op: 'set' as const, path: '/updatedAt', value: nowIso },
      { op: 'set' as const, path: '/resolvedAt', value: nowIso },
      { op: 'set' as const, path: '/resolvedBy', value: actorId },
      { op: 'set' as const, path: '/decisionReasonCode', value: reasonCode },
      { op: 'set' as const, path: '/decisionNote', value: reasonNote || null },
    ];

    if (idempotencyKey) {
      appealPatch.push({ op: 'set' as const, path: '/overrideIdempotencyKey', value: idempotencyKey });
    }

    const appealItem = db.appeals.item(appealId, contentId);
    const appealPatchOptions = appeal._etag
      ? {
          accessCondition: {
            type: 'IfMatch',
            condition: String(appeal._etag),
          },
        }
      : undefined;
    try {
      await appealItem.patch(appealPatch, appealPatchOptions);
    } catch (error) {
      const statusCode = (error as { code?: number; statusCode?: number }).statusCode;
      if (statusCode === 412) {
        return createErrorResponse(409, 'override_conflict', 'Appeal override already processed');
      }
      throw error;
    }

    await container.item(contentId, partitionKey).patch(contentPatch);

    await db.moderationDecisions.items.create({
      id: uuidv7(),
      itemId: contentId,
      contentId,
      contentType,
      appealId,
      actorId,
      actorRole: 'moderator',
      action: 'override',
      decision,
      reasonCode,
      reasonNote: reasonNote || null,
      createdAt: nowIso,
      decidedAt: nowIso,
      _partitionKey: contentId,
      idempotencyKey: idempotencyKey ?? null,
    });

    await recordAdminAudit({
      actorId,
      action: 'APPEAL_OVERRIDE',
      subjectId: appealId,
      targetType: 'appeal',
      reasonCode,
      note: reasonNote || null,
      before: {
        status,
        finalDecision: storedDecision,
        totalVotes,
        quorumReached,
      },
      after: {
        status: 'overridden',
        finalDecision: decision,
      },
      correlationId: context.invocationId,
      metadata: {
        contentId,
        contentType,
        idempotencyKey: idempotencyKey ?? null,
      },
    });

    return buildSuccessResponse(appealId, decision);
  } catch (error) {
    context.error('admin.appeals.override_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to override appeal');
  }
}

app.http('admin_appeals_override', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/appeals/{appealId}/override',
  handler: requireActiveModerator(overrideAppeal),
});
