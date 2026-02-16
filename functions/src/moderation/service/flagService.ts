/**
 * ASORA CONTENT FLAGGING ENDPOINT
 *
 * 🎯 Purpose: Allow users to flag inappropriate content for review
 * 🔐 Security: JWT authentication + rate limiting + spam prevention
 * 🚨 Features: Content flagging, duplicate prevention, Hive AI analysis
 * 📊 Models: User reports with optional AI verification
 */

import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { PatchOperation } from '@azure/cosmos';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';
import { createHiveClient, HiveAIClient } from '@shared/clients/hive';
import { getTargetDatabase } from '@shared/clients/cosmos';
import {
  createRateLimiter,
  endpointKeyGenerator,
  defaultKeyGenerator,
} from '@shared/utils/rateLimiter';
import { getChaosContext } from '@shared/chaos/chaosConfig';
import { ChaosError, withCosmosChaos, withHiveChaos } from '@shared/chaos/chaosInjectors';
import { trackAppEvent, trackAppMetric } from '@shared/appInsights';
import {
  getFlagAutoHideThreshold,
  getReasonPriorityScore,
  getUrgencyMultiplier,
} from '../config/moderationConfigProvider';
import { enqueueUserNotification } from '@shared/services/notificationEvents';
import { NotificationEventType } from '../../notifications/types';
import { appendReceiptEvent } from '@shared/services/receiptEvents';

// ─────────────────────────────────────────────────────────────
// Constants (legacy - kept for fallback, dynamic values from admin_config preferred)
// ─────────────────────────────────────────────────────────────

const FALLBACK_FLAG_AUTO_HIDE_THRESHOLD = 5;
const MAX_ADDITIONAL_DETAILS_LENGTH = 1000;

// Priority scores by reason - now loaded from admin_config
// Fallback values kept for backwards compatibility
const FALLBACK_REASON_PRIORITY_SCORES: Record<string, number> = {
  violence: 10,
  hate_speech: 9,
  harassment: 8,
  adult_content: 7,
  misinformation: 6,
  spam: 5,
  privacy: 4,
  copyright: 3,
  other: 2,
};

// Fallback urgency multipliers
const FALLBACK_URGENCY_MULTIPLIERS: Record<string, number> = {
  high: 2,
  medium: 1.5,
  low: 1,
};

// ─────────────────────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────────────────────

const FlagContentSchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  contentType: z.enum(['post', 'comment', 'user', 'message'] as const, {
    message: 'Invalid content type',
  }),
  reason: z.enum(
    [
      'spam',
      'harassment',
      'hate_speech',
      'violence',
      'adult_content',
      'misinformation',
      'copyright',
      'privacy',
      'other',
    ] as const,
    { message: 'Invalid flag reason' }
  ),
  additionalDetails: z.string().max(MAX_ADDITIONAL_DETAILS_LENGTH).optional(),
  urgency: z.enum(['low', 'medium', 'high'] as const).default('medium'),
});

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface FlagContentParams {
  request: HttpRequest;
  context: InvocationContext;
  userId: string;
}

interface FlagDocument {
  id: string;
  targetId: string;
  contentId: string;
  contentType: string;
  flaggedBy: string;
  reason: string;
  additionalDetails: string | null;
  urgency: string;
  priorityScore: number;
  status: 'active' | 'resolved' | 'dismissed';
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  aiAnalysis: unknown | null;
  moderatorNotes: string | null;
  _partitionKey: string;
}

// ─────────────────────────────────────────────────────────────
// Rate Limiter
// ─────────────────────────────────────────────────────────────

// Rate limiter: 5 flags per hour per user to prevent abuse
const flagRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  keyGenerator: (() => {
    try {
      return endpointKeyGenerator('flag-content');
    } catch {
      return defaultKeyGenerator;
    }
  })(),
});

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

async function calculatePriorityScore(reason: string, urgency: string): Promise<number> {
  // Get dynamic scores from admin config (or use fallback)
  let baseScore: number;
  let multiplier: number;

  try {
    baseScore = await getReasonPriorityScore(reason);
    multiplier = await getUrgencyMultiplier(urgency);
  } catch {
    baseScore = FALLBACK_REASON_PRIORITY_SCORES[reason] ?? 2;
    multiplier = FALLBACK_URGENCY_MULTIPLIERS[urgency] ?? 1;
  }

  return baseScore * multiplier;
}

