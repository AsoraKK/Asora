import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { performance } from 'perf_hooks';
import { isRedisEnabled, withRedis } from '../../shared/redisClient';

/**
 * Feed Get Handler - Returns feed data
 *
 * This endpoint provides the main feed data for the Asora platform.
 * It's designed to be cached at the edge via Cloudflare Workers.
 *
 * @param request - The HTTP request object
 * @param context - The Azure Functions invocation context
 * @returns HTTP response with feed data
 */
export async function getFeed(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const start = performance.now();
  const redisConfigured = isRedisEnabled();
  let cacheStatus: 'disabled' | 'miss' | 'hit' = 'disabled';
  let redisStatus: 'disabled' | 'connected' | 'error' = redisConfigured ? 'connected' : 'disabled';
  let cachedPosts: unknown[] | null = null;
  let ruEstimate = '1';

  try {
    context.log('Feed GET endpoint called');

    if (redisConfigured) {
      cacheStatus = 'miss';
      try {
        await withRedis(async redis => {
          const raw = await redis.zrevrange('feed:trending', 0, 19);
          if (raw.length > 0) {
            cacheStatus = 'hit';
            ruEstimate = '0';
            cachedPosts = raw
              .map(entry => {
                try {
                  return JSON.parse(entry);
                } catch (err) {
                  context.log('feed.cache.parse_error', err);
                  return null;
                }
              })
              .filter((item): item is Record<string, unknown> => Boolean(item));
          }
        });
      } catch (err) {
        redisStatus = 'error';
        context.log('feed.cache.redis_error', err);
      }
    }

    // For now, return a simple response
    // TODO: Implement actual feed data retrieval from Cosmos DB
    const feedResponse = {
      ok: true, // <-- add this line
      status: 'ok',
      service: 'asora-function-dev',
      ts: new Date().toISOString(),
      data: {
        posts: cachedPosts ?? [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          hasMore: false,
        },
      },
    };

    if (cacheStatus === 'disabled') {
      context.log('Feed cache disabled - REDIS_CONNECTION_STRING not set');
    }

    // Cache behavior: unauthenticated requests cache for 60s at the edge,
    // authenticated requests must not be cached.
    const hasAuth = request.headers?.has('authorization') || false;
    const cacheControl = hasAuth ? 'private, no-store' : 'public, max-age=60';

    const duration = performance.now() - start;
    context.log('feed.metrics', {
      durationMs: Number(duration.toFixed(2)),
      cacheStatus,
      userType: hasAuth ? 'authenticated' : 'anonymous',
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': cacheControl,
        Vary: 'Authorization',
        'X-Cache-Status': cacheStatus,
        'X-Redis-Status': redisStatus,
        'X-Request-Duration': duration.toFixed(2),
        'X-RU-Estimate': ruEstimate,
      },
      jsonBody: feedResponse,
    };
  } catch (error) {
    context.log('Error in feed GET handler:', error);

    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      jsonBody: {
        status: 'error',
        message: 'Internal server error',
        ts: new Date().toISOString(),
      },
    };
  }
}
