/**
 * Post Moderation Utilities
 * 
 * Shared functions for content moderation using Hive AI.
 * Uses dynamic thresholds from admin config with TTL caching.
 */

import type { InvocationContext } from '@azure/functions';
import {
  createHiveClient,
  ModerationAction,
  HiveAPIError,
  type ModerationResult,
} from '@shared/clients/hive';
import { trackAppEvent, trackAppMetric } from '@shared/appInsights';
import type { ModerationMeta, ModerationStatus } from '@feed/types';
import { 
  getModerationConfigWithVersion,
  type ModerationConfigEnvelope,
} from '@moderation/config/moderationConfigProvider';
import {
  recordModerationDecision,
  buildReasonCodes,
  type ModerationDecisionOutcome,
} from '@moderation/service/decisionLogger';

/**
 * Extended moderation result with config envelope
 */
export interface ExtendedModerationResult {
  result: ModerationResult | null;
  error?: string;
  configEnvelope: ModerationConfigEnvelope;
}

/**
 * Moderate post content using Hive AI with dynamic thresholds
 * Returns moderation result or null if moderation should be skipped
 */
export async function moderatePostContent(
  text: string,
  userId: string,
  contentId: string,
  context: InvocationContext,
  correlationId?: string
): Promise<{ result: ModerationResult | null; error?: string }> {
  // Get dynamic config with version info
  const configEnvelope = await getModerationConfigWithVersion();
  const { config } = configEnvelope;

  // Check if auto-moderation is enabled
  if (!config.enableAutoModeration) {
    context.log('[moderation] Auto-moderation disabled by config', { contentId });
    
    // Log decision even when auto-moderation is disabled
    await recordModerationDecision({
      itemId: contentId,
      contentType: 'post',
      provider: 'hive_v2',
      signals: { confidence: 0, categories: [] },
      configEnvelope,
      decision: 'allow',
      reasonCodes: ['AUTO_MODERATION_DISABLED'],
      correlationId,
    });
    
    return { result: null };
  }

  // Skip moderation if HIVE_API_KEY is not configured (dev/test environments)
  if (!process.env.HIVE_API_KEY) {
    context.log('[moderation] Moderation skipped - no API key configured', { contentId });
    
    // Log decision even when skipped
    await recordModerationDecision({
      itemId: contentId,
      contentType: 'post',
      provider: 'hive_v2',
      signals: { confidence: 0, categories: [] },
      configEnvelope,
      decision: 'allow',
      reasonCodes: ['NO_API_KEY'],
      correlationId,
    });
    
    return { result: null };
  }

  try {
    const hiveClient = createHiveClient({
      apiKey: process.env.HIVE_API_KEY,
      // Pass dynamic thresholds to client
      blockThreshold: config.hiveAutoRemoveThreshold,
      warnThreshold: config.hiveAutoFlagThreshold,
    });
    const start = performance.now();

    const result = await hiveClient.moderateTextContent({
      text,
      userId,
      contentId,
    });

    const duration = performance.now() - start;

    trackAppMetric({
      name: 'hive_moderation_duration_ms',
      value: duration,
      properties: {
        action: result.action,
        contentId,
        configVersion: configEnvelope.version.toString(),
      },
    });

    context.log('[moderation] Content moderation complete', {
      contentId,
      action: result.action,
      confidence: result.confidence.toFixed(3),
      categories: result.categories,
      durationMs: duration.toFixed(2),
      configVersion: configEnvelope.version,
      thresholds: {
        flag: config.hiveAutoFlagThreshold,
        remove: config.hiveAutoRemoveThreshold,
      },
    });

    // Determine decision outcome for logging
    let decision: ModerationDecisionOutcome;
    if (result.action === ModerationAction.BLOCK) {
      decision = 'block';
    } else if (result.action === ModerationAction.WARN) {
      decision = 'queue';
    } else {
      decision = 'allow';
    }

    // Record decision with all context
    const reasonCodes = buildReasonCodes(
      result.confidence,
      config.hiveAutoFlagThreshold,
      config.hiveAutoRemoveThreshold,
      decision,
      false, // usedFallback
      false  // providerError
    );

    await recordModerationDecision({
      itemId: contentId,
      contentType: 'post',
      provider: 'hive_v2',
      signals: {
        confidence: result.confidence,
        categories: result.categories,
        categoryScores: undefined, // Raw scores stripped for privacy
        providerAction: result.action,
      },
      configEnvelope,
      decision,
      reasonCodes,
      correlationId,
    });

    return { result };
  } catch (error) {
    const isHiveError = error instanceof HiveAPIError;
    const errorMessage = (error as Error).message;
    const errorCode = isHiveError ? (error as HiveAPIError).code : 'UNKNOWN_ERROR';

    context.log('[moderation] Moderation check failed', {
      contentId,
      errorCode,
      message: errorMessage,
      retryable: isHiveError ? (error as HiveAPIError).retryable : false,
      configVersion: configEnvelope.version,
    });

    trackAppEvent({
      name: 'moderation_error',
      properties: {
        contentId,
        errorCode,
        message: errorMessage,
        configVersion: configEnvelope.version.toString(),
      },
    });

    // Log decision for error case (queued for review)
    await recordModerationDecision({
      itemId: contentId,
      contentType: 'post',
      provider: 'hive_v2',
      signals: { confidence: 0, categories: [] },
      configEnvelope,
      decision: 'queue',
      reasonCodes: ['PROVIDER_ERROR_QUEUE'],
      correlationId,
    });

    return { result: null, error: errorMessage };
  }
}

/**
 * Build moderation metadata from moderation result
 */
export function buildModerationMeta(
  result: ModerationResult | null,
  error?: string
): ModerationMeta {
  const now = Date.now();

  if (error) {
    // Moderation failed - route to pending review
    return {
      status: 'pending_review',
      checkedAt: now,
      error,
    };
  }

  if (!result) {
    // Moderation skipped - treat as clean
    return {
      status: 'clean',
      checkedAt: now,
    };
  }

  let status: ModerationStatus;
  switch (result.action) {
    case ModerationAction.BLOCK:
      status = 'blocked';
      break;
    case ModerationAction.WARN:
      status = 'warned';
      break;
    case ModerationAction.ALLOW:
    default:
      status = 'clean';
      break;
  }

  return {
    status,
    checkedAt: now,
    confidence: result.confidence,
    categories: result.categories,
    reasons: result.reasons,
  };
}