function generateFlagId(): string {
  return uuidv7();
}

function getContentContainerName(contentType: string): 'posts' | 'users' {
  // Comments are stored in posts container with type='comment'
  if (contentType === 'post' || contentType === 'comment') {
    return 'posts';
  }
  return 'users';
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

export async function flagContentHandler({
  request,
  context,
  userId,
}: FlagContentParams): Promise<HttpResponseInit> {
  const start = performance.now();
  context.log('moderation.flag.start', { userId: userId ? 'present' : 'missing' });
  const chaosContext = getChaosContext(request);

  try {
    // 1. Validate userId (auth already handled upstream)
    if (!userId) {
      return {
        status: 401,
        jsonBody: { error: 'Missing authorization header' },
      };
    }

    // 2. Rate limiting check
    const rateLimitResult = await flagRateLimiter.checkRateLimit(request);
    if (rateLimitResult.blocked) {
      context.log('moderation.flag.rate_limited', { userId });
      return {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        },
        jsonBody: {
          error: 'Too many flags. Please wait before flagging more content.',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
        },
      };
    }

    // 3. Parse and validate request body
    const requestBody = await request.json();
    const validationResult = FlagContentSchema.safeParse(requestBody);

    if (!validationResult.success) {
      context.log('moderation.flag.validation_failed', {
        issues: validationResult.error.issues.length,
      });
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid request data',
          details: validationResult.error.issues,
        },
      };
    }

    const { contentId, contentType, reason, additionalDetails, urgency } = validationResult.data;

    // 4. Get database containers
    const db = getTargetDatabase();
    const contentContainerName = getContentContainerName(contentType);
    const contentContainer = db[contentContainerName];

    // 5. Verify content exists BEFORE creating flag
    const { resource: contentDoc, requestCharge: readRU } = await withCosmosChaos(
      chaosContext,
      () => contentContainer.item(contentId, contentId).read(),
      { operation: 'read' }
    );

    if (!contentDoc) {
      context.log('moderation.flag.content_not_found', { contentId, contentType });
      return {
        status: 404,
        jsonBody: { error: 'Content not found' },
      };
    }

    // 6. Check for duplicate flags by the same user on the same content
    const existingFlagQuery = {
      query: `
        SELECT c.id FROM c 
        WHERE c.contentId = @contentId 
          AND c.flaggedBy = @userId 
          AND c.status = "active"
      `,
      parameters: [
        { name: '@contentId', value: contentId },
        { name: '@userId', value: userId },
      ],
    };

    const { resources: existingFlags, requestCharge: queryRU } = await withCosmosChaos(
      chaosContext,
      () => db.flags.items.query(existingFlagQuery).fetchAll(),
      { operation: 'read' }
    );

    if (existingFlags.length > 0) {
      context.log('moderation.flag.duplicate', { contentId, userId });
      return {
        status: 409,
        jsonBody: {
          error: 'You have already flagged this content',
          existingFlagId: existingFlags[0].id,
        },
      };
    }

    // 7. Optional: Run AI analysis on content text
    let aiAnalysis = null;
    if ((contentType === 'post' || contentType === 'comment') && contentDoc.text) {
      try {
        const hiveClient = createHiveClient();
        const hiveResponse = await withHiveChaos(chaosContext, () =>
          hiveClient.moderateText(userId, contentDoc.text)
        );
        aiAnalysis = HiveAIClient.parseModerationResult(hiveResponse);
      } catch (error) {
        context.log('moderation.flag.ai_analysis_failed', { error: (error as Error).message });
        // Continue without AI analysis - not critical
      }
    }

    // 8. Create flag document
    const now = new Date().toISOString();
    const flagId = generateFlagId();
    const priorityScore = await calculatePriorityScore(reason, urgency);

    const flagDocument: FlagDocument = {
      id: flagId,
      targetId: contentId,
      contentId,
      contentType,
      flaggedBy: userId,
      reason,
      additionalDetails: additionalDetails ?? null,
      urgency,
      priorityScore,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      resolvedBy: null,
      aiAnalysis,
      moderatorNotes: null,
      _partitionKey: contentId, // Partition by content for efficient queries
    };

    const { requestCharge: createRU } = await withCosmosChaos(
      chaosContext,
      () => db.flags.items.create(flagDocument),
      { operation: 'write' }
    );

    // 9. Update content with flag count and flagged status (atomic patch)
    const currentFlagCount = (contentDoc.flagCount ?? 0) + 1;

    // Get dynamic threshold from admin config (or use fallback)
    let flagAutoHideThreshold: number;
    try {
      flagAutoHideThreshold = await getFlagAutoHideThreshold();
    } catch {
      flagAutoHideThreshold = FALLBACK_FLAG_AUTO_HIDE_THRESHOLD;
    }
    const shouldAutoHide = currentFlagCount >= flagAutoHideThreshold;

    const patchOperations: PatchOperation[] = [
      { op: 'set', path: '/flagCount', value: currentFlagCount },
      { op: 'set', path: '/flagged', value: true },
      { op: 'set', path: '/lastFlaggedAt', value: now },
    ];

    if (shouldAutoHide && contentDoc.status !== 'blocked') {
      patchOperations.push({ op: 'set', path: '/status', value: 'blocked' });
      context.log('moderation.flag.auto_hidden', {
        contentId,
        flagCount: currentFlagCount,
        threshold: flagAutoHideThreshold,
      });
    }

    try {
      const { requestCharge: patchRU } = await withCosmosChaos(
        chaosContext,
        () => contentContainer.item(contentId, contentId).patch(patchOperations),
        { operation: 'write' }
      );

      trackAppMetric({
        name: 'cosmos_ru_flag_content',
        value: (readRU ?? 0) + (queryRU ?? 0) + (createRU ?? 0) + (patchRU ?? 0),
        properties: { contentType, reason },
      });
    } catch (patchError) {
      // Log but don't fail - flag was created successfully
      context.log('moderation.flag.patch_failed', {
        contentId,
        error: (patchError as Error).message,
      });
    }

    if (shouldAutoHide) {
      void appendReceiptEvent({
        postId: contentId,
        actorType: 'system',
        type: 'MODERATION_DECIDED',
        summary: 'Moderation action applied',
        reason: 'Content was actioned after repeated community reports and moved to blocked state.',
        policyLinks: [{ title: 'Moderation policy', url: 'https://lythaus.app/policies/moderation' }],
        actions: [
          { key: 'APPEAL', label: 'Appeal', enabled: true },
          { key: 'LEARN_MORE', label: 'Learn more', enabled: true },
        ],
        metadata: {
          moderationAction: 'blocked',
        },
      }).catch((error) => {
        context.log('moderation.flag.receipt_append_failed', {
          contentId,
          message: (error as Error).message,
        });
      });

      const ownerId =
        contentType === 'user'
          ? contentId
          : typeof contentDoc.authorId === 'string'
            ? contentDoc.authorId
            : undefined;
      if (ownerId && ownerId !== userId) {
        void enqueueUserNotification({
          context,
          userId: ownerId,
          eventType: NotificationEventType.MODERATION_CONTENT_BLOCKED,
          payload: {
            targetId: contentId,
            targetType: contentType,
            snippet: `Content was blocked after ${currentFlagCount} reports.`,
            reason,
          },
          dedupeKey: `moderation_blocked:${contentId}:${currentFlagCount}`,
        });
      }
    }

    // 10. Track event and return success
    const duration = performance.now() - start;

    trackAppEvent({
      name: 'content_flagged',
      properties: {
        flagId,
        contentId,
        contentType,
        reason,
        urgency,
        priorityScore,
        hasAiAnalysis: Boolean(aiAnalysis),
        autoHidden: shouldAutoHide,
        durationMs: duration,
      },
    });

    context.log('moderation.flag.success', {
      flagId,
      contentId,
      contentType,
      reason,
      flagCount: currentFlagCount,
      autoHidden: shouldAutoHide,
      durationMs: duration.toFixed(2),
    });

    return {
      status: 201,
      jsonBody: {
        flagId,
        message: 'Content flagged successfully',
        priorityScore,
        flagCount: currentFlagCount,
        autoHidden: shouldAutoHide,
        reviewRecorded: Boolean(aiAnalysis),
      },
    };
  } catch (error) {
    if (error instanceof ChaosError) {
      return {
        status: error.status,
        jsonBody: {
          error: {
            code: error.code,
            kind: error.kind,
            message: error.message,
          },
        },
      };
    }

    context.log('moderation.flag.error', { message: (error as Error).message });
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
