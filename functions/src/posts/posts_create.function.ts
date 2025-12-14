/**
 * Create Post Function
 * 
 * POST /api/posts
 * 
 * Create a new post.
 * 
 * OpenAPI: posts_create
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { CreatePostRequest, Post } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { postsService } from '@posts/service/postsService';

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

    // Create post using service
    const post = await postsService.createPost(auth.userId, ctx.body);

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
