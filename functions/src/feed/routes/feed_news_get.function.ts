/**
 * News Feed Function
 * 
 * GET /api/feed/news
 * 
 * Hybrid News feed combining journalists and high-reputation users.
 * 
 * OpenAPI: feed_news_get
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { CursorPaginatedPostView } from '@shared/types/openapi';
import { getFeed } from '@feed/service/feedService';
import { postsService } from '@posts/service/postsService';
import { extractAuthContext } from '@shared/http/authContext';

export const feed_news_get = httpHandler<void, CursorPaginatedPostView>(async (ctx) => {
  const cursor = ctx.query.cursor;
  const limit = parseInt(ctx.query.limit || '25', 10);
  const region = ctx.query.region;
  const includeHighReputation = ctx.query.includeHighReputation === 'true';
  const includeTopics = ctx.query.includeTopics?.split(',').filter(Boolean);

  ctx.context.log(
    `[feed_news_get] Fetching news feed [region=${region}, cursor=${cursor}, limit=${limit}] [${ctx.correlationId}]`
  );

  try {
    // Get viewer ID if authenticated (optional)
    let isAuthenticated = false;
    let principal = null;
    let viewerId: string | undefined;
    try {
      const auth = await extractAuthContext(ctx);
      isAuthenticated = true;
      principal = { sub: auth.userId, roles: auth.roles };
      viewerId = auth.userId;
    } catch {
      // Anonymous viewer, no problem
    }

    // Fetch public feed
    const feedResult = await getFeed({
      principal,
      context: ctx.context,
      cursor,
      limit: limit.toString(),
      authorId: null,
    });

    // Filter for news posts (isNews=true)
    let items = feedResult.body.items.filter((item: any) => item.isNews === true);

    // Optional: Filter by region
    if (region && items.length > 0) {
      items = items.filter((item: any) => {
        const postRegion = item.region || 'global';
        return postRegion === region || postRegion === 'global';
      });
    }

    // Optional: Filter by topics
    if (includeTopics && includeTopics.length > 0 && items.length > 0) {
      const topicSet = new Set(includeTopics);
      items = items.filter((item: any) => {
        const postTopics = item.topics || [];
        return postTopics.some((topic: string) => topicSet.has(topic));
      });
    }

    // Enrich posts with author details
    const enrichedPosts = await Promise.all(
      items.map((item: any) => postsService.enrichPost(item, viewerId))
    );

    const response = ctx.ok({
      items: enrichedPosts,
      nextCursor: items.length > 0 ? feedResult.body.meta.nextCursor || undefined : undefined,
    });
    response.headers = {
      ...response.headers,
      'Cache-Control': isAuthenticated
        ? 'private, no-store'
        : 'public, max-age=60, stale-while-revalidate=30',
      Vary: 'Authorization',
    };
    return response;
  } catch (error) {
    ctx.context.error(`[feed_news_get] Error fetching news feed: ${error}`, { correlationId: ctx.correlationId });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('feed_news_get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'feed/news',
  handler: feed_news_get,
});
