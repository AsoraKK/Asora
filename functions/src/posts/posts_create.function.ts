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
import { recordReputationEvent } from '../reputation/reputationEventService';
import { LedgerEventType } from '../reputation/types';
import { extractTestModeContext, checkTestModeRateLimit } from '@shared/testMode/testModeContext';
import {
  checkAndIncrementPostCount,
  DailyPostLimitExceededError,
} from '@shared/services/dailyPostLimitService';
import { validateOwnedMediaUrls } from '@media/mediaStorageClient';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';
import { getEffectiveEntitlements } from '@shared/services/entitlementService';
import { assertAlphaFeature } from '@alpha/alphaConfig';
import { HttpError } from '@shared/utils/errors';
import { trackAppEvent } from '@shared/appInsights';
import {
  normalizeDeclaredAuthorship,
  resolveAuthorship,
} from '@shared/authorship';

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

export const posts_create = httpHandler<CreatePostRequest, Post>(async ctx => {
  // Extract test mode context FIRST (before any other processing)
  const testContext = extractTestModeContext(ctx.request, ctx.context);

  if (testContext.isTestMode) {
    ctx.context.log(
      `[posts_create] TEST MODE - Creating test post [session=${testContext.sessionId}] [${ctx.correlationId}]`
    );

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
    const alphaConfig = await assertAlphaFeature('postCreation');
    const effectiveEntitlements = await getEffectiveEntitlements(auth.userId, auth.tier);

    // ─────────────────────────────────────────────────────────────
    // Daily Post Limit Enforcement
    // ─────────────────────────────────────────────────────────────
    if (!testContext.isTestMode) {
      try {
        const limitResult = await checkAndIncrementPostCount(
          auth.userId,
          effectiveEntitlements.tier
        );
        ctx.context.log('[posts_create] Daily post limit check passed', {
          userId: auth.userId.slice(0, 8),
          tier: effectiveEntitlements.tier,
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
            tier: effectiveEntitlements.tier,
          });
          const response = ctx.tooManyRequests(err.message, 'daily_post_limit_reached', {
            tier: err.toResponse().tier,
            limit: err.toResponse().limit,
            current: err.toResponse().current,
            resetAt: err.toResponse().resetAt,
          });
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

    if (
      ctx.body.isNews === true &&
      !auth.roles.some(role => role === 'admin' || role === 'journalist' || role === 'editorial')
    ) {
      return ctx.forbidden('Editorial publishing permission is required', 'EDITORIAL_ROLE_REQUIRED');
    }

    if (
      (ctx.body.mediaUrls?.length ?? 0) >
      effectiveEntitlements.limits.maxMediaPerPost
    ) {
      return ctx.badRequest(
        `This tier allows up to ${effectiveEntitlements.limits.maxMediaPerPost} media attachments per post.`,
        'MEDIA_LIMIT_EXCEEDED',
        {
          tier: effectiveEntitlements.tier,
          maxMediaPerPost: effectiveEntitlements.limits.maxMediaPerPost,
        }
      );
    }

    const rawAiLabel = (ctx.body as unknown as Record<string, unknown>).aiLabel;
    const declaredAuthorship = normalizeDeclaredAuthorship(rawAiLabel);
    if (!declaredAuthorship) {
      return ctx.badRequest(
        'Authorship disclosure is required: aiLabel must be "human", "assisted", or "generated"',
        rawAiLabel === undefined ? 'AI_LABEL_REQUIRED' : 'INVALID_AI_LABEL'
      );
    }

    const mediaValidation = await validateOwnedMediaUrls(auth.userId, ctx.body.mediaUrls);
    if (!mediaValidation.valid) {
      return ctx.badRequest(mediaValidationMessage(mediaValidation.reason), 'INVALID_MEDIA_URLS', {
        reason: mediaValidation.reason ?? 'invalid_url',
        invalidCount: mediaValidation.invalidUrls.length,
      });
    }

    // Generate post ID for moderation tracking
    const postId = uuidv7();

    // ─────────────────────────────────────────────────────────────
    // Content Moderation - Check before creating post
    // ─────────────────────────────────────────────────────────────
    const {
      result: moderationResult,
      error: moderationError,
      thresholdVersion,
      classifiedAt,
    } = await moderatePostContent(
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

    const aiDetected = hasAiSignal(moderationMeta.categories ?? []) || mediaModeration.aiDetected;

    const classifierAvailable =
      !alphaConfig.features.aiClassificationEnforcement ||
      (moderationResult !== null && !moderationError && !mediaModeration.error);
    if (
      alphaConfig.features.aiClassificationEnforcement &&
      !classifierAvailable &&
      alphaConfig.aiClassificationFailureMode === 'fail_closed'
    ) {
      return {
        status: 503,
        jsonBody: {
          error: {
            code: 'AI_CLASSIFICATION_UNAVAILABLE',
            message: 'AI classification is temporarily unavailable',
            correlationId: ctx.correlationId,
          },
        },
      };
    }

    const authorship = resolveAuthorship({
      declaration: declaredAuthorship,
      actorId: auth.userId,
      aiDetected,
      classifierAvailable,
      classifiedAt,
      score: Math.max(moderationMeta.confidence ?? 0, mediaModeration.confidence ?? 0) || undefined,
      thresholdVersion,
      categories: Array.from(
        new Set([...(moderationMeta.categories ?? []), ...mediaModeration.categories])
      ),
      providerError: moderationError ?? mediaModeration.error,
    });

    const mergedCategories = Array.from(
      new Set([...(moderationMeta.categories ?? []), ...mediaModeration.categories])
    );
    const mergedConfidence = Math.max(
      moderationMeta.confidence ?? 0,
      mediaModeration.confidence ?? 0
    );
    const mergedStatus =
      authorship.public.reviewState === 'pending' ||
      moderationMeta.status === 'warned' ||
      mediaModeration.status === 'warned'
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
      testContext, // Pass test context for data isolation
      {
        aiLabel: declaredAuthorship,
        aiDetected,
        authorship: authorship.public,
        authorshipInternal: authorship.internal,
        disclosureEvent: authorship.disclosureEvent,
        status: authorship.publicationStatus,
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
    }).catch(error => {
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
      }).catch(error => {
        ctx.context.warn?.('[posts_create] Failed to append MEDIA_CHECKED event', {
          postId: post.id,
          message: (error as Error).message,
        });
      });
    }

    if (alphaConfig.features.reputationAwards && authorship.reputationEligible) {
      if (declaredAuthorship === 'assisted' && content && content.length >= 250) {
        void recordReputationEvent({
          userId: auth.userId,
          ledgerEventType: LedgerEventType.AI_ASSISTED_DISCLOSURE,
          sourceId: post.id,
          sourceType: 'post',
        }).catch(error => {
          ctx.context.warn?.(
            '[posts_create] Failed to record AI_ASSISTED_DISCLOSURE reputation event',
            {
              postId: post.id,
              userId: auth.userId.slice(0, 8),
              message: (error as Error).message,
            }
          );
        });
      } else if (declaredAuthorship === 'human' && content && content.length >= 250) {
        // Phase 1: 250+ char human post earns reputation via ledger
        void recordReputationEvent({
          userId: auth.userId,
          ledgerEventType: LedgerEventType.HUMAN_TEXT_250_PLUS,
          sourceId: post.id,
          sourceType: 'post',
        }).catch(error => {
          ctx.context.warn?.(
            '[posts_create] Failed to record HUMAN_TEXT_250_PLUS reputation event',
            {
              postId: post.id,
              userId: auth.userId.slice(0, 8),
              message: (error as Error).message,
            }
          );
        });
      } else if (declaredAuthorship === 'human') {
        void awardPostCreated(auth.userId, post.id).catch(error => {
          ctx.context.warn?.('[posts_create] Failed to award post-created reputation', {
            postId: post.id,
            userId: auth.userId.slice(0, 8),
            message: (error as Error).message,
          });
        });
      }
    } else if (
      alphaConfig.features.reputationAwards &&
      declaredAuthorship === 'generated' &&
      authorship.publicationStatus === 'published'
    ) {
      void recordReputationEvent({
        userId: auth.userId,
        ledgerEventType: LedgerEventType.AI_GENERATED_TEXT,
        sourceId: post.id,
        sourceType: 'post',
      }).catch(error => {
        ctx.context.warn?.('[posts_create] Failed to record AI_GENERATED_TEXT event', {
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
        authorship.public.reviewState === 'pending'
          ? 'Automated checks completed and marked this post for closer review.'
          : 'Automated checks completed and no moderation action was applied.',
      policyLinks,
      actions: [{ key: 'LEARN_MORE', label: 'Learn more', enabled: true }],
      metadata: {
        moderationAction:
          authorship.public.reviewState === 'pending' ? 'under_review' : 'none',
        proofSignals,
      },
    }).catch(error => {
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

    trackAppEvent({
      name: 'post_created',
      properties: {
        declaredAuthorship,
        authorshipLabel: authorship.public.authorshipLabel,
        classificationSource: authorship.public.classificationSource,
        classificationState: authorship.public.classificationState,
        reviewState: authorship.public.reviewState,
        publicationStatus: authorship.publicationStatus,
        hasMedia: (ctx.body.mediaUrls?.length ?? 0) > 0,
        isNews: ctx.body.isNews === true,
        isTestMode: testContext.isTestMode,
      },
    });

    return ctx.created(post);
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        status: error.status,
        jsonBody: {
          error: {
            code: 'ALPHA_FEATURE_DISABLED',
            message: error.message,
            correlationId: ctx.correlationId,
          },
        },
      };
    }
    ctx.context.error(`[posts_create] Error creating post: ${error}`, {
      correlationId: ctx.correlationId,
    });

    if (error instanceof Error) {
      if (
        error.message.includes('JWT verification failed') ||
        error.message.includes('Missing Authorization')
      ) {
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
