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

export const posts_get_by_id = httpHandler<void, PostView>(async (ctx) => {
  const postId = ctx.params.id;
  ctx.context.log(`[posts_get_by_id] Fetching post ${postId} [${ctx.correlationId}]`);

  if (!postId) {
    return ctx.badRequest('Post ID is required');
  }

  // TODO: Implement get post by ID logic
  // - Fetch post from Cosmos posts container
  // - Fetch author profile from Cosmos users container
  // - Enrich with like/comment counts, viewerHasLiked
  // - Return PostView
  // - Return 404 if post not found or not visible to current user

  return ctx.notImplemented('posts_get_by_id');
});

// Register HTTP trigger
app.http('posts_get_by_id', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'posts/{id}',
  handler: posts_get_by_id,
});
