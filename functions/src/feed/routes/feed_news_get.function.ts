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
    // ─────────────────────────────────────────────────────────────
    // Tier Gate: News Board is a Black-tier feature
    // ─────────────────────────────────────────────────────────────
    let auth;
    try {
      auth = await extractAuthContext(ctx);
    } catch {
      return ctx.unauthorized('Authentication required for News Board access', 'UNAUTHORIZED');
    }

    if (auth.tier !== 'black' && auth.tier !== 'admin') {
      return ctx.forbidden('News Board requires a Black tier subscription', 'TIER_REQUIRED');
    }

    const viewerId = auth.userId;

    // Fetch public feed
    const feedResult = await getFeed({
      principal: { sub: auth.userId, roles: auth.roles },
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
      'Cache-Control': 'private, no-store',
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
