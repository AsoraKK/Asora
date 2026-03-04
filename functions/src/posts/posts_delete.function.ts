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
import { extractAuthContext } from '@shared/http/authContext';
import { postsService } from '@posts/service/postsService';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

export const posts_delete = httpHandler<void, void>(async (ctx) => {
  const postId = ctx.params.id;
  ctx.context.log(`[posts_delete] Deleting post ${postId} [${ctx.correlationId}]`);

  if (!postId) {
    return ctx.badRequest('Post ID is required', 'INVALID_REQUEST');
  }

  try {
    // Extract and verify JWT
    const auth = await extractAuthContext(ctx);

    // Fetch post to verify ownership
    const postDoc = await postsService.getPostById(postId);
    if (!postDoc) {
      return ctx.notFound('Post not found', 'POST_NOT_FOUND');
    }

    // Check ownership (or moderator role)
    const isModerator = auth.roles.includes('moderator') || auth.roles.includes('admin');
    if (postDoc.authorId !== auth.userId && !isModerator) {
      return ctx.forbidden('You do not have permission to delete this post', 'FORBIDDEN');
    }

    // Delete post
    await postsService.deletePost(postId);

    return ctx.noContent();
  } catch (error) {
    ctx.context.error(`[posts_delete] Error deleting post: ${error}`, { correlationId: ctx.correlationId });

    if (error instanceof Error) {
      if (error.message.includes('JWT verification failed') || error.message.includes('Missing Authorization')) {
        return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
      }
    }

    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('posts_delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous', // Auth verified in handler via JWT
  route: 'posts/{id}',
  handler: withRateLimit(posts_delete, () => getPolicyForFunction('deletePost')),
});
