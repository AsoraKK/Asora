import type { InvocationContext } from '@azure/functions';
import { performance } from 'perf_hooks';
import { randomUUID } from 'crypto';

import type { Principal } from '@shared/middleware/auth';
import { isRedisEnabled, withRedis } from '@shared/clients/redis';
import { HttpError, badRequestError } from '@shared/utils/errors';

import type { CreatePostBody, CreatePostResult, FeedResult } from '@feed/types';

const RATE_LIMIT_WINDOW_SECONDS = 60;
const MAX_CACHE_POSTS = Number(process.env.FEED_TRENDING_CACHE_SIZE ?? '200');

const inMemoryRateWindow = new Map<number, number>();

function getRateLimitPerMinute(): number {
  const parsed = Number(process.env.POST_RATE_LIMIT_PER_MINUTE ?? '900');
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 900;
  }
  return Math.floor(parsed);
}

export async function getFeed({
  principal: _principal,
  context,
}: {
  principal: Principal;
  context: InvocationContext;
}): Promise<FeedResult> {
  const start = performance.now();
  const redisConfigured = isRedisEnabled();
  let cacheStatus: 'disabled' | 'miss' | 'hit' = redisConfigured ? 'miss' : 'disabled';
  let redisStatus: 'disabled' | 'connected' | 'error' = redisConfigured ? 'connected' : 'disabled';
  let cachedPosts: unknown[] | null = null;
  let ruEstimate = '1';

  context.log('feed.get.start', { principal: _principal.kind });

  if (redisConfigured) {
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
      cacheStatus = 'miss';
      redisStatus = 'error';
      context.log('feed.cache.redis_error', err);
    }
  }

  const feedResponse = {
    ok: true,
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

  const duration = performance.now() - start;
  context.log('feed.get.complete', {
    durationMs: Number(duration.toFixed(2)),
    cacheStatus,
  userType: _principal.kind === 'user' ? 'authenticated' : 'anonymous',
  });

  return {
    body: feedResponse,
    headers: {
      'X-Cache-Status': cacheStatus,
      'X-Redis-Status': redisStatus,
      'X-Request-Duration': duration.toFixed(2),
      'X-RU-Estimate': ruEstimate,
    },
  };
}

export async function createPost({
  principal: _principal,
  payload,
  context,
}: {
  principal: Principal;
  payload: CreatePostBody;
  context: InvocationContext;
}): Promise<CreatePostResult> {
  const start = performance.now();
  const rateLimit = getRateLimitPerMinute();

  let redisStatus: 'disabled' | 'connected' | 'error' = isRedisEnabled() ? 'connected' : 'disabled';
  let cachePrimed = false;
  let rateLimited = false;
  let remainingBudget = rateLimit;

  const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
  if (!text) {
    throw badRequestError('Field "text" is required');
  }

  if (text.length > 2000) {
    throw new HttpError(422, 'Post length exceeds 2000 characters');
  }

  const authorId = typeof payload?.authorId === 'string' ? payload.authorId : null;
  const mediaUrl = typeof payload?.mediaUrl === 'string' ? payload.mediaUrl : null;

  const postId = randomUUID();
  const createdAt = new Date().toISOString();
  const post = {
    postId,
    text,
    mediaUrl,
    authorId,
    createdAt,
    updatedAt: createdAt,
    stats: {
      likes: 0,
      comments: 0,
      replies: 0,
    },
  };

  const windowKey = Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1000));

  const hitsThisWindow = (inMemoryRateWindow.get(windowKey) ?? 0) + 1;
  inMemoryRateWindow.set(windowKey, hitsThisWindow);
  for (const key of inMemoryRateWindow.keys()) {
    if (key < windowKey - 1) {
      inMemoryRateWindow.delete(key);
    }
  }

  if (hitsThisWindow > rateLimit) {
    rateLimited = true;
    remainingBudget = 0;
  } else {
    remainingBudget = Math.max(rateLimit - hitsThisWindow, 0);
  }

  if (isRedisEnabled()) {
    try {
      await withRedis(async redis => {
        const rateKey = `ratelimit:posts:${windowKey}`;
        const currentRate = await redis.incr(rateKey);
        if (currentRate === 1) {
          await redis.expire(rateKey, RATE_LIMIT_WINDOW_SECONDS);
        }

        remainingBudget = Math.max(rateLimit - currentRate, 0);
        if (currentRate > rateLimit) {
          rateLimited = true;
          return;
        }

        const score = Date.now();
        const pipeline = redis.multi();
        pipeline.zadd('feed:trending', score, JSON.stringify(post));
        pipeline.zremrangebyrank('feed:trending', 0, -(MAX_CACHE_POSTS + 1));
        pipeline.hincrby('metrics:posts', 'total', 1);
        await pipeline.exec();
        cachePrimed = true;
      });
    } catch (error) {
      context.log('posts.create.redis_error', error);
      redisStatus = 'error';
    }
  }

  if (rateLimited) {
    const resetSeconds = (windowKey + 1) * RATE_LIMIT_WINDOW_SECONDS;
    const nowSeconds = Math.floor(Date.now() / 1000);
    throw new HttpError(429, 'Post rate limit exceeded. Please retry later.', {
      'Retry-After': Math.max(resetSeconds - nowSeconds, 1).toString(),
      'X-RateLimit-Limit': rateLimit.toString(),
      'X-RateLimit-Remaining': Math.max(remainingBudget, 0).toString(),
      'X-RateLimit-Window': RATE_LIMIT_WINDOW_SECONDS.toString(),
      'X-Redis-Status': redisStatus,
      'X-Cache-Primed': cachePrimed ? 'true' : 'false',
    });
  }

  const duration = performance.now() - start;

  context.log('posts.create.metrics', {
    postId,
    durationMs: Number(duration.toFixed(2)),
    redisStatus,
    cachePrimed,
    remainingBudget,
  });

  return {
    body: {
      status: 'success',
      post,
    },
    headers: {
      'X-Request-Duration': duration.toFixed(2),
      'X-RateLimit-Limit': rateLimit.toString(),
      'X-RateLimit-Remaining': Math.max(remainingBudget, 0).toString(),
      'X-RateLimit-Window': RATE_LIMIT_WINDOW_SECONDS.toString(),
      'X-Redis-Status': redisStatus,
      'X-Cache-Primed': cachePrimed ? 'true' : 'false',
      'X-RU-Estimate': '1',
    },
  };
}

export function __resetPostRateLimiterForTests(): void {
  inMemoryRateWindow.clear();
}
