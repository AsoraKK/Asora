/**
 * Delete Post Function
 * 
 * DELETE /api/posts/{id}
 * 
 * Delete a post (author only).
 * 
 * OpenAPI: posts_delete
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';

export const posts_delete = httpHandler<void, void>(async (ctx) => {
  const postId = ctx.params.id;
  ctx.context.log(`[posts_delete] Deleting post ${postId} [${ctx.correlationId}]`);

  if (!postId) {
    return ctx.badRequest('Post ID is required');
  }

  // TODO: Implement delete post logic
  // - Extract user ID from JWT
  // - Fetch post from Cosmos posts container
  // - Verify current user is the author
  // - Delete post document
  // - Return 204 No Content
  // - Return 404 if post not found
  // - Return 403 if user is not the author

  return ctx.notImplemented('posts_delete');
});

// Register HTTP trigger
app.http('posts_delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware
  route: 'posts/{id}',
  handler: posts_delete,
});
