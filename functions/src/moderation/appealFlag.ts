/**
 * ASORA - APPEAL FLAG (PHASE 3 - USER APPEALS)
 *
 * 📢 User Appeal System for Moderation Decisions
 *
 * ✅ Requirements:
 * - JWT Authentication required (content owner or any user for community appeals)
 * - Allow appeals for rejected/hidden content
 * - Require detailed appeal reasoning
 * - Prevent duplicate appeals (one per user per content)
 * - Rate limiting (max 5 appeals/day per user)
 * - Appeal expiry (30 days from moderation decision)
 * - Queue appeals for admin review or community voting
 *
 * 🎯 Request Body:
 * {
 *   contentId: string,
 *   contentType: "post" | "comment" | "user",
 *   appealType: "owner" | "community",
 *   reason: string,
 *   explanation: string,
 *   requestedAction: "restore" | "review" | "reduce_penalty"
 * }
 *
 * 📊 Appeal Types:
 * - owner: Content owner appeals their own content
 * - community: Community member appeals on behalf of others
 *
 * 🔄 Appeal Process:
 * 1. Validate user can appeal (rate limits, ownership, timing)
 * 2. Check content is eligible for appeal
 * 3. Create appeal record with detailed metadata
 * 4. Route to appropriate review queue (admin/community)
 * 5. Log appeal for audit trail
 *
 * 🛡️ Security & Validation:
 * - Appeal rate limiting (5/day per user)
 * - Appeal window enforcement (30 days)
 * - Duplicate prevention
 * - Content ownership verification for owner appeals
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserContext } from '../shared/auth';
import { getContainer } from '../shared/cosmosClient';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { withTelemetry, AsoraKPIs, PerformanceTimer } from '../shared/telemetry';

interface AppealRequest {
  contentId: string;
  contentType: 'post' | 'comment' | 'user';
  appealType: 'owner' | 'community';
  reason: string;
  explanation: string;
  requestedAction: 'restore' | 'review' | 'reduce_penalty';
}

interface AppealResult {
  success: boolean;
  appealId: string;
  appeal: {
    id: string;
    contentId: string;
    contentType: string;
    appealType: string;
    status: string;
    submittedAt: string;
    reviewQueue: string;
  };
  rateLimitInfo: {
    appealsToday: number;
    maxPerDay: number;
    resetTime: string;
  };
}

export async function appealFlagInternal(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const timer = new PerformanceTimer('appeal_flag', context);

  try {
    // 1. Validate JWT authentication
    const userContext = getUserContext(request);
    if (!userContext) {
      return {
        status: 401,
        jsonBody: { error: 'Unauthorized - Invalid or missing JWT token' },
      };
    }

    // 2. Validate request body
    const schema = Joi.object({
      contentId: Joi.string().required(),
      contentType: Joi.string().valid('post', 'comment', 'user').required(),
      appealType: Joi.string().valid('owner', 'community').required(),
      reason: Joi.string().min(20).max(200).required(),
      explanation: Joi.string().min(50).max(1000).required(),
      requestedAction: Joi.string().valid('restore', 'review', 'reduce_penalty').required(),
    });

    const { error, value } = schema.validate(await request.json());
    if (error) {
      return {
        status: 400,
        jsonBody: { error: `Validation failed: ${error.message}` },
      };
    }

    const appealRequest: AppealRequest = value;

    // 3. Rate limiting - Check user's appeals today
    const appealsContainer = getContainer('appeals');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const rateLimitQuery = {
      query: 'SELECT * FROM c WHERE c.userId = @userId AND c.createdAt > @todayStart',
      parameters: [
        { name: '@userId', value: userContext.userId },
        { name: '@todayStart', value: todayStart.toISOString() },
      ],
    };

    const { resources: todayAppeals } = await appealsContainer.items
      .query(rateLimitQuery)
      .fetchAll();
    if (todayAppeals.length >= 5) {
      const resetTime = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString();
      return {
        status: 429,
        jsonBody: {
          error: 'Appeal rate limit exceeded - Maximum 5 appeals per day',
          appealsToday: todayAppeals.length,
          maxPerDay: 5,
          resetTime,
        },
      };
    }

    // 4. Get the content being appealed
    const collectionName =
      appealRequest.contentType === 'user' ? 'users' : `${appealRequest.contentType}s`;
    const contentContainer = getContainer(collectionName);

    let targetContent;
    try {
      const { resource } = await contentContainer
        .item(appealRequest.contentId, appealRequest.contentId)
        .read();
      targetContent = resource;
    } catch (dbError: any) {
      if (dbError.code === 404) {
        return {
          status: 404,
          jsonBody: {
            error: `${appealRequest.contentType.charAt(0).toUpperCase() + appealRequest.contentType.slice(1)} not found`,
            contentId: appealRequest.contentId,
          },
        };
      }
      throw dbError;
    }

    // 5. Verify content is eligible for appeal
    const appealableStatuses = ['rejected', 'warning_issued', 'hidden'];
    if (!appealableStatuses.includes(targetContent.moderationStatus)) {
      return {
        status: 409,
        jsonBody: {
          error: 'Content is not eligible for appeal',
          currentStatus: targetContent.moderationStatus,
          appealableStatuses,
        },
      };
    }

    // 6. Check appeal window (30 days from moderation decision)
    const moderatedAt = new Date(targetContent.moderatedAt || targetContent.updatedAt);
    const appealDeadline = new Date(moderatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (Date.now() > appealDeadline.getTime()) {
      return {
        status: 410,
        jsonBody: {
          error: 'Appeal window has expired',
          moderatedAt: moderatedAt.toISOString(),
          appealDeadline: appealDeadline.toISOString(),
          daysExpired: Math.floor((Date.now() - appealDeadline.getTime()) / (1000 * 60 * 60 * 24)),
        },
      };
    }

    // 7. Verify ownership for owner appeals
    const contentOwnerId = targetContent.userId || targetContent.id;
    if (appealRequest.appealType === 'owner' && userContext.userId !== contentOwnerId) {
      return {
        status: 403,
        jsonBody: {
          error: 'Only content owner can submit owner appeals',
          contentOwnerId,
          appealingUserId: userContext.userId,
        },
      };
    }

    // 8. Check for duplicate appeals
    const duplicateQuery = {
      query:
        'SELECT * FROM c WHERE c.userId = @userId AND c.contentId = @contentId AND c.contentType = @contentType',
      parameters: [
        { name: '@userId', value: userContext.userId },
        { name: '@contentId', value: appealRequest.contentId },
        { name: '@contentType', value: appealRequest.contentType },
      ],
    };

    const { resources: existingAppeals } = await appealsContainer.items
      .query(duplicateQuery)
      .fetchAll();
    if (existingAppeals.length > 0) {
      const latestAppeal = existingAppeals[0];
      return {
        status: 409,
        jsonBody: {
          error: 'You have already submitted an appeal for this content',
          existingAppeal: {
            id: latestAppeal.id,
            status: latestAppeal.status,
            createdAt: latestAppeal.createdAt,
          },
        },
      };
    }

    // 9. Determine review queue based on appeal type and content
    let reviewQueue = 'admin'; // Default to admin review
    if (appealRequest.appealType === 'community' && appealRequest.contentType !== 'user') {
      // Community appeals for posts/comments can go to community voting
      reviewQueue = 'community';
    }

    // 10. Create appeal record
    const appealId = uuidv4();
    const timestamp = new Date().toISOString();

    const appealRecord = {
      id: appealId,
      userId: userContext.userId,
      userEmail: userContext.email,
      contentId: appealRequest.contentId,
      contentType: appealRequest.contentType,
      contentOwnerId,
      appealType: appealRequest.appealType,
      reason: appealRequest.reason,
      explanation: appealRequest.explanation,
      requestedAction: appealRequest.requestedAction,
      status: 'pending',
      reviewQueue,
      priority: appealRequest.appealType === 'owner' ? 'high' : 'medium',
      createdAt: timestamp,
      expiresAt: appealDeadline.toISOString(),
      metadata: {
        originalModerationStatus: targetContent.moderationStatus,
        moderatedAt: targetContent.moderatedAt,
        moderatedBy: targetContent.moderatedBy,
        moderationReason: targetContent.moderationReason,
        appealsToday: todayAppeals.length + 1,
        userReputation: (userContext as any).reputation || 0,
      },
    };

    await appealsContainer.items.create(appealRecord);

    // 11. Update content to indicate appeal is pending
    try {
      const contentUpdate = [
        {
          op: 'replace' as const,
          path: '/appealStatus',
          value: 'pending',
        },
        {
          op: 'replace' as const,
          path: '/appealId',
          value: appealId,
        },
        {
          op: 'replace' as const,
          path: '/appealedAt',
          value: timestamp,
        },
        {
          op: 'replace' as const,
          path: '/updatedAt',
          value: timestamp,
        },
      ];

      await contentContainer
        .item(appealRequest.contentId, appealRequest.contentId)
        .patch(contentUpdate);
    } catch (updateError: any) {
      context.warn(`Failed to update content appeal status: ${updateError.message}`);
    }

    // 12. Log appeal submission for audit trail
    const moderationLogsContainer = getContainer('moderationLogs');
    const auditRecord = {
      id: uuidv4(),
      type: 'appeal_submitted',
      appealId,
      userId: userContext.userId,
      userEmail: userContext.email,
      contentId: appealRequest.contentId,
      contentType: appealRequest.contentType,
      appealType: appealRequest.appealType,
      reviewQueue,
      requestedAction: appealRequest.requestedAction,
      timestamp,
      metadata: {
        reason: appealRequest.reason,
        explanationLength: appealRequest.explanation.length,
        appealsToday: todayAppeals.length + 1,
        daysSinceModerationDecision: Math.floor(
          (Date.now() - moderatedAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
    };

    await moderationLogsContainer.items.create(auditRecord);

    context.log(
      `✅ Appeal submitted by ${userContext.email}: ${appealId} for ${appealRequest.contentType}:${appealRequest.contentId} (${appealRequest.appealType} appeal)`
    );

    // Track appeal metrics
    const duration = timer.stopAndTrack({
      appeal_type: appealRecord.appealType,
      content_type: appealRecord.contentType,
      action: appealRecord.requestedAction || 'unknown',
    });

    AsoraKPIs.trackUserEvent(
      'appeal_submitted',
      userContext.userId,
      {
        appeal_type: appealRecord.appealType,
        content_type: appealRecord.contentType,
        action: appealRecord.requestedAction || 'unknown',
        appeals_today: todayAppeals.length + 1,
      },
      context
    );

    // 13. Return success response
    const result: AppealResult = {
      success: true,
      appealId,
      appeal: {
        id: appealRecord.id,
        contentId: appealRecord.contentId,
        contentType: appealRecord.contentType,
        appealType: appealRecord.appealType,
        status: appealRecord.status,
        submittedAt: appealRecord.createdAt,
        reviewQueue: appealRecord.reviewQueue,
      },
      rateLimitInfo: {
        appealsToday: todayAppeals.length + 1,
        maxPerDay: 5,
        resetTime: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    return {
      status: 201,
      jsonBody: result,
    };
  } catch (error: any) {
    const duration = timer.stop();
    context.error('Appeal submission error:', error);

    AsoraKPIs.trackBusinessMetric(
      'appeal_errors',
      1,
      {
        error_type: 'appeal_submission_error',
        duration_ms: duration.toString(),
      },
      context
    );

    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message:
          process.env['NODE_ENV'] === 'development' ? error.message : 'Unable to submit appeal',
      },
    };
  }
}

// Telemetry-wrapped version
export const appealFlag = withTelemetry('appeal_flag', appealFlagInternal);

app.http('appealFlag', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'moderation/appeal',
  handler: appealFlag,
});
