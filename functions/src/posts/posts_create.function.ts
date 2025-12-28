/**
 * Create Post Function
 * 
 * POST /api/posts
 * 
 * Create a new post with Hive AI content moderation.
 * 
 * OpenAPI: posts_create
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { CreatePostRequest, Post } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { postsService } from '@posts/service/postsService';
import { moderatePostContent, buildModerationMeta } from '@posts/service/moderationUtil';

export const posts_create = httpHandler<CreatePostRequest, Post>(async (ctx) => {
  ctx.context.log(`[posts_create] Creating new post [${ctx.correlationId}]`);

  try {
    // Extract and verify JWT
    const auth = await extractAuthContext(ctx);

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

    // Generate post ID for moderation tracking
    const postId = crypto.randomUUID();

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
      });
      return ctx.badRequest('Content violates policy and cannot be posted', 'CONTENT_BLOCKED', {
        categories: moderationMeta.categories,
        confidence: moderationMeta.confidence,
      });
    }

    // Create post using service with moderation metadata
    const post = await postsService.createPost(auth.userId, ctx.body, postId, moderationMeta);

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
  handler: posts_create,
});
