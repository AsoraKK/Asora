/**
 * ASORA - FLAG CONTENT FUNCTION (PHASE 2 - ENHANCED)
 *
 * ✅ Phase 1 Requirements (COMPLETE):
 * - JWT Auth required (use getUserContext)
 * - Validate input: targetId, targetType, optional reason
 * - Supported target types: "post" | "comment" | "user"
 * - Prevent duplicate flagging by same user
 * - Check if target exists in Cosmos DB
 * - Run AI moderation using hiveClient.ts with current thresholds
 * - If AI decision is "block" or confidence high, auto-hide content
 * - Log result to flags and moderationLogs collections
 * - Return success/failure with moderation outcome
 *
 * � Phase 2 Enhancements (NEW):
 * - RATE LIMITING: Max 10 flags/hour/user with 429 response
 * - ENHANCED 404: Better error handling with detailed error codes
 * - AUTO-ESCALATION: 3+ flags on same content triggers admin review
 * - ESCALATION LOGGING: Detailed audit trail for escalated content
 * - MODERATION STATUS: Content marked as 'pending_review' when escalated
 * - RESPONSE ENRICHMENT: Rate limit info and escalation details in responses
 *
 * �🛠️ Shared Modules:
 * - getModerationConfig()
 * - hiveClient.moderateText() / moderateImage()
 * - getContainer() from cosmosClient.ts
 *
 * ✅ Request Body:
 * {
 *   targetType: "post" | "comment" | "user",
 *   targetId: string,
 *   reason?: string,
 *   description?: string
 * }
 *
 * ✅ Database Schema - flags collection:
 * {
 *   id: uuid,
 *   userId: string,
 *   userEmail: string,
 *   targetType: string,
 *   targetId: string,
 *   reason?: string,
 *   description?: string,
 *   aiAnalysis: {
 *     score: number,
 *     decision: "approve" | "warn" | "block",
 *     categories: Record<string, number>,
 *     triggeredRules: string[]
 *   },
 *   actionTaken?: {
 *     type: "auto_hide" | "none",
 *     reason: string,
 *     timestamp: string
 *   },
 *   createdAt: string,
 *   status: "pending"
 * }
 *
 * ✅ Response Format:
 * - 201 Created with flag details, AI analysis, rate limit info, and escalation status
 * - 409 Conflict if user already flagged this content
 * - 404 Not Found if target content doesn't exist (enhanced with error codes)
 * - 429 Too Many Requests if rate limit exceeded (10 flags/hour)
 * - 401 Unauthorized if JWT invalid
 * - 400 Bad Request for validation errors
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserContext } from '../shared/auth';
import { getContainer } from '../shared/cosmosClient';
import { getModerationConfig } from '../shared/moderationConfig';
import { moderateText } from '../shared/hiveClient';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';

export async function flagContent(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // 1. Validate JWT and extract user context
    const userContext = getUserContext(request);
    if (!userContext) {
      return {
        status: 401,
        jsonBody: { error: 'Unauthorized - Invalid or missing JWT token' },
      };
    }

    // 2. Validate input using Joi schema
    const schema = Joi.object({
      targetType: Joi.string().valid('post', 'comment', 'user').required(),
      targetId: Joi.string().required(),
      reason: Joi.string().optional(),
      description: Joi.string().max(500).optional(),
    });

    const { error, value } = schema.validate(await request.json());
    if (error) {
      return {
        status: 400,
        jsonBody: { error: `Validation failed: ${error.message}` },
      };
    }

    // 3. PHASE 2: Rate limiting - Check user flag count in last hour
    const flagsContainer = getContainer('flags');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const rateLimitQuery = {
      query: 'SELECT * FROM c WHERE c.userId = @userId AND c.createdAt > @oneHourAgo',
      parameters: [
        { name: '@userId', value: userContext.userId },
        { name: '@oneHourAgo', value: oneHourAgo },
      ],
    };

    const { resources: recentFlags } = await flagsContainer.items.query(rateLimitQuery).fetchAll();
    if (recentFlags.length >= 10) {
      return {
        status: 429,
        jsonBody: {
          error: 'Rate limit exceeded - Maximum 10 flags per hour',
          retryAfter: 3600, // seconds
          currentCount: recentFlags.length,
          resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
      };
    }

    // 4. Check if user has already flagged this specific content
    const duplicateQuery = {
      query:
        'SELECT * FROM c WHERE c.userId = @userId AND c.targetType = @targetType AND c.targetId = @targetId',
      parameters: [
        { name: '@userId', value: userContext.userId },
        { name: '@targetType', value: value.targetType },
        { name: '@targetId', value: value.targetId },
      ],
    };

    const { resources: existingFlags } = await flagsContainer.items
      .query(duplicateQuery)
      .fetchAll();
    if (existingFlags.length > 0) {
      return {
        status: 409,
        jsonBody: {
          error: 'Duplicate flag - You have already flagged this content',
          existingFlag: {
            id: existingFlags[0].id,
            createdAt: existingFlags[0].createdAt,
          },
        },
      };
    }

    // 5. PHASE 2: Enhanced 404 handling - Check if target content exists
    const targetContainer = getContainer(
      value.targetType === 'user' ? 'users' : `${value.targetType}s`
    );
    let targetContent;
    try {
      const { resource } = await targetContainer.item(value.targetId, value.targetId).read();
      targetContent = resource;

      if (!targetContent) {
        return {
          status: 404,
          jsonBody: {
            error: `${value.targetType.charAt(0).toUpperCase() + value.targetType.slice(1)} not found`,
            details: `No ${value.targetType} exists with ID: ${value.targetId}`,
          },
        };
      }
    } catch (dbError: any) {
      if (dbError.code === 404) {
        return {
          status: 404,
          jsonBody: {
            error: `${value.targetType.charAt(0).toUpperCase() + value.targetType.slice(1)} not found`,
            details: `No ${value.targetType} exists with ID: ${value.targetId}`,
            code: 'CONTENT_NOT_FOUND',
          },
        };
      }

      context.error(`Database error while checking ${value.targetType}:`, dbError);
      return {
        status: 500,
        jsonBody: {
          error: 'Internal server error while validating content',
          code: 'DATABASE_ERROR',
        },
      };
    }

    // 5. Extract content for AI analysis
    let contentToAnalyze = '';
    if (value.targetType === 'post' || value.targetType === 'comment') {
      contentToAnalyze = targetContent.text || '';
    } else if (value.targetType === 'user') {
      // For user flags, analyze profile content
      contentToAnalyze = [
        targetContent.profile?.displayName,
        targetContent.profile?.bio,
        targetContent.profile?.location,
      ]
        .filter(Boolean)
        .join(' ');
    }

    // 6. Run AI moderation analysis
    const moderationConfig = await getModerationConfig();
    let hiveResult;

    try {
      hiveResult = await moderateText({
        content: contentToAnalyze,
        userId: targetContent.userId || targetContent.id,
        contextType: value.targetType as 'post' | 'comment',
      });

      context.log(
        `Flag analysis: target=${value.targetType}:${value.targetId}, score=${hiveResult.score}, decision=${hiveResult.decision}`
      );
    } catch (hiveError: any) {
      context.warn(`Hive AI analysis failed: ${hiveError.message}`);
      // Use fallback for graceful degradation
      hiveResult = {
        score: 0.0,
        categories: {},
        decision: 'approve' as const,
        triggeredRules: ['AI_ANALYSIS_FAILED'],
        raw: {},
      };
    }

    // 7. Determine if auto-action should be taken
    let actionTaken = null;
    const shouldAutoHide =
      hiveResult.score >= moderationConfig.appeal.autoHide || hiveResult.decision === 'block';

    if (shouldAutoHide) {
      // Update target content visibility
      try {
        const updateOperation = [
          {
            op: 'replace' as const,
            path: '/visibility',
            value: 'hidden',
          },
          {
            op: 'replace' as const,
            path: '/updatedAt',
            value: new Date().toISOString(),
          },
        ];

        await targetContainer.item(value.targetId, value.targetId).patch(updateOperation);

        actionTaken = {
          type: 'auto_hide',
          reason: `AI confidence score ${hiveResult.score} >= threshold ${moderationConfig.appeal.autoHide}`,
          timestamp: new Date().toISOString(),
        };

        context.log(
          `✅ Auto-hidden content: ${value.targetType}:${value.targetId} due to high AI confidence`
        );
      } catch (updateError: any) {
        context.warn(`Failed to auto-hide content: ${updateError.message}`);
      }
    }

    // 8. Create flag record and prepare containers
    const flagId = uuidv4();
    const createdAt = new Date().toISOString();
    const moderationLogsContainer = getContainer('moderationLogs');

    const flagRecord = {
      id: flagId,
      userId: userContext.userId,
      userEmail: userContext.email,
      targetType: value.targetType,
      targetId: value.targetId,
      reason: value.reason || 'Community guidelines violation',
      description: value.description || null,
      aiAnalysis: {
        score: hiveResult.score,
        decision: hiveResult.decision,
        categories: hiveResult.categories,
        triggeredRules: hiveResult.triggeredRules,
      },
      actionTaken,
      createdAt,
      status: 'pending',
    };

    await flagsContainer.items.create(flagRecord);

    // PHASE 2: Auto-escalation logic - Check if content has 3+ flags
    const escalationQuery = {
      query: 'SELECT * FROM c WHERE c.targetType = @targetType AND c.targetId = @targetId',
      parameters: [
        { name: '@targetType', value: value.targetType },
        { name: '@targetId', value: value.targetId },
      ],
    };

    const { resources: allFlagsForContent } = await flagsContainer.items
      .query(escalationQuery)
      .fetchAll();
    const flagCount = allFlagsForContent.length;

    let escalationAction = null;
    if (flagCount >= 3) {
      // Auto-escalate: Mark content for admin review and potentially hide
      escalationAction = {
        type: 'escalated',
        reason: `${flagCount} flags received - requires admin review`,
        timestamp: new Date().toISOString(),
        flagCount,
      };

      // Update content to pending review status
      try {
        const escalationUpdate = [
          {
            op: 'replace' as const,
            path: '/moderationStatus',
            value: 'pending_review',
          },
          {
            op: 'replace' as const,
            path: '/flagCount',
            value: flagCount,
          },
          {
            op: 'replace' as const,
            path: '/updatedAt',
            value: new Date().toISOString(),
          },
        ];

        await targetContainer.item(value.targetId, value.targetId).patch(escalationUpdate);

        // Log escalation
        const escalationLogRecord = {
          id: uuidv4(),
          type: 'content_escalated',
          flagId,
          userId: userContext.userId,
          targetType: value.targetType,
          targetId: value.targetId,
          flagCount,
          escalationReason: `Multiple flags threshold reached (${flagCount} flags)`,
          timestamp: new Date().toISOString(),
          priority: 'high',
        };

        await moderationLogsContainer.items.create(escalationLogRecord);

        context.log(
          `🚨 ESCALATED: ${value.targetType}:${value.targetId} has ${flagCount} flags - marked for admin review`
        );
      } catch (escalationError: any) {
        context.warn(`Failed to escalate content: ${escalationError.message}`);
      }
    }

    // 9. Log to moderation logs for audit trail
    const logRecord = {
      id: uuidv4(),
      type: 'flag_created',
      flagId,
      userId: userContext.userId,
      targetType: value.targetType,
      targetId: value.targetId,
      aiScore: hiveResult.score,
      decision: hiveResult.decision,
      actionTaken: actionTaken?.type || 'none',
      escalationAction: escalationAction?.type || 'none',
      timestamp: createdAt,
    };

    await moderationLogsContainer.items.create(logRecord);

    context.log(
      `✅ Flag created: ${flagId} by user ${userContext.userId} for ${value.targetType}:${value.targetId}`
    );

    // 10. Return success response with Phase 2 enhancements
    return {
      status: 201,
      jsonBody: {
        success: true,
        flagId,
        flag: {
          id: flagRecord.id,
          targetType: flagRecord.targetType,
          targetId: flagRecord.targetId,
          reason: flagRecord.reason,
          createdAt: flagRecord.createdAt,
          status: flagRecord.status,
          aiAnalysis: flagRecord.aiAnalysis,
          actionTaken: flagRecord.actionTaken,
        },
        // Phase 2 additions
        rateLimitInfo: {
          currentCount: recentFlags.length + 1,
          maxPerHour: 10,
          resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
        escalationInfo: escalationAction
          ? {
              status: 'escalated',
              flagCount: allFlagsForContent?.length || 1,
              reason: escalationAction.reason,
            }
          : {
              status: 'pending',
              flagCount: allFlagsForContent?.length || 1,
              escalationThreshold: 3,
            },
      },
    };
  } catch (error: any) {
    context.error('Flag creation error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message:
          process.env['NODE_ENV'] === 'development' ? error.message : 'Unable to process flag',
      },
    };
  }
}

app.http('flagContent', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'moderation/flag',
  handler: flagContent,
});
