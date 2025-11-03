export interface SlidingWindowConfig {
  limit: number;
  windowSeconds: number;
}

export interface SlidingWindowBucket {
  bucketStartMs: number;
  bucketSizeSeconds: number;
  count: number;
}

export interface SlidingWindowEvaluation {
  total: number;
  limit: number;
  windowSeconds: number;
  remaining: number;
  blocked: boolean;
  retryAfterSeconds: number;
  resetAt: number;
}

export interface TokenBucketConfig {
  capacity: number;
  refillRatePerSecond: number;
}

export interface TokenBucketState {
  tokens: number;
  updatedAt: string;
}

export interface TokenBucketEvaluation {
  allowed: boolean;
  remainingTokens: number;
  retryAfterSeconds: number;
  resetAt: number;
  state: TokenBucketState;
}

const MS_IN_SECOND = 1000;

export function evaluateSlidingWindow(
  buckets: SlidingWindowBucket[],
  config: SlidingWindowConfig,
  nowMs: number = Date.now()
): SlidingWindowEvaluation {
  const windowMs = config.windowSeconds * MS_IN_SECOND;
  const windowStartBoundary = nowMs - windowMs;

  const relevantBuckets = buckets
    .filter((bucket) => bucket.bucketStartMs + bucket.bucketSizeSeconds * MS_IN_SECOND > windowStartBoundary)
    .sort((a, b) => a.bucketStartMs - b.bucketStartMs);

  let total = 0;
  let retryAfterMs = 0;
  let lastExpiryMs = nowMs;

  for (const bucket of relevantBuckets) {
    total += bucket.count;
    const bucketExpiry = bucket.bucketStartMs + windowMs;
    lastExpiryMs = Math.max(lastExpiryMs, bucketExpiry);

    if (retryAfterMs === 0 && total > config.limit) {
      retryAfterMs = Math.max(bucketExpiry - nowMs, 0);
    }
  }

  const blocked = total > config.limit;
  const remaining = blocked ? 0 : Math.max(config.limit - total, 0);
  const retryAfterSeconds = blocked ? Math.ceil(retryAfterMs / MS_IN_SECOND) : 0;
  const resetAt = blocked ? nowMs + retryAfterSeconds * MS_IN_SECOND : lastExpiryMs;

  return {
    total,
    limit: config.limit,
    windowSeconds: config.windowSeconds,
    remaining,
    blocked,
    retryAfterSeconds,
    resetAt,
  };
}

export function applyTokenBucket(
  state: TokenBucketState | undefined,
  config: TokenBucketConfig,
  cost = 1,
  nowMs: number = Date.now()
): TokenBucketEvaluation {
  const since = state ? Date.parse(state.updatedAt) : 0;
  const elapsedSeconds = since > 0 ? Math.max((nowMs - since) / MS_IN_SECOND, 0) : Number.POSITIVE_INFINITY;

  let tokens = state ? state.tokens : config.capacity;

  if (!Number.isFinite(tokens) || tokens < 0) {
    tokens = config.capacity;
  }

  if (elapsedSeconds === Number.POSITIVE_INFINITY) {
    tokens = config.capacity;
  } else if (elapsedSeconds > 0) {
    tokens = Math.min(config.capacity, tokens + elapsedSeconds * config.refillRatePerSecond);
  }

  const allowed = tokens >= cost;
  const newTokenBalance = allowed ? tokens - cost : tokens;
  const safeTokens = Math.max(newTokenBalance, 0);
  const deficit = allowed ? 0 : cost - tokens;
  let secondsUntilNextToken = 0;
  if (deficit > 0) {
    if (config.refillRatePerSecond > 0) {
      secondsUntilNextToken = Math.ceil(deficit / config.refillRatePerSecond);
    } else {
      secondsUntilNextToken = Number.MAX_SAFE_INTEGER;
    }
  }
  const retryAfterSeconds = Math.max(secondsUntilNextToken, 0);
  const resetAt = retryAfterSeconds > 0 ? nowMs + retryAfterSeconds * MS_IN_SECOND : nowMs;

  const nextState: TokenBucketState = {
    tokens: safeTokens,
    updatedAt: new Date(nowMs).toISOString(),
  };

  return {
    allowed,
    remainingTokens: safeTokens,
    retryAfterSeconds,
    resetAt,
    state: nextState,
  };
}
