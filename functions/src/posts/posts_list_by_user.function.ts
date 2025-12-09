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

export const posts_list_by_user = httpHandler<void, CursorPaginatedPostView>(async (ctx) => {
  const userId = ctx.params.userId;
  const cursor = ctx.query.cursor;
  const limit = parseInt(ctx.query.limit || '25', 10);

  ctx.context.log(
    `[posts_list_by_user] Listing posts for user ${userId} [cursor=${cursor}, limit=${limit}] [${ctx.correlationId}]`
  );

  if (!userId) {
    return ctx.badRequest('User ID is required');
  }

  // TODO: Implement list posts by user logic
  // - Query Cosmos posts container with partition key /authorId = userId
  // - Apply cursor-based pagination
  // - Enrich each post with author profile and engagement metrics
  // - Return CursorPaginatedPostView with nextCursor

  return ctx.notImplemented('posts_list_by_user');
});

// Register HTTP trigger
app.http('posts_list_by_user', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users/{userId}/posts',
  handler: posts_list_by_user,
});
