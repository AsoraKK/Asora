/**
 * Create Post Function
 * 
 * POST /api/posts
 * 
 * Create a new post with Hive AI content moderation.
 * Supports Live Test Mode with automatic data isolation.
 * 
 * OpenAPI: posts_create
 */

import { app } from '@azure/functions';
import { v7 as uuidv7 } from 'uuid';
import { httpHandler } from '@shared/http/handler';
import type { CreatePostRequest, Post } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { postsService } from '@posts/service/postsService';
import {
  moderatePostContent,
  buildModerationMeta,
  moderatePostMediaUrls,
  hasAiSignal,
} from '@posts/service/moderationUtil';
import { appendReceiptEvent } from '@shared/services/receiptEvents';
import { awardPostCreated } from '@shared/services/reputationService';
import { extractTestModeContext, checkTestModeRateLimit } from '@shared/testMode/testModeContext';
import {
  checkAndIncrementPostCount,
  DailyPostLimitExceededError,
} from '@shared/services/dailyPostLimitService';
import { validateOwnedMediaUrls } from '@media/mediaStorageClient';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

function normalizeAiLabel(label: unknown): 'human' | 'generated' | undefined {
  if (label === undefined || label === null) {
    return undefined;
  }
  if (typeof label !== 'string') {
    return undefined;
  }

  const normalized = label.trim().toLowerCase();
  if (normalized === 'human' || normalized === 'generated') {
    return normalized;
  }
  return undefined;
}

function mediaValidationMessage(reason?: string): string {
  switch (reason) {
    case 'ownership_mismatch':
      return 'One or more media items are not owned by your account.';
    case 'blob_missing':
      return 'One or more media items were not found. Please upload again.';
    case 'blob_stale':
      return 'One or more media items expired before posting. Please upload again.';
    case 'invalid_url':
      return 'One or more media URLs are invalid.';
    case 'storage_not_configured':
      return 'Media uploads are currently unavailable.';
    default:
      return 'Unable to validate media attachments.';
  }
}

