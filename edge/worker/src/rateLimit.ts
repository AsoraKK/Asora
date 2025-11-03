const DEFAULT_HASH_SALT = 'edge-dev-salt';

export interface EdgeRateLimitEnv {
  RATE_LIMIT_KV?: KVNamespace;
  EMAIL_HASH_SALT?: string;
}

export interface EdgeRateLimitOptions {
  limit: number;
  windowSeconds: number;
  scope?: 'ip' | 'route';
}

export interface EdgeRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetUnixSeconds: number;
  retryAfterSeconds: number;
  scope: 'ip' | 'route';
  response?: Response;
}

function getHashSalt(env: EdgeRateLimitEnv): string {
  return env.EMAIL_HASH_SALT || DEFAULT_HASH_SALT;
}

function getClientIp(request: Request): string | null {
  const direct = request.headers.get('cf-connecting-ip');
  if (direct) {
    return direct;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }

  return null;
}

async function hashIdentifier(identifier: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${identifier}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function buildKvKey(bucket: number, hashedIp: string): string {
  return `edge:rl:${bucket}:${hashedIp}`;
}

function buildTraceId(request: Request): string {
  return request.headers.get('cf-ray') ?? request.headers.get('x-request-id') ?? crypto.randomUUID();
}

function build429Response(
  request: Request,
  options: EdgeRateLimitOptions,
  result: EdgeRateLimitResult
): Response {
  const body = {
    error: 'rate_limited',
    scope: result.scope,
    limit: options.limit,
    window_seconds: options.windowSeconds,
    retry_after_seconds: result.retryAfterSeconds,
    trace_id: buildTraceId(request),
  };

  return new Response(JSON.stringify(body), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': Math.max(result.retryAfterSeconds, 0).toString(),
      'X-RateLimit-Limit': options.limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': Math.max(result.resetUnixSeconds, 0).toString(),
    },
  });
}

export async function enforceEdgeRateLimit(
  request: Request,
  env: EdgeRateLimitEnv,
  options: EdgeRateLimitOptions
): Promise<EdgeRateLimitResult> {
  const scope = options.scope ?? 'ip';
  const kv = env.RATE_LIMIT_KV;
  const ip = getClientIp(request);
  const nowMs = Date.now();
  const nowSeconds = Math.floor(nowMs / 1000);

  if (!kv || !ip) {
    return {
      allowed: true,
      limit: options.limit,
      remaining: options.limit,
      resetUnixSeconds: nowSeconds + options.windowSeconds,
      retryAfterSeconds: 0,
      scope,
    };
  }

  const windowSeconds = Math.max(options.windowSeconds, 1);
  const bucket = Math.floor(nowSeconds / windowSeconds);
  const bucketStart = bucket * windowSeconds;
  const resetUnixSeconds = bucketStart + windowSeconds;
  const hashedIp = await hashIdentifier(ip, getHashSalt(env));
  const kvKey = buildKvKey(bucket, hashedIp);

  const currentValue = await kv.get(kvKey);
  const currentCount = currentValue ? Number(currentValue) : 0;

  if (Number.isNaN(currentCount)) {
    await kv.put(kvKey, '1', { expiration: resetUnixSeconds + windowSeconds });
    return {
      allowed: true,
      limit: options.limit,
      remaining: Math.max(options.limit - 1, 0),
      resetUnixSeconds,
      retryAfterSeconds: 0,
      scope,
    };
  }

  if (currentCount >= options.limit) {
    const retryAfterSeconds = Math.max(resetUnixSeconds - nowSeconds, 0);
    const blockedResult: EdgeRateLimitResult = {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      resetUnixSeconds,
      retryAfterSeconds,
      scope,
    };
    blockedResult.response = build429Response(request, options, blockedResult);
    return blockedResult;
  }

  const nextCount = currentCount + 1;
  const remaining = Math.max(options.limit - nextCount, 0);
  await kv.put(kvKey, nextCount.toString(), { expiration: resetUnixSeconds + windowSeconds });

  return {
    allowed: true,
    limit: options.limit,
    remaining,
    resetUnixSeconds,
    retryAfterSeconds: 0,
    scope,
  };
}

export function applyEdgeRateLimitHeaders(response: Response, result: EdgeRateLimitResult): void {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', Math.max(result.remaining, 0).toString());
  response.headers.set('X-RateLimit-Reset', Math.max(result.resetUnixSeconds, 0).toString());
}
