import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { requireActiveModerator } from '../adminAuthUtils';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

type AppealStatusFilter = 'pending' | 'approved' | 'rejected' | 'overridden' | 'all';

interface VoteSummary {
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  votingStatus: string | null;
  expiresAt: string | null;
  timeRemainingSeconds: number | null;
}

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
    case 'overridden':
      return 'overridden';
    case 'all':
      return 'all';
    default:
      return 'pending';
  }
}

function toSafeCount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.floor(parsed));
}

function buildVoteSummary(appeal: Record<string, unknown>): VoteSummary {
  const votesFor = toSafeCount(appeal.votesFor);
  const votesAgainst = toSafeCount(appeal.votesAgainst);
  const totalRaw = Number(appeal.totalVotes);
  const totalVotes = Number.isFinite(totalRaw)
    ? Math.max(0, Math.floor(totalRaw))
    : votesFor + votesAgainst;
  const votingStatus = typeof appeal.votingStatus === 'string' ? appeal.votingStatus : null;
  const expiresAt = typeof appeal.expiresAt === 'string' ? appeal.expiresAt : null;
  let timeRemainingSeconds: number | null = null;
  if (expiresAt) {
    const diffMs = Date.parse(expiresAt) - Date.now();
    timeRemainingSeconds = diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
  }
  return {
    votesFor,
    votesAgainst,
    totalVotes,
    votingStatus,
    expiresAt,
    timeRemainingSeconds,
  };
}

function normalizeAppealStatus(
  status: string | undefined,
  finalDecision?: string
): 'pending' | 'approved' | 'rejected' | 'overridden' {
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
        const flagCategories = Array.isArray(appeal.flagCategories) ? appeal.flagCategories : [];
        const reasonCategory =
          (flagCategories[0] as string | undefined) ??
          (appeal.flagReason as string | undefined) ??
          null;
        const voteSummary = buildVoteSummary(appeal as Record<string, unknown>);

        return {
          appealId: appeal.id,
          contentId: appeal.contentId,
          authorId: appeal.submitterId ?? null,
          submittedAt: appeal.submittedAt ?? null,
          status: normalizeAppealStatus(appeal.status as string | undefined, appeal.finalDecision as string | undefined),
          originalReasonCategory: reasonCategory,
          votesFor: voteSummary.votesFor,
          votesAgainst: voteSummary.votesAgainst,
          totalVotes: voteSummary.totalVotes,
          votingStatus: voteSummary.votingStatus,
          expiresAt: voteSummary.expiresAt,
          timeRemainingSeconds: voteSummary.timeRemainingSeconds,
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
  handler: requireActiveModerator(listAppealsQueue),
});
