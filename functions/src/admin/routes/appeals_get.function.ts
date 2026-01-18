import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { requireActiveAdmin } from '../adminAuthUtils';
import { extractPreview, fetchContentById, getLatestDecisionSummary } from '../moderationAdminUtils';

interface VoteSummary {
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  votingStatus: string | null;
  expiresAt: string | null;
  timeRemainingSeconds: number | null;
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
    const voteSummary = buildVoteSummary(appeal as Record<string, unknown>);

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
        votesFor: voteSummary.votesFor,
        votesAgainst: voteSummary.votesAgainst,
        totalVotes: voteSummary.totalVotes,
        votingStatus: voteSummary.votingStatus,
        expiresAt: voteSummary.expiresAt,
        timeRemainingSeconds: voteSummary.timeRemainingSeconds,
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
