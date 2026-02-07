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
import {
  moderatePostContent,
  buildModerationMeta,
  moderatePostMediaUrls,
  hasAiSignal,
} from '@posts/service/moderationUtil';

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

export const posts_update = httpHandler<UpdatePostRequest, Post>(async (ctx) => {
  const postId = ctx.params.id;
  ctx.context.log(`[posts_update] Updating post ${postId} [${ctx.correlationId}]`);

  if (!postId) {
    return ctx.badRequest('Post ID is required', 'INVALID_REQUEST');
  }

  try {
    const auth = await extractAuthContext(ctx);

    if (!ctx.body) {
      return ctx.badRequest('Request body is required', 'INVALID_REQUEST');
    }

    const {
      content,
      contentType,
      mediaUrls,
      topics,
      visibility,
      isNews,
      aiLabel,
    } = ctx.body;

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
    if (rawAiLabel !== undefined && normalizeAiLabel(rawAiLabel) === undefined) {
      return ctx.badRequest('aiLabel must be "human" or "generated"', 'INVALID_AI_LABEL');
    }

    const effectiveContent = content ?? existing.content;
    const effectiveMediaUrls = mediaUrls ?? existing.mediaUrls;
    const effectiveAiLabel = String(
      normalizeAiLabel(rawAiLabel) ?? existing.aiLabel ?? 'human'
    );

    const { result: moderationResult, error: moderationError } = await moderatePostContent(
      effectiveContent,
      auth.userId,
      postId,
      ctx.context,
      ctx.correlationId
    );
    const moderationMeta = buildModerationMeta(moderationResult, moderationError);

    if (moderationMeta.status === 'blocked') {
      return ctx.badRequest('Content violates policy and cannot be posted', 'CONTENT_BLOCKED', {
        categories: moderationMeta.categories,
        confidence: moderationMeta.confidence,
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
        categories: mediaModeration.categories,
        confidence: mediaModeration.confidence,
      });
    }

    const aiDetected =
      hasAiSignal(moderationMeta.categories ?? []) || mediaModeration.aiDetected;

    if (effectiveAiLabel === 'generated') {
      return ctx.badRequest(
        'AI-generated content cannot be published. You can appeal this decision.',
        'AI_CONTENT_BLOCKED',
        { appealEligible: true }
      );
    }

    if (aiDetected && effectiveAiLabel !== 'generated') {
      return ctx.badRequest(
        'Potential AI-generated content must be labeled and is not publishable.',
        'AI_LABEL_REQUIRED',
        {
          appealEligible: true,
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

    const updated = await postsService.updatePost(
      postId,
      {
        content,
        contentType,
        mediaUrls,
        topics,
        visibility,
        isNews,
        aiLabel: effectiveAiLabel === 'generated' ? 'generated' : 'human',
      },
      {
        ...moderationMeta,
        status: mergedStatus,
        categories: mergedCategories.length > 0 ? mergedCategories : undefined,
        confidence: mergedConfidence > 0 ? mergedConfidence : undefined,
        error: moderationMeta.error ?? mediaModeration.error,
      },
      {
        aiLabel: effectiveAiLabel === 'generated' ? 'generated' : 'human',
        aiDetected,
      }
    );

    if (!updated) {
      return ctx.notFound('Post not found', 'POST_NOT_FOUND');
    }

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
  handler: posts_update,
});
