import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { requireActiveModerator } from '../adminAuthUtils';
import { extractPreview, fetchContentById } from '../moderationAdminUtils';

interface VoteSummary {
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  votingStatus: string | null;
  expiresAt: string | null;
  timeRemainingSeconds: number | null;
}

interface QuorumSummary {
  required: number;
  reached: boolean;
}

type AppealStatus = 'pending' | 'approved' | 'rejected' | 'overridden';

type AuditActorRole = 'system' | 'community' | 'moderator';

interface AuditSummary {
  lastActorRole: AuditActorRole;
  lastAction: string;
  lastActionAt: string;
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

function resolveIsoTimestamp(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }
    if (!Number.isNaN(Date.parse(value))) {
      return value;
    }
  }
  return null;
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

function normalizeFinalDecision(value: unknown, status: AppealStatus): 'allow' | 'block' | null {
  const decision = typeof value === 'string' ? value.toLowerCase() : '';
  if (decision === 'allow' || decision === 'approved' || decision === 'upheld') {
    return 'allow';
  }
  if (decision === 'block' || decision === 'rejected' || decision === 'denied') {
    return 'block';
  }
  if (status === 'approved') {
    return 'allow';
  }
  if (status === 'rejected') {
    return 'block';
  }
  return null;
}

function mapTargetType(value: string | undefined): 'post' | 'comment' | 'profile' {
  if (value === 'comment') {
    return 'comment';
  }
  if (value === 'user' || value === 'profile') {
    return 'profile';
  }
  return 'post';
}

function buildQuorumSummary(appeal: Record<string, unknown>, voteSummary: VoteSummary): QuorumSummary {
  const required = toSafeCount(appeal.requiredVotes);
  const reachedFlag = typeof appeal.hasReachedQuorum === 'boolean' ? appeal.hasReachedQuorum : null;
  const reachedByVotes = required > 0 && voteSummary.totalVotes >= required;
  return {
    required,
    reached: reachedFlag ?? reachedByVotes,
  };
}

function parseRoles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((role): role is string => typeof role === 'string');
  }
  if (typeof value === 'string') {
    return value
      .split(' ')
      .map((role) => role.trim())
      .filter(Boolean);
  }
  return [];
}

function canOverrideAppeal(principal: { roles?: string[] | string } | undefined): boolean {
  const roles = parseRoles(principal?.roles);
  return roles.includes('moderator') || roles.includes('admin');
}

function normalizeAuditRole(record: Record<string, unknown>): AuditActorRole {
  const rawRole = typeof record.actorRole === 'string' ? record.actorRole.toLowerCase() : '';
  if (rawRole === 'moderator' || rawRole === 'system' || rawRole === 'community') {
    return rawRole as AuditActorRole;
  }
  const source = typeof record.source === 'string' ? record.source.toLowerCase() : '';
  const actorId = typeof record.actorId === 'string' ? record.actorId : '';
  if (source === 'appeal_vote' || actorId === 'community_vote') {
    return 'community';
  }
  if (record.provider) {
    return 'system';
  }
  return 'system';
}

async function fetchAppealAuditSummary(
  appealId: string,
  db: ReturnType<typeof getTargetDatabase>
): Promise<AuditSummary | null> {
  const { resources } = await db.moderationDecisions.items
    .query(
      {
        query: `
          SELECT TOP 1 c.action, c.decision, c.actorRole, c.actorId, c.source, c.createdAt, c.decidedAt, c.provider
          FROM c
          WHERE c.appealId = @appealId
          ORDER BY c.createdAt DESC
        `,
        parameters: [{ name: '@appealId', value: appealId }],
      },
      { maxItemCount: 1 }
    )
    .fetchAll();

  const record = resources[0] as Record<string, unknown> | undefined;
  if (!record) {
    return null;
  }

  const lastAction =
    (typeof record.action === 'string' && record.action.trim()) ||
    (typeof record.decision === 'string' && record.decision.trim()) ||
    'appeal_update';

  const lastActionAt =
    resolveIsoTimestamp(record.createdAt, record.decidedAt) ?? new Date().toISOString();

  return {
    lastActorRole: normalizeAuditRole(record),
    lastAction,
    lastActionAt,
  };
}

function buildFallbackAuditSummary(appeal: Record<string, unknown>, status: AppealStatus): AuditSummary {
  const resolvedBy = typeof appeal.resolvedBy === 'string' ? appeal.resolvedBy : '';
  const lastActorRole: AuditActorRole = resolvedBy
    ? resolvedBy === 'community_vote'
      ? 'community'
      : 'moderator'
    : 'community';

  const lastActionAt =
    resolveIsoTimestamp(appeal.updatedAt, appeal.resolvedAt, appeal.submittedAt, appeal.createdAt) ??
    new Date().toISOString();

  return {
    lastActorRole,
    lastAction: status === 'pending' ? 'appeal_submitted' : status,
    lastActionAt,
  };
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
    const targetType = mapTargetType(contentType);

    const content = await fetchContentById(contentType, contentId);
    const doc = content?.document ?? null;

    const voteSummary = buildVoteSummary(appeal as Record<string, unknown>);
    const quorum = buildQuorumSummary(appeal as Record<string, unknown>, voteSummary);
    const status = normalizeAppealStatus(
      appeal.status as string | undefined,
      appeal.finalDecision as string | undefined
    );
    const finalDecision = normalizeFinalDecision(appeal.finalDecision, status);
    const createdAt =
      resolveIsoTimestamp(appeal.createdAt, appeal.submittedAt) ?? new Date().toISOString();
    const lastUpdatedAt =
      resolveIsoTimestamp(appeal.updatedAt, appeal.resolvedAt, appeal.submittedAt, appeal.createdAt) ??
      createdAt;
    const auditSummary =
      (await fetchAppealAuditSummary(appeal.id, db)) ??
      buildFallbackAuditSummary(appeal as Record<string, unknown>, status);
    const principal = (req as HttpRequest & { principal?: { roles?: string[] | string } }).principal;
    const moderatorOverrideAllowed =
      canOverrideAppeal(principal) && (status === 'pending' || (quorum.reached && finalDecision === null));

    return createSuccessResponse({
      appealId: appeal.id,
      targetType,
      targetId: contentId,
      status,
      createdAt,
      lastUpdatedAt,
      votes: {
        for: voteSummary.votesFor,
        against: voteSummary.votesAgainst,
        total: voteSummary.totalVotes,
      },
      quorum,
      moderatorOverrideAllowed,
      finalDecision,
      auditSummary,
      appeal: {
        appealId: appeal.id,
        contentId,
        authorId: appeal.submitterId ?? null,
        submittedAt: appeal.submittedAt ?? null,
        status,
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
        type: targetType,
        createdAt: doc?.createdAt ?? null,
        preview: doc ? extractPreview(contentType, doc) : null,
      },
      originalDecision: {
        decision: 'BLOCKED',
        decidedAt: appeal.submittedAt ?? null,
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
  handler: requireActiveModerator(getAppealDetail),
});
