/**
 * User Timeline Feed Function
 * 
 * GET /api/feed/user/{userId}
 * 
 * User timeline (posts from followed accounts).
 * 
 * OpenAPI: feed_user_get
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { CursorPaginatedPostView } from '@shared/types/openapi';
import { getFeed } from '@feed/service/feedService';
import { postsService } from '@posts/service/postsService';
import { extractAuthContext } from '@shared/http/authContext';

export const feed_user_get = httpHandler<void, CursorPaginatedPostView>(async (ctx) => {
  const userId = ctx.params.userId;
  const cursor = ctx.query.cursor;
  const limit = parseInt(ctx.query.limit || '25', 10);
  const includeReplies = ctx.query.includeReplies === 'true';

  ctx.context.log(
    `[feed_user_get] Fetching user timeline for ${userId} [cursor=${cursor}, limit=${limit}] [${ctx.correlationId}]`
  );

  if (!userId) {
    return ctx.badRequest('User ID is required', 'INVALID_REQUEST');
  }

  try {
    // Get viewer ID if authenticated (optional)
    let principal = null;
    let viewerId: string | undefined;
    try {
      const auth = await extractAuthContext(ctx);
      principal = { sub: auth.userId, roles: auth.roles };
      viewerId = auth.userId;
    } catch {
      // Anonymous viewer, no problem
    }

    // Fetch user-specific feed using authorId parameter
    const feedResult = await getFeed({
      principal,
      context: ctx.context,
      cursor,
      limit: limit.toString(),
      authorId: userId,
    });

    // Optionally filter out replies if not requested
    let items = feedResult.body.items;
    if (!includeReplies) {
      items = items.filter((item: any) => !item.replyToPostId && !item.replyToUserId);
    }

    // Enrich posts with author details
    const enrichedPosts = await Promise.all(
      items.map((item: any) => postsService.enrichPost(item, viewerId))
    );

    return ctx.ok({
      items: enrichedPosts,
      nextCursor: feedResult.body.meta.nextCursor || undefined,
    });
  } catch (error) {
    ctx.context.error(`[feed_user_get] Error fetching user feed: ${error}`, { correlationId: ctx.correlationId });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('feed_user_get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'feed/user/{userId}',
  handler: feed_user_get,
});