export const posts_create = httpHandler<CreatePostRequest, Post>(async (ctx) => {
  // Extract test mode context FIRST (before any other processing)
  const testContext = extractTestModeContext(ctx.request, ctx.context);
  
  if (testContext.isTestMode) {
    ctx.context.log(`[posts_create] TEST MODE - Creating test post [session=${testContext.sessionId}] [${ctx.correlationId}]`);
    
    // Check rate limits for test mode
    const rateLimit = await checkTestModeRateLimit(
      testContext.sessionId || 'unknown',
      'postsPerHour',
      ctx.context
    );
    
    if (!rateLimit.allowed) {
      return ctx.tooManyRequests('Test mode rate limit exceeded', 'TEST_RATE_LIMIT', {
        remaining: rateLimit.remaining,
        resetAt: new Date(rateLimit.resetAt).toISOString(),
      });
    }
  } else {
    ctx.context.log(`[posts_create] Creating new post [${ctx.correlationId}]`);
  }

  try {
    // Extract and verify JWT
    const auth = await extractAuthContext(ctx);

    // ─────────────────────────────────────────────────────────────
    // Daily Post Limit Enforcement
    // ─────────────────────────────────────────────────────────────
    if (!testContext.isTestMode) {
      try {
        const limitResult = await checkAndIncrementPostCount(auth.userId, auth.tier);
        ctx.context.log('[posts_create] Daily post limit check passed', {
          userId: auth.userId.slice(0, 8),
          tier: auth.tier,
          newCount: limitResult.newCount,
          remaining: limitResult.remaining,
        });
      } catch (limitError) {
        if (
          limitError instanceof DailyPostLimitExceededError ||
          (limitError !== null &&
            typeof limitError === 'object' &&
            'code' in limitError &&
            (limitError as any).code === 'daily_post_limit_reached')
        ) {
          const err = limitError as DailyPostLimitExceededError;
          ctx.context.warn?.('[posts_create] Daily post limit exceeded', {
            userId: auth.userId.slice(0, 8),
            tier: auth.tier,
          });
            const response = ctx.tooManyRequests(
              err.message,
              'daily_post_limit_reached',
              {
                tier: err.toResponse().tier,
                limit: err.toResponse().limit,
                current: err.toResponse().current,
                resetAt: err.toResponse().resetAt,
              }
            );
            response.headers = {
              ...response.headers,
              'Retry-After': '86400',
            };
            return response;
        }
        throw limitError;
      }
    }

    // Validate request body
    if (!ctx.body) {
      return ctx.badRequest('Request body is required', 'INVALID_REQUEST');
    }

    const { content, contentType } = ctx.body;

    // Validate required fields
    if (!content || content.trim().length === 0) {
      return ctx.badRequest('Post content is required', 'INVALID_CONTENT');
    }

    if (!contentType) {
      return ctx.badRequest('Content type is required', 'INVALID_CONTENT_TYPE');
    }

    const rawAiLabel = (ctx.body as unknown as Record<string, unknown>).aiLabel;
    if (rawAiLabel !== undefined && normalizeAiLabel(rawAiLabel) === undefined) {
      return ctx.badRequest('aiLabel must be "human" or "generated"', 'INVALID_AI_LABEL');
    }

    const effectiveAiLabel = String(normalizeAiLabel(rawAiLabel) ?? 'human');

    const mediaValidation = await validateOwnedMediaUrls(auth.userId, ctx.body.mediaUrls);
    if (!mediaValidation.valid) {
      return ctx.badRequest(
        mediaValidationMessage(mediaValidation.reason),
        'INVALID_MEDIA_URLS',
        {
          reason: mediaValidation.reason ?? 'invalid_url',
          invalidCount: mediaValidation.invalidUrls.length,
        }
      );
    }

    // Generate post ID for moderation tracking
    const postId = uuidv7();

    // ─────────────────────────────────────────────────────────────
    // Content Moderation - Check before creating post
    // ─────────────────────────────────────────────────────────────
    const { result: moderationResult, error: moderationError } = await moderatePostContent(
      content,
      auth.userId,
      postId,
      ctx.context,
      ctx.correlationId
    );

    const moderationMeta = buildModerationMeta(moderationResult, moderationError);

    // Block content that violates policy
    if (moderationMeta.status === 'blocked') {
      ctx.context.log('[posts_create] Content blocked by moderation', {
        postId,
        categories: moderationMeta.categories,
        isTestMode: testContext.isTestMode,
      });
      return ctx.badRequest('Content violates policy and cannot be posted', 'CONTENT_BLOCKED', {
        appealEligible: true,
        caseId: postId,
        categories: moderationMeta.categories,
      });
    }

    const mediaModeration = await moderatePostMediaUrls(
      ctx.body.mediaUrls,
      auth.userId,
      postId,
      ctx.context
    );

    if (mediaModeration.status === 'blocked') {
      return ctx.badRequest('Media violates policy and cannot be posted', 'CONTENT_BLOCKED', {
        appealEligible: true,
        caseId: postId,
        categories: mediaModeration.categories,
      });
    }

    const aiDetected =
      hasAiSignal(moderationMeta.categories ?? []) || mediaModeration.aiDetected;

    if (effectiveAiLabel === 'generated') {
      return ctx.badRequest(
        'AI-generated content cannot be published. You can appeal this decision.',
        'AI_CONTENT_BLOCKED',
        { appealEligible: true, caseId: postId }
      );
    }

    if (aiDetected && effectiveAiLabel !== 'generated') {
      return ctx.badRequest(
        'Potential AI-generated content must be labeled and is not publishable.',
        'AI_LABEL_REQUIRED',
        {
          appealEligible: true,
          caseId: postId,
          categories: [
            ...(moderationMeta.categories ?? []),
            ...mediaModeration.categories,
          ],
        }
      );
    }

    const mergedCategories = Array.from(
      new Set([...(moderationMeta.categories ?? []), ...mediaModeration.categories])
    );
    const mergedConfidence = Math.max(
      moderationMeta.confidence ?? 0,
      mediaModeration.confidence ?? 0
    );
    const mergedStatus =
      moderationMeta.status === 'warned' || mediaModeration.status === 'warned'
        ? 'warned'
        : moderationMeta.status;

    // Create post using service with moderation metadata and test context
    const post = await postsService.createPost(
      auth.userId, 
      ctx.body, 
      postId, 
      {
        ...moderationMeta,
        status: mergedStatus,
        categories: mergedCategories.length > 0 ? mergedCategories : undefined,
        confidence: mergedConfidence > 0 ? mergedConfidence : undefined,
        error: moderationMeta.error ?? mediaModeration.error,
      },
      testContext,  // Pass test context for data isolation
      {
        aiLabel: effectiveAiLabel === 'generated' ? 'generated' : 'human',
        aiDetected,
      }
    );

    const policyLinks = [
      { title: 'Moderation policy', url: 'https://lythaus.app/policies/moderation' },
    ];
    const proofSignals = {
      captureHashProvided: Boolean(ctx.body.proofSignals?.captureMetadataHash),
      editHashProvided: Boolean(ctx.body.proofSignals?.editHistoryHash),
      sourceAttestationProvided: Boolean(ctx.body.proofSignals?.sourceAttestationUrl),
    };

    void appendReceiptEvent({
      postId: post.id,
      actorType: 'user',
      actorId: auth.userId,
      type: 'RECEIPT_CREATED',
      summary: 'Post created',
      reason: 'Your content was published and recorded in the trust timeline.',
      policyLinks,
      actions: [{ key: 'LEARN_MORE', label: 'Learn more', enabled: true }],
      metadata: { proofSignals },
    }).catch((error) => {
      ctx.context.warn?.('[posts_create] Failed to append RECEIPT_CREATED event', {
        postId: post.id,
        message: (error as Error).message,
      });
    });

    if ((ctx.body.mediaUrls?.length ?? 0) > 0) {
      void appendReceiptEvent({
        postId: post.id,
        actorType: 'system',
        type: 'MEDIA_CHECKED',
        summary: 'Media checked',
        reason: 'Attached media passed safety checks before publish.',
        policyLinks,
        actions: [{ key: 'LEARN_MORE', label: 'Learn more', enabled: true }],
      }).catch((error) => {
        ctx.context.warn?.('[posts_create] Failed to append MEDIA_CHECKED event', {
          postId: post.id,
          message: (error as Error).message,
        });
      });
    }

    if (!aiDetected && effectiveAiLabel !== 'generated') {
      void awardPostCreated(auth.userId, post.id).catch((error) => {
        ctx.context.warn?.('[posts_create] Failed to award post-created reputation', {
          postId: post.id,
          userId: auth.userId.slice(0, 8),
          message: (error as Error).message,
        });
      });
    }

    void appendReceiptEvent({
      postId: post.id,
      actorType: 'system',
      type: 'MODERATION_DECIDED',
      summary: 'Moderation completed',
      reason:
        mergedStatus === 'warned'
          ? 'Automated checks completed and marked this post for closer review.'
          : 'Automated checks completed and no moderation action was applied.',
      policyLinks,
      actions: [{ key: 'LEARN_MORE', label: 'Learn more', enabled: true }],
      metadata: {
        moderationAction: mergedStatus === 'warned' ? 'limited' : 'none',
        proofSignals,
      },
    }).catch((error) => {
      ctx.context.warn?.('[posts_create] Failed to append MODERATION_DECIDED event', {
        postId: post.id,
        message: (error as Error).message,
      });
    });
    
    // Log test post creation for audit trail
    if (testContext.isTestMode) {
      ctx.context.log('[posts_create] TEST POST created', {
        postId: post.id,
        sessionId: testContext.sessionId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return ctx.created(post);
  } catch (error) {
    ctx.context.error(`[posts_create] Error creating post: ${error}`, { correlationId: ctx.correlationId });

    if (error instanceof Error) {
      if (error.message.includes('JWT verification failed') || error.message.includes('Missing Authorization')) {
        return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
      }
    }

    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('posts_create', {
  methods: ['POST'],
  authLevel: 'anonymous', // Auth verified in handler via JWT
  route: 'posts',
  handler: withRateLimit(posts_create, () => getPolicyForFunction('createPost')),
});
