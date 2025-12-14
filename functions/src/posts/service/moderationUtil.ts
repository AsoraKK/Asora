/**
 * Post Moderation Utilities
 * 
 * Shared functions for content moderation using Hive AI
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

/**
 * Moderate post content using Hive AI
 * Returns moderation result or null if moderation should be skipped
 */
export async function moderatePostContent(
  text: string,
  userId: string,
  contentId: string,
  context: InvocationContext
): Promise<{ result: ModerationResult | null; error?: string }> {
  // Skip moderation if HIVE_API_KEY is not configured (dev/test environments)
  if (!process.env.HIVE_API_KEY) {
    context.log('[moderation] Moderation skipped - no API key configured', { contentId });
    return { result: null };
  }

  try {
    const hiveClient = createHiveClient();
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
      },
    });

    context.log('[moderation] Content moderation complete', {
      contentId,
      action: result.action,
      confidence: result.confidence.toFixed(3),
      categories: result.categories,
      durationMs: duration.toFixed(2),
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
    });

    trackAppEvent({
      name: 'moderation_error',
      properties: {
        contentId,
        errorCode,
        message: errorMessage,
      },
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
