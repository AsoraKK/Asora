/**
 * Get Post by ID Function
 * 
 * GET /api/posts/{id}
 * 
 * Retrieve a single post by ID.
 * 
 * OpenAPI: posts_get_by_id
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { PostView } from '@shared/types/openapi';
import { postsService } from '@posts/service/postsService';
import { extractAuthContext } from '@shared/http/authContext';

export const posts_get_by_id = httpHandler<void, PostView>(async (ctx) => {
  const postId = ctx.params.id;
  ctx.context.log(`[posts_get_by_id] Fetching post ${postId} [${ctx.correlationId}]`);

  if (!postId) {
    return ctx.badRequest('Post ID is required', 'INVALID_REQUEST');
  }

  try {
    // Get viewer ID if authenticated (optional)
    let viewerId: string | undefined;
    try {
      const auth = await extractAuthContext(ctx);
      viewerId = auth.userId;
    } catch {
      // Anonymous viewer, no problem
    }

    // Fetch post
    const postDoc = await postsService.getPostById(postId);
    if (!postDoc) {
      return ctx.notFound('Post not found', 'POST_NOT_FOUND');
    }

    // Hide deleted or blocked posts
    // Binary content state: only blocked or deleted posts are hidden
    if (postDoc.status === 'deleted' || postDoc.status === 'blocked') {
      return ctx.notFound('Post not found', 'POST_NOT_FOUND');
    }

    // Enrich post with author details
    const postView = await postsService.enrichPost(postDoc, viewerId);

    return ctx.ok(postView);
  } catch (error) {
    ctx.context.error(`[posts_get_by_id] Error fetching post: ${error}`, { correlationId: ctx.correlationId });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('posts_get_by_id', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'posts/{id}',
  handler: posts_get_by_id,
});
