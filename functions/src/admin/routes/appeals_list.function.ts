import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { requireActiveAdmin } from '../adminAuthUtils';
import { getLatestDecisionSummary } from '../moderationAdminUtils';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

type AppealStatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

function parseLimit(value?: string | null): number {
  if (!value) {
    return DEFAULT_LIMIT;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

function resolveStatusFilter(value?: string | null): AppealStatusFilter {
  switch ((value || '').toLowerCase()) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'all':
      return 'all';
    default:
      return 'pending';
  }
}

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

export async function listAppealsQueue(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const statusFilter = resolveStatusFilter(req.query?.get?.('status'));
  const limit = parseLimit(req.query?.get?.('limit'));
  const cursor = req.query?.get?.('cursor') ?? undefined;

  try {
    const db = getTargetDatabase();
    const statusClause = statusFilter === 'all' ? '' : 'AND c.status = @status';
    const parameters =
      statusFilter === 'all' ? [] : [{ name: '@status', value: statusFilter }];

    const query = {
      query: `
        SELECT c.id, c.contentId, c.submitterId, c.submittedAt, c.status, c.flagCategories, c.flagReason, c.finalDecision
        FROM c
        WHERE IS_DEFINED(c.contentType)
        ${statusClause}
        ORDER BY c.submittedAt ASC
      `,
      parameters,
    };

    const response = await db.appeals.items
      .query(query, { maxItemCount: limit, continuationToken: cursor })
      .fetchNext();

    const items = await Promise.all(
      response.resources.map(async (appeal) => {
        const decision = await getLatestDecisionSummary(appeal.contentId);
        const flagCategories = Array.isArray(appeal.flagCategories) ? appeal.flagCategories : [];
        const reasonCategory =
          (flagCategories[0] as string | undefined) ??
          (appeal.flagReason as string | undefined) ??
          null;

        return {
          appealId: appeal.id,
          contentId: appeal.contentId,
          authorId: appeal.submitterId ?? null,
          submittedAt: appeal.submittedAt ?? null,
          status: normalizeAppealStatus(appeal.status as string | undefined, appeal.finalDecision as string | undefined),
          originalReasonCategory: reasonCategory,
          configVersionUsed: decision?.configVersionUsed ?? null,
        };
      })
    );

    return createSuccessResponse({
      items,
      nextCursor: response.continuationToken ?? null,
      count: items.length,
    });
  } catch (error) {
    context.error('admin.appeals.list_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to list appeals');
  }
}

app.http('admin_appeals_list', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/appeals',
  handler: requireActiveAdmin(listAppealsQueue),
});
