import { v7 as uuidv7 } from 'uuid';
import { getTargetDatabase } from '@shared/clients/cosmos';
import type { ModerationCase, ModerationCaseResponse, ModerationDecision } from '@shared/types/openapi';

const decisionsContainer = getTargetDatabase().moderationDecisions;

function mapDecisionResource(resource: Record<string, any>): ModerationDecision {
  return {
    id: resource.id,
    caseId: resource.caseId,
    userId: resource.actorId ?? resource.userId ?? 'unknown',
    action: resource.action as ModerationDecision['action'],
    rationale: resource.rationale ?? resource.reason ?? undefined,
    createdAt: resource.decidedAt ?? resource.createdAt ?? new Date().toISOString(),
  };
}

function mapActionToStatus(action: string | undefined): ModerationCase['status'] {
  switch (action) {
    case 'approve':
      return 'approved';
    case 'reject':
      return 'rejected';
    case 'escalate':
      return 'escalated';
    default:
      return 'pending';
  }
}

export async function getModerationCaseById(caseId: string): Promise<ModerationCaseResponse | null> {
  const { resources } = await decisionsContainer.items
    .query(
      {
        query: 'SELECT * FROM c WHERE c.caseId = @caseId ORDER BY c.decidedAt DESC',
        parameters: [{ name: '@caseId', value: caseId }],
      },
      { maxItemCount: 20 }
    )
    .fetchAll();

  if (!resources?.length) {
    return null;
  }

  const decisions = resources.map(mapDecisionResource);
  if (!decisions.length) {
    return null;
  }
  const latest = decisions[0]!;
  const metadata = resources[0]?.metadata ?? {};
  const aiConfidence = metadata?.urgencyScore;
  const targetId = resources[0]?.contentId ?? resources[0]?.itemId ?? caseId;
  const targetType = (resources[0]?.contentType as ModerationCase['targetType']) ?? 'post';
  const reason = metadata?.reason ?? resources[0]?.reason ?? 'Under review';

  const moderationCase: ModerationCase = {
    id: caseId,
    targetId,
    targetType,
    reason,
    aiConfidence,
    reporterIds: metadata?.reporterIds ?? [],
    status: mapActionToStatus(latest.action),
    createdAt: resources[0]?.createdAt ?? latest.createdAt,
    updatedAt: resources[0]?.decidedAt ?? latest.createdAt,
  };

  return {
    case: moderationCase,
    decisions,
  };
}

export async function createModerationDecision(
  caseId: string,
  userId: string,
  action: ModerationDecision['action'],
  rationale?: string
): Promise<ModerationDecision> {
  const now = new Date().toISOString();
  const decisionId = uuidv7();
  const document = {
    id: decisionId,
    caseId,
    itemId: caseId,
    contentId: caseId,
    contentType: 'post',
    action,
    rationale,
    actorId: userId,
    userId,
    decidedAt: now,
    createdAt: now,
    metadata: {
      reason: rationale,
      severity: 'medium',
    },
  };

  await decisionsContainer.items.create({ ...document, partitionKey: caseId });
  return mapDecisionResource(document);
}

export function hasModeratorRole(roles: string[]): boolean {
  return roles.includes('moderator') || roles.includes('admin');
}
