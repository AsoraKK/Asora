/**
 * Update Post Function
 *
 * PATCH /api/posts/{id}
 *
 * Update a post (author or moderator/admin only).
 *
 * OpenAPI: posts_update
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { Post, UpdatePostRequest } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { postsService } from '@posts/service/postsService';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';
import {
  moderatePostContent,
  buildModerationMeta,
  moderatePostMediaUrls,
  hasAiSignal,
} from '@posts/service/moderationUtil';
import { appendReceiptEvent } from '@shared/services/receiptEvents';
import { validateOwnedMediaUrls } from '@media/mediaStorageClient';
import { assertAlphaFeature } from '@alpha/alphaConfig';
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

export const posts_update = httpHandler<UpdatePostRequest, Post>(async ctx => {
  const postId = ctx.params.id;
  ctx.context.log(`[posts_update] Updating post ${postId} [${ctx.correlationId}]`);

  if (!postId) {
    return ctx.badRequest('Post ID is required', 'INVALID_REQUEST');
  }

  try {
    const auth = await extractAuthContext(ctx);
    const alphaConfig = await assertAlphaFeature('postCreation');

    if (!ctx.body) {
      return ctx.badRequest('Request body is required', 'INVALID_REQUEST');
    }

    const { content, contentType, mediaUrls, topics, visibility, isNews, aiLabel } = ctx.body;

    const hasUpdatePayload =
      content !== undefined ||
      contentType !== undefined ||
      mediaUrls !== undefined ||
      topics !== undefined ||
      visibility !== undefined ||
      isNews !== undefined ||
      aiLabel !== undefined;

    if (!hasUpdatePayload) {
      return ctx.badRequest('No updatable fields provided', 'INVALID_REQUEST');
    }

    const existing = await postsService.getPostById(postId);
    if (!existing) {
      return ctx.notFound('Post not found', 'POST_NOT_FOUND');
    }

    const isModerator = auth.roles.includes('moderator') || auth.roles.includes('admin');
    if (existing.authorId !== auth.userId && !isModerator) {
      return ctx.forbidden('You do not have permission to edit this post', 'FORBIDDEN');
    }

    if (content !== undefined && content.trim().length === 0) {
      return ctx.badRequest('Post content cannot be empty', 'INVALID_CONTENT');
    }

    const rawAiLabel = aiLabel as unknown;
    const requiresRenewedDisclosure = content !== undefined || mediaUrls !== undefined;
    const declaredAuthorship = normalizeDeclaredAuthorship(rawAiLabel);
    if (requiresRenewedDisclosure && !declaredAuthorship) {
      return ctx.badRequest(
        'Authorship disclosure is required when post content or media changes',
        rawAiLabel === undefined ? 'AI_LABEL_REQUIRED' : 'INVALID_AI_LABEL'
      );
    }
    if (rawAiLabel !== undefined && !declaredAuthorship) {
      return ctx.badRequest(
        'aiLabel must be "human", "assisted", or "generated"',
        'INVALID_AI_LABEL'
      );
    }

    const effectiveContent = content ?? existing.content;
    const effectiveMediaUrls = mediaUrls ?? existing.mediaUrls;
    const effectiveAiLabel =
      declaredAuthorship ?? normalizeDeclaredAuthorship(existing.aiLabel) ?? 'human';

    if (mediaUrls !== undefined) {
      const mediaValidation = await validateOwnedMediaUrls(existing.authorId, mediaUrls);
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
    }

    const {
      result: moderationResult,
      error: moderationError,
      thresholdVersion,
      classifiedAt,
    } = await moderatePostContent(
      effectiveContent,
      auth.userId,
      postId,
      ctx.context,
      ctx.correlationId
    );
    const moderationMeta = buildModerationMeta(moderationResult, moderationError);

    if (moderationMeta.status === 'blocked') {
      return ctx.badRequest('Content violates policy and cannot be posted', 'CONTENT_BLOCKED', {
        appealEligible: true,
        caseId: postId,
        categories: moderationMeta.categories,
      });
    }

    const mediaModeration = await moderatePostMediaUrls(
      effectiveMediaUrls,
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
      declaration: effectiveAiLabel,
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
      priorDisclosureCount: existing.authorshipDisclosureHistory?.length ?? 0,
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

    const updated = await postsService.updatePost(
      postId,
      {
        content,
        contentType,
        mediaUrls,
        topics,
        visibility,
        isNews,
        aiLabel:
          effectiveAiLabel === 'generated'
            ? 'generated'
            : effectiveAiLabel === 'assisted'
              ? 'assisted'
              : 'human',
      },
      {
        ...moderationMeta,
        status: mergedStatus,
        categories: mergedCategories.length > 0 ? mergedCategories : undefined,
        confidence: mergedConfidence > 0 ? mergedConfidence : undefined,
        error: moderationMeta.error ?? mediaModeration.error,
      },
      {
        aiLabel: effectiveAiLabel,
        aiDetected,
        authorship: authorship.public,
        authorshipInternal: authorship.internal,
        disclosureEvent: authorship.disclosureEvent,
        status: authorship.publicationStatus,
      }
    );

    if (!updated) {
      return ctx.notFound('Post not found', 'POST_NOT_FOUND');
    }

    const policyLinks = [
      { title: 'Moderation policy', url: 'https://lythaus.app/policies/moderation' },
    ];
    const proofSignals = {
      captureHashProvided: Boolean(
        ctx.body.proofSignals?.captureMetadataHash || existing.proofSignals?.captureMetadataHash
      ),
      editHashProvided: Boolean(
        ctx.body.proofSignals?.editHistoryHash || existing.proofSignals?.editHistoryHash
      ),
      sourceAttestationProvided: Boolean(
        ctx.body.proofSignals?.sourceAttestationUrl || existing.proofSignals?.sourceAttestationUrl
      ),
    };

    if ((effectiveMediaUrls?.length ?? 0) > 0) {
      void appendReceiptEvent({
        postId,
        actorType: 'system',
        type: 'MEDIA_CHECKED',
        summary: 'Media checked',
        reason: 'Attached media passed safety checks after your edit.',
        policyLinks,
        actions: [{ key: 'LEARN_MORE', label: 'Learn more', enabled: true }],
      }).catch(error => {
        ctx.context.warn?.('[posts_update] Failed to append MEDIA_CHECKED event', {
          postId,
          message: (error as Error).message,
        });
      });
    }

    void appendReceiptEvent({
      postId,
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
      ctx.context.warn?.('[posts_update] Failed to append MODERATION_DECIDED event', {
        postId,
        message: (error as Error).message,
      });
    });

    return ctx.ok(updated);
  } catch (error) {
    ctx.context.error(`[posts_update] Error updating post: ${error}`, {
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

app.http('posts_update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'posts/{id}',
  handler: withRateLimit(posts_update, () => getPolicyForFunction('updatePost')),
});
