import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { requireActiveAdmin } from '../adminAuthUtils';
import { extractPreview, fetchContentById, getLatestDecisionSummary } from '../moderationAdminUtils';

function normalizeAppealStatus(status: string | undefined, finalDecision?: string): 'PENDING' | 'APPROVED' | 'REJECTED' {
  const value = (status || '').toLowerCase();
  if (value === 'pending') {
    return 'PENDING';
  }
  if (value === 'approved' || value === 'upheld') {
    return 'APPROVED';
  }
  if (value === 'rejected' || value === 'denied' || value === 'expired') {
    return 'REJECTED';
  }
  if (value === 'resolved') {
    if ((finalDecision || '').toLowerCase() === 'approved') {
      return 'APPROVED';
    }
    if ((finalDecision || '').toLowerCase() === 'rejected') {
      return 'REJECTED';
    }
  }
  return 'REJECTED';
}

export async function getAppealDetail(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const appealId = req.params.appealId;
  if (!appealId) {
    return createErrorResponse(400, 'missing_appeal_id', 'appealId is required');
  }

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

    const content = await fetchContentById(contentType, contentId);
    const doc = content?.document ?? null;

    const decision = await getLatestDecisionSummary(contentId);

    return createSuccessResponse({
      appeal: {
        appealId: appeal.id,
        contentId,
        authorId: appeal.submitterId ?? null,
        submittedAt: appeal.submittedAt ?? null,
        status: normalizeAppealStatus(appeal.status as string | undefined, appeal.finalDecision as string | undefined),
        appealType: appeal.appealType ?? null,
        appealReason: appeal.appealReason ?? null,
        userStatement: appeal.userStatement ?? null,
        evidenceUrls: appeal.evidenceUrls ?? [],
        internalNote: appeal.decisionNote ?? null,
      },
      content: {
        contentId,
        type: contentType,
        createdAt: doc?.createdAt ?? null,
        preview: doc ? extractPreview(contentType, doc) : null,
      },
      originalDecision: {
        decision: 'BLOCKED',
        reasonCodes: decision?.reasonCodes ?? [],
        configVersionUsed: decision?.configVersionUsed ?? null,
        decidedAt: decision?.decidedAt ?? null,
      },
    });
  } catch (error) {
    context.error('admin.appeals.get_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to fetch appeal');
  }
}

app.http('admin_appeals_get', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/appeals/{appealId}',
  handler: requireActiveAdmin(getAppealDetail),
});
