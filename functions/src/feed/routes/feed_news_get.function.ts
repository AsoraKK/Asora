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
import { handleCorsAndMethod } from '@shared/utils/http';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForRoute } from '@rate-limit/policies';
import type { NewsBoardFeedResponse } from '@shared/types/openapi';
import { getFeed } from '@feed/service/feedService';
import { postsService } from '@posts/service/postsService';
import { extractAuthContext } from '@shared/http/authContext';
import { getEffectiveEntitlements } from '@shared/services/entitlementService';
import { assertAlphaFeature } from '@alpha/alphaConfig';

const FREE_PREVIEW_LIMIT = 3;

export const feed_news_get = httpHandler<void, NewsBoardFeedResponse>(async ctx => {
  const cors = handleCorsAndMethod(ctx.request.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const cursor = ctx.query.cursor;
  const limit = parseInt(ctx.query.limit || '25', 10);
  const region = ctx.query.region;
  const includeHighReputation = ctx.query.includeHighReputation === 'true';
  const includeTopics = ctx.query.includeTopics?.split(',').filter(Boolean);

  ctx.context.log(
    `[feed_news_get] Fetching news feed [region=${region}, cursor=${cursor}, limit=${limit}] [${ctx.correlationId}]`
  );

  try {
    await assertAlphaFeature('newsBoard');
    // ─────────────────────────────────────────────────────────────
    // Free receives a constrained preview; Premium and Black receive full access.
    // Admin is an authorization role, never a commercial tier.
    // ─────────────────────────────────────────────────────────────
    let auth;
    try {
      auth = await extractAuthContext(ctx);
    } catch {
      return ctx.unauthorized('Authentication required for News Board access', 'UNAUTHORIZED');
    }

    const effective = await getEffectiveEntitlements(auth.userId, auth.tier);
    const accessLevel = effective.limits.newsBoardAccessLevel;
    const previewOnly = accessLevel === 'preview';

    const viewerId = auth.userId;

    // Fetch public feed
    const feedResult = await getFeed({
      principal: { sub: auth.userId, roles: auth.roles },
      context: ctx.context,
      cursor: previewOnly ? undefined : cursor,
      limit: Math.min(limit, previewOnly ? FREE_PREVIEW_LIMIT : 50).toString(),
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
    const enrichedPosts = await postsService.enrichFeedPosts(items as any[], viewerId);

    const response = ctx.ok({
      items: enrichedPosts,
      nextCursor:
        !previewOnly && items.length > 0
          ? feedResult.body.meta.nextCursor || undefined
          : undefined,
      accessLevel,
      locked: previewOnly,
      ...(previewOnly ? { previewLimit: FREE_PREVIEW_LIMIT } : {}),
    });
    response.headers = {
      ...response.headers,
      'Cache-Control': 'private, no-store',
      Vary: 'Authorization',
    };
    return response;
  } catch (error) {
    ctx.context.error(`[feed_news_get] Error fetching news feed: ${error}`, {
      correlationId: ctx.correlationId,
    });
    return ctx.internalError(error as Error);
  }
});

const rateLimitedFeedNews = withRateLimit(feed_news_get, req => getPolicyForRoute(req));

// Register HTTP trigger
app.http('feed_news_get', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'feed/news',
  handler: rateLimitedFeedNews,
});
