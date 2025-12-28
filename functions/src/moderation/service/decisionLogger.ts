/**
 * Moderation Decision Logger
 * 
 * Records AI moderation decisions to Cosmos DB for audit trail and analytics.
 * Each decision captures signals, thresholds used, config version, and outcome.
 * 
 * Privacy: No raw content or PII is stored - only IDs, numeric signals, and reason codes.
 */

import { v7 as uuidv7 } from 'uuid';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { trackAppEvent, trackAppMetric } from '@shared/appInsights';
import type { ModerationConfigEnvelope } from '../config/moderationConfigProvider';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Provider that performed the moderation
 */
export type ModerationProvider = 'hive_v2' | 'azure_content_safety' | 'manual';

/**
 * Decision outcome
 */
export type ModerationDecisionOutcome = 'allow' | 'block' | 'queue';

/**
 * Reason codes for decisions
 */
export type ModerationReasonCode =
  | 'HIVE_SCORE_OVER_THRESHOLD'
  | 'HIVE_SCORE_OVER_FLAG_THRESHOLD'
  | 'HIVE_SCORE_UNDER_THRESHOLD'
  | 'FALLBACK_USED'
  | 'PROVIDER_ERROR_QUEUE'
  | 'AUTO_MODERATION_DISABLED'
  | 'EMPTY_CONTENT'
  | 'NO_API_KEY';

/**
 * Signals from AI moderation (numeric only, no content)
 */
export interface ModerationSignals {
  /** Overall confidence score 0-1 */
  confidence: number;
  /** Scores by category */
  categoryScores?: Record<string, number>;
  /** Flagged categories */
  categories?: string[];
  /** Provider-specific action (e.g., Hive's accept/review/reject) */
  providerAction?: string;
}

/**
 * Thresholds used for the decision
 */
export interface ThresholdsUsed {
  /** Config version used */
  configVersion: number;
  /** Threshold for flagging/queue */
  flagThreshold: number;
  /** Threshold for auto-remove/block */
  removeThreshold: number;
}

/**
 * Input for recording a moderation decision
 */
export interface RecordModerationDecisionInput {
  /** The moderated content identifier */
  itemId: string;
  /** Type of content (post, comment, etc.) */
  contentType: string;
  /** Provider that performed the check */
  provider: ModerationProvider;
  /** Numeric signals from the provider */
  signals: ModerationSignals;
  /** Config envelope with version info */
  configEnvelope: ModerationConfigEnvelope;
  /** Decision outcome */
  decision: ModerationDecisionOutcome;
  /** Reason codes explaining the decision */
  reasonCodes: ModerationReasonCode[];
  /** Request correlation ID */
  correlationId?: string;
  /** Whether fallback was used */
  usedFallback?: boolean;
}

/**
 * The record written to Cosmos DB
 */
export interface ModerationDecisionRecord {
  /** UUID v7 for time-ordered IDs */
  id: string;
  /** Partition key */
  itemId: string;
  /** ISO timestamp */
  createdAt: string;
  /** Content type */
  contentType: string;
  /** Provider that ran the check */
  provider: ModerationProvider;
  /** Numeric signals only */
  signals: ModerationSignals;
  /** Thresholds used with config version */
  thresholdsUsed: ThresholdsUsed;
  /** Decision outcome */
  decision: ModerationDecisionOutcome;
  /** Reason codes */
  reasonCodes: ModerationReasonCode[];
  /** Request correlation ID */
  correlationId: string | null;
  /** Whether fallback provider was used */
  usedFallback: boolean;
}

// ─────────────────────────────────────────────────────────────
// Decision Logging
// ─────────────────────────────────────────────────────────────

/**
 * Record a moderation decision to Cosmos DB
 * 
 * Creates an audit record with signals, thresholds, and outcome.
 * Does not store any content or PII.
 * 
 * @param input - Decision details
 * @returns The created record
 */
export async function recordModerationDecision(
  input: RecordModerationDecisionInput
): Promise<ModerationDecisionRecord> {
  const {
    itemId,
    contentType,
    provider,
    signals,
    configEnvelope,
    decision,
    reasonCodes,
    correlationId,
    usedFallback = false,
  } = input;

  const record: ModerationDecisionRecord = {
    id: uuidv7(),
    itemId,
    createdAt: new Date().toISOString(),
    contentType,
    provider,
    signals: {
      confidence: signals.confidence,
      categoryScores: signals.categoryScores,
      categories: signals.categories,
      providerAction: signals.providerAction,
    },
    thresholdsUsed: {
      configVersion: configEnvelope.version,
      flagThreshold: configEnvelope.config.hiveAutoFlagThreshold,
      removeThreshold: configEnvelope.config.hiveAutoRemoveThreshold,
    },
    decision,
    reasonCodes,
    correlationId: correlationId ?? null,
    usedFallback,
  };

  try {
    const db = getTargetDatabase();
    await db.moderationDecisions.items.create(record);

    // Track decision metrics
    trackAppMetric({
      name: 'moderation.decision.count',
      value: 1,
      properties: {
        decision,
        provider,
        configVersion: configEnvelope.version.toString(),
      },
    });

    trackAppEvent({
      name: 'moderation.decision.made',
      properties: {
        itemId,
        contentType,
        provider,
        decision,
        reasonCodes: reasonCodes.join(','),
        configVersion: configEnvelope.version.toString(),
        confidence: signals.confidence.toFixed(3),
        usedFallback: String(usedFallback),
      },
    });

    return record;
  } catch (error) {
    // Log error but don't fail the moderation - decision logging is not critical path
    console.error(
      `[decisionLogger] Failed to record decision for ${itemId}: ${(error as Error).message}`
    );
    
    trackAppEvent({
      name: 'moderation.decision.log_failed',
      properties: {
        itemId,
        error: (error as Error).message,
      },
    });

    // Return the record even if write failed (for caller's use)
    return record;
  }
}

/**
 * Build reason codes from moderation result
 */
export function buildReasonCodes(
  confidence: number,
  flagThreshold: number,
  removeThreshold: number,
  decision: ModerationDecisionOutcome,
  usedFallback: boolean,
  providerError: boolean
): ModerationReasonCode[] {
  const codes: ModerationReasonCode[] = [];

  if (providerError) {
    codes.push('PROVIDER_ERROR_QUEUE');
  } else if (usedFallback) {
    codes.push('FALLBACK_USED');
  }

  if (confidence >= removeThreshold) {
    codes.push('HIVE_SCORE_OVER_THRESHOLD');
  } else if (confidence >= flagThreshold) {
    codes.push('HIVE_SCORE_OVER_FLAG_THRESHOLD');
  } else if (decision === 'allow') {
    codes.push('HIVE_SCORE_UNDER_THRESHOLD');
  }

  return codes;
}
