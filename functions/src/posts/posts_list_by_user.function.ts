/**
 * List Posts by User Function
 * 
 * GET /api/users/{userId}/posts
 * 
 * List posts authored by a specific user (cursor-based pagination).
 * 
 * OpenAPI: posts_list_by_user
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { CursorPaginatedPostView } from '@shared/types/openapi';
import { postsService } from '@posts/service/postsService';
import { extractAuthContext } from '@shared/http/authContext';

export const posts_list_by_user = httpHandler<void, CursorPaginatedPostView>(async (ctx) => {
  const userId = ctx.params.userId;
  const cursor = ctx.query.cursor;
  const limit = Math.min(parseInt(ctx.query.limit || '25', 10), 50);

  ctx.context.log(
    `[posts_list_by_user] Listing posts for user ${userId} [cursor=${cursor}, limit=${limit}] [${ctx.correlationId}]`
  );

  if (!userId) {
    return ctx.badRequest('User ID is required', 'INVALID_REQUEST');
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

    // Fetch posts by user
    const { posts, nextCursor } = await postsService.listPostsByUser(userId, cursor, limit);

    // Enrich posts with author details
    const enrichedPosts = await Promise.all(
      posts.map((post: any) => postsService.enrichPost(post, viewerId))
    );

    return ctx.ok({
      items: enrichedPosts,
      nextCursor,
    });
  } catch (error) {
    ctx.context.error(`[posts_list_by_user] Error listing posts: ${error}`, { correlationId: ctx.correlationId });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('posts_list_by_user', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users/{userId}/posts',
  handler: posts_list_by_user,
});
