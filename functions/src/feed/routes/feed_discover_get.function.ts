/**
 * Discover Feed Function
 * 
 * GET /api/feed/discover
 * 
 * Personalized discover feed for guests or new users.
 * 
 * OpenAPI: feed_discover_get
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { CursorPaginatedPostView } from '@shared/types/openapi';
import { getFeed } from '@feed/service/feedService';
import { postsService } from '@posts/service/postsService';
import { extractAuthContext } from '@shared/http/authContext';

export const feed_discover_get = httpHandler<void, CursorPaginatedPostView>(async (ctx) => {
  const cursor = ctx.query.cursor;
  const limit = parseInt(ctx.query.limit || '25', 10);
  const includeTopics = ctx.query.includeTopics?.split(',').filter(Boolean);
  const excludeTopics = ctx.query.excludeTopics?.split(',').filter(Boolean);

  ctx.context.log(
    `[feed_discover_get] Fetching discover feed [cursor=${cursor}, limit=${limit}] [${ctx.correlationId}]`
  );

  try {
    // Get viewer ID if authenticated (optional for public feed)
    let principal = null;
    let viewerId: string | undefined;
    try {
      const auth = await extractAuthContext(ctx);
      principal = { sub: auth.userId, roles: auth.roles };
      viewerId = auth.userId;
    } catch {
      // Anonymous viewer, no problem
    }

    // Fetch public discovery feed
    const feedResult = await getFeed({
      principal,
      context: ctx.context,
      cursor,
      limit: limit.toString(),
      authorId: null, // Public feed, not user-specific
    });

    // Filter by topics if provided
    let items = feedResult.body.items;
    
    if (includeTopics && includeTopics.length > 0) {
      const topicSet = new Set(includeTopics);
      items = items.filter((item: any) => {
        const postTopics = item.topics || [];
        return postTopics.some((topic: string) => topicSet.has(topic));
      });
    }
    
    if (excludeTopics && excludeTopics.length > 0) {
      const excludeSet = new Set(excludeTopics);
      items = items.filter((item: any) => {
        const postTopics = item.topics || [];
        return !postTopics.some((topic: string) => excludeSet.has(topic));
      });
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
    ctx.context.error(`[feed_discover_get] Error fetching discovery feed: ${error}`, { correlationId: ctx.correlationId });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('feed_discover_get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'feed/discover',
  handler: feed_discover_get,
});
