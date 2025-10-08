import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { performance } from 'perf_hooks';
import { randomUUID } from 'crypto';

import { isRedisEnabled, withRedis } from '../../shared/redisClient';

interface CreatePostBody {
  text?: string;
  mediaUrl?: string | null;
  authorId?: string | null;
}

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

export function __resetPostRateLimiterForTests(): void {
  inMemoryRateWindow.clear();
}

export async function createPost(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const start = performance.now();

  const rateLimit = getRateLimitPerMinute();

  let redisStatus: 'disabled' | 'connected' | 'error' = isRedisEnabled() ? 'connected' : 'disabled';
  let cachePrimed = false;
  let rateLimited = false;
  let remainingBudget = rateLimit;

  let payload: CreatePostBody;
  try {
    payload = (await request.json()) as CreatePostBody;
  } catch (error) {
    context.log('posts.create.invalid_json', error);
    return buildResponse(400, {
      status: 'error',
      message: 'Invalid JSON payload',
    });
  }

  const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
  if (!text) {
    return buildResponse(400, {
      status: 'error',
      message: 'Field "text" is required',
    });
  }

  if (text.length > 2000) {
    return buildResponse(422, {
      status: 'error',
      message: 'Post length exceeds 2000 characters',
    });
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

  // In-memory fallback to ensure some throttling even without Redis
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
    return buildResponse(
      429,
      {
        status: 'error',
        message: 'Post rate limit exceeded. Please retry later.',
      },
      {
        'Retry-After': Math.max(resetSeconds - nowSeconds, 1).toString(),
        'X-RateLimit-Limit': rateLimit.toString(),
        'X-RateLimit-Remaining': Math.max(remainingBudget, 0).toString(),
        'X-RateLimit-Window': RATE_LIMIT_WINDOW_SECONDS.toString(),
        'X-Redis-Status': redisStatus,
        'X-Cache-Primed': cachePrimed ? 'true' : 'false',
      }
    );
  }

  const duration = performance.now() - start;

  context.log('posts.create.metrics', {
    postId,
    durationMs: Number(duration.toFixed(2)),
    redisStatus,
    cachePrimed,
    remainingBudget,
  });

  return buildResponse(
    201,
    {
      status: 'success',
      post,
    },
    {
      'X-Request-Duration': duration.toFixed(2),
      'X-RateLimit-Limit': rateLimit.toString(),
      'X-RateLimit-Remaining': Math.max(remainingBudget, 0).toString(),
      'X-RateLimit-Window': RATE_LIMIT_WINDOW_SECONDS.toString(),
      'X-Redis-Status': redisStatus,
      'X-Cache-Primed': cachePrimed ? 'true' : 'false',
      'X-RU-Estimate': '1',
    }
  );
}

function buildResponse(
  status: number,
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): HttpResponseInit {
  return {
    status,
    jsonBody: body,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
}
