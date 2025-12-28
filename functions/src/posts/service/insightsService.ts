/**
 * Post Insights Service
 *
 * Provides sanitized moderation insights for post authors and admins.
 * Returns risk bands (LOW/MEDIUM/HIGH) without exposing raw scores/thresholds.
 *
 * Privacy: No raw scores, probabilities, or threshold values are returned.
 */

import { getTargetDatabase } from '@shared/clients/cosmos';
import type { ModerationDecisionRecord, ModerationDecisionOutcome } from '../../moderation/service/decisionLogger';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH';

export type AppealStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type InsightDecision = 'ALLOW' | 'BLOCK' | 'QUEUE';

/**
 * Appeal information for insights response
 */
export interface InsightAppeal {
  status: AppealStatus;
  updatedAt?: string;
}

/**
 * Sanitized insights response - no raw scores or thresholds
 */
export interface PostInsightsResponse {
  postId: string;
  riskBand: RiskBand;
  decision: InsightDecision;
  reasonCodes: string[];
  configVersion: number;
  decidedAt: string;
  appeal: InsightAppeal;
}

/**
 * Fields that must NEVER appear in insights response
 * Used by tests to verify sanitization
 */
export const FORBIDDEN_INSIGHT_FIELDS = [
  'score',
  'scores',
  'probability',
  'threshold',
  'severity',
  'confidence',
  'categoryScores',
  'flagThreshold',
  'removeThreshold',
] as const;

// ─────────────────────────────────────────────────────────────
// Band Mapping
// ─────────────────────────────────────────────────────────────

/**
 * Map internal decision outcome to risk band
 *
 * This is the ONLY way to derive bands - never from raw scores.
 *
 * Mapping:
 *   BLOCK -> HIGH
 *   QUEUE -> MEDIUM
 *   ALLOW -> LOW
 */
export function mapDecisionToRiskBand(decision: ModerationDecisionOutcome): RiskBand {
  switch (decision) {
    case 'block':
      return 'HIGH';
    case 'queue':
      return 'MEDIUM';
    case 'allow':
      return 'LOW';
    default:
      // Conservative default for unknown outcomes
      return 'MEDIUM';
  }
}

/**
 * Map internal decision to display decision
 */
export function mapDecisionToInsightDecision(decision: ModerationDecisionOutcome): InsightDecision {
  switch (decision) {
    case 'block':
      return 'BLOCK';
    case 'queue':
      return 'QUEUE';
    case 'allow':
      return 'ALLOW';
    default:
      return 'QUEUE';
  }
}

/**
 * Sanitize reason codes - keep only category-level codes, no numerics
 */
export function sanitizeReasonCodes(reasonCodes: string[]): string[] {
  // Filter out any codes that might contain numeric values
  return reasonCodes.filter((code) => {
    // Keep category-level codes only
    const allowed = [
      'HIVE_SCORE_OVER_THRESHOLD',
      'HIVE_SCORE_OVER_FLAG_THRESHOLD',
      'HIVE_SCORE_UNDER_THRESHOLD',
      'FALLBACK_USED',
      'PROVIDER_ERROR_QUEUE',
      'AUTO_MODERATION_DISABLED',
      'EMPTY_CONTENT',
      'NO_API_KEY',
    ];
    return allowed.includes(code);
  });
}

// ─────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────

/**
 * Get the latest moderation decision for a post
 *
 * Queries moderation_decisions container with itemId = postId,
 * ordered by createdAt descending to get the most recent decision.
 */
export async function getLatestModerationDecision(
  postId: string
): Promise<ModerationDecisionRecord | null> {
  const db = getTargetDatabase();
  const container = db.moderationDecisions;

  // Query for latest decision for this post
  const { resources } = await container.items
    .query<ModerationDecisionRecord>({
      query: `
        SELECT TOP 1 *
        FROM c
        WHERE c.itemId = @postId
        ORDER BY c.createdAt DESC
      `,
      parameters: [{ name: '@postId', value: postId }],
    })
    .fetchAll();

  return resources[0] ?? null;
}

/**
 * Get appeal status for a post/case
 *
 * Searches the appeals container for any appeal related to this post.
 * Maps the internal status to the InsightAppeal format.
 */
export async function getAppealForPost(postId: string): Promise<InsightAppeal> {
  try {
    const db = getTargetDatabase();
    const appealsContainer = db.appeals;

    // Query for appeals related to this post (contentId or caseId matches postId)
    const { resources } = await appealsContainer.items
      .query({
        query: `
          SELECT TOP 1 *
          FROM c
          WHERE c.contentId = @postId OR c.caseId = @postId
          ORDER BY c.updatedAt DESC
        `,
        parameters: [{ name: '@postId', value: postId }],
      })
      .fetchAll();

    if (resources.length === 0) {
      return { status: 'NONE' };
    }

    const appeal = resources[0];
    // Map internal status to insight status
    let status: AppealStatus;
    switch (appeal.status) {
      case 'pending':
        status = 'PENDING';
        break;
      case 'upheld':
      case 'approved':
        status = 'APPROVED';
        break;
      case 'denied':
      case 'rejected':
        status = 'REJECTED';
        break;
      default:
        status = 'NONE';
    }

    return {
      status,
      updatedAt: appeal.updatedAt,
    };
  } catch (error) {
    // If appeals container doesn't exist or query fails, return NONE
    // This handles the case where appeals feature isn't fully implemented
    console.warn(`[insightsService] Failed to fetch appeal for ${postId}: ${(error as Error).message}`);
    return { status: 'NONE' };
  }
}

/**
 * Build sanitized insights response
 *
 * Transforms internal moderation data into a safe response format
 * that doesn't expose raw scores, thresholds, or sensitive metadata.
 */
export function buildInsightsResponse(
  postId: string,
  decision: ModerationDecisionRecord | null,
  appeal: InsightAppeal
): PostInsightsResponse {
  // If no decision exists, return conservative defaults
  if (!decision) {
    return {
      postId,
      riskBand: 'LOW',
      decision: 'ALLOW',
      reasonCodes: [],
      configVersion: 0,
      decidedAt: new Date().toISOString(),
      appeal,
    };
  }

  return {
    postId,
    riskBand: mapDecisionToRiskBand(decision.decision),
    decision: mapDecisionToInsightDecision(decision.decision),
    reasonCodes: sanitizeReasonCodes(decision.reasonCodes),
    configVersion: decision.thresholdsUsed?.configVersion ?? 0,
    decidedAt: decision.createdAt,
    appeal,
  };
}

/**
 * Verify that a response object doesn't contain forbidden fields
 *
 * Used by tests to ensure no sensitive data leaks.
 */
export function containsForbiddenFields(obj: unknown): string[] {
  const found: string[] = [];

  function check(value: unknown, path: string) {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === 'object') {
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        const keyLower = key.toLowerCase();
        for (const forbidden of FORBIDDEN_INSIGHT_FIELDS) {
          if (keyLower.includes(forbidden.toLowerCase())) {
            found.push(`${path}.${key}`);
          }
        }
        check(val, `${path}.${key}`);
      }
    }
  }

  check(obj, 'response');
  return found;
}
