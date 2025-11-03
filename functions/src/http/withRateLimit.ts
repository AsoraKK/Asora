import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import {
  applySlidingWindowLimit,
  applyTokenBucketLimit,
  AuthFailureState,
  getAuthFailureState,
  incrementAuthFailure,
  resetAuthFailures,
  SlidingWindowLimitResult,
  TokenBucketLimitOptions,
  TokenBucketEvaluation,
} from '@rate-limit/store';
import {
  buildAuthFailureIpKey,
  buildAuthFailureUserKey,
  buildIpKeyFromHash,
  buildRouteKey,
  buildUserKey,
  getHashedIpFromRequest,
} from '@rate-limit/keys';
import {
  trackAuthBackoffApplied,
  trackAuthBackoffSeconds,
  trackRateLimitAllowed,
  trackRateLimitBlocked,
  type RateLimitMetricDimensions,
} from '@rate-limit/telemetry';

type MaybePromise<T> = T | Promise<T>;

export type RateLimitScope = 'route' | 'user' | 'ip' | 'auth_backoff';

export interface RateLimitRequestContext {
  req: HttpRequest;
  context: InvocationContext;
  routeId: string;
  policyName: string;
  hashedIp: string | null;
  userId: string | null;
  nowMs: number;
}

export type RateLimitKeyResolver = (ctx: RateLimitRequestContext) => MaybePromise<string | null>;

export interface SlidingWindowRuleConfig {
  limit: number;
  windowSeconds: number;
  amount?: number;
  bucketSizeSeconds?: number;
}

export interface TokenBucketRuleConfig {
  capacity: number;
  refillRatePerSecond: number;
  cost?: number;
  windowSeconds?: number;
  limitOverride?: number;
}

export interface RateLimitRule {
  id: string;
  scope: Exclude<RateLimitScope, 'auth_backoff'>;
  keyResolver: RateLimitKeyResolver;
  slidingWindow?: SlidingWindowRuleConfig;
  tokenBucket?: TokenBucketRuleConfig;
}

export interface AuthBackoffPolicy {
  limit: number;
  windowSeconds: number;
  failureStatusCodes?: number[];
  ipKeyResolver: RateLimitKeyResolver;
  userKeyResolver?: RateLimitKeyResolver;
  resetOnSuccess?: boolean;
}

export interface RateLimitPolicy {
  name: string;
  routeId: string;
  limits: RateLimitRule[];
  deriveUserId?: (ctx: RateLimitRequestContext) => MaybePromise<string | null>;
  authBackoff?: AuthBackoffPolicy;
}

export type RateLimitPolicyResolver = (
  req: HttpRequest,
  context: InvocationContext
) => MaybePromise<RateLimitPolicy | null>;

interface RateLimitHeaderInfo {
  limit: number;
  remaining: number;
  windowSeconds: number;
  resetUnixSeconds: number;
  scope: Exclude<RateLimitScope, 'auth_backoff'>;
  keyKind: 'route' | 'user' | 'ip';
}

interface RateLimitBlockContext {
  scope: RateLimitScope;
  limit: number;
  windowSeconds: number;
  retryAfterSeconds: number;
  resetUnixSeconds: number;
  keyKind: 'route' | 'user' | 'ip';
}

const RATE_LIMITS_ENABLED = (process.env.RATE_LIMITS_ENABLED ?? 'true').toLowerCase() !== 'false';

function resolvePolicy(
  policyOrResolver: RateLimitPolicy | RateLimitPolicyResolver,
  req: HttpRequest,
  context: InvocationContext
): MaybePromise<RateLimitPolicy | null> {
  if (typeof policyOrResolver === 'function') {
    return policyOrResolver(req, context);
  }

  return policyOrResolver;
}

function extractTraceId(context: InvocationContext): string | undefined {
  const traceParent = context.traceContext?.traceParent ?? (context.traceContext as any)?.traceparent;
  if (!traceParent) {
    return undefined;
  }

  const segments = traceParent.split('-');
  if (segments.length >= 3) {
    return segments[1];
  }

  return undefined;
}

function ensureHeaders(response: HttpResponseInit): Record<string, string> {
  if (!response.headers) {
    response.headers = {};
  }

  if (response.headers instanceof Headers) {
    const record: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      record[key] = value;
    });
    response.headers = record;
  } else if (Array.isArray(response.headers)) {
    const record: Record<string, string> = {};
    for (const [key, value] of response.headers) {
      record[key] = value;
    }
    response.headers = record;
  }

  return response.headers as Record<string, string>;
}

function applyHeaderInfo(response: HttpResponseInit, header: RateLimitHeaderInfo): void {
  const headers = ensureHeaders(response);
  headers['X-RateLimit-Limit'] = Math.max(0, Math.floor(header.limit)).toString();
  headers['X-RateLimit-Remaining'] = Math.max(0, Math.floor(header.remaining)).toString();
  headers['X-RateLimit-Reset'] = Math.max(header.resetUnixSeconds, 0).toString();
}

function build429Response(
  block: RateLimitBlockContext,
  traceId: string | undefined
): HttpResponseInit {
  const body = {
    error: 'rate_limited',
    scope: block.scope,
    limit: block.limit,
    window_seconds: block.windowSeconds,
    retry_after_seconds: block.retryAfterSeconds,
    trace_id: traceId ?? null,
    ...(block.scope === 'auth_backoff' ? { reason: 'auth_backoff' } : {}),
  };

  return {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': Math.max(block.retryAfterSeconds, 0).toString(),
      'X-RateLimit-Limit': Math.max(0, Math.floor(block.limit)).toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': Math.max(block.resetUnixSeconds, 0).toString(),
    },
    body: JSON.stringify(body),
  };
}

function selectHeaderCandidate(headers: RateLimitHeaderInfo[]): RateLimitHeaderInfo | null {
  if (headers.length === 0) {
    return null;
  }

  return headers.reduce<RateLimitHeaderInfo | null>((selected, current) => {
    if (!selected) {
      return current;
    }

    if (current.remaining < selected.remaining) {
      return current;
    }

    if (current.remaining === selected.remaining && current.limit < selected.limit) {
      return current;
    }

    return selected;
  }, null);
}

async function evaluateAuthBackoff(
  policy: AuthBackoffPolicy,
  ctx: RateLimitRequestContext,
  hashedIp: string | null
): Promise<{ state: AuthFailureState; scope: 'ip' | 'user'; key: string } | null> {
  const checks: Array<{ key: string; scope: 'ip' | 'user'; state: AuthFailureState } | null> = [];

  if (hashedIp) {
    const ipKey = await policy.ipKeyResolver(ctx);
    if (ipKey) {
      const state = await getAuthFailureState(ipKey, ctx.nowMs);
      checks.push({ key: ipKey, scope: 'ip', state });
    }
  }

  if (policy.userKeyResolver && ctx.userId) {
    const userKey = await policy.userKeyResolver(ctx);
    if (userKey) {
      const state = await getAuthFailureState(userKey, ctx.nowMs);
      checks.push({ key: userKey, scope: 'user', state });
    }
  }

  const activeLock = checks
    .filter((entry): entry is { key: string; scope: 'ip' | 'user'; state: AuthFailureState } => Boolean(entry))
    .filter((entry) => entry.state.remainingLockoutSeconds > 0)
    .sort((a, b) => b.state.remainingLockoutSeconds - a.state.remainingLockoutSeconds)[0];

  return activeLock ?? null;
}

function recordBlockedMetric(
  policy: RateLimitPolicy,
  block: RateLimitBlockContext,
  hashedIp: string | null,
  userId: string | null
): void {
  const dimensions: RateLimitMetricDimensions = {
    route: policy.routeId,
    scope: block.scope,
    keyKind: block.keyKind,
    policy: policy.name,
  };

  trackRateLimitBlocked(dimensions);

  if (block.scope === 'auth_backoff') {
    trackAuthBackoffApplied({
      route: policy.routeId,
      ipHash: hashedIp,
      userIdPresent: Boolean(userId),
    });
    trackAuthBackoffSeconds(block.retryAfterSeconds, policy.routeId, policy.name, block.scope);
  }
}

function recordAllowedMetric(policy: RateLimitPolicy, header: RateLimitHeaderInfo): void {
  const dimensions: RateLimitMetricDimensions = {
    route: policy.routeId,
    scope: header.scope,
    keyKind: header.keyKind,
    policy: policy.name,
  };

  trackRateLimitAllowed(dimensions);
}

function resolveTokenBucketWindow(config: TokenBucketRuleConfig): number {
  if (config.windowSeconds) {
    return config.windowSeconds;
  }

  if (config.refillRatePerSecond > 0) {
    return Math.ceil(config.capacity / config.refillRatePerSecond);
  }

  return 60;
}

function buildHeaderFromSliding(
  rule: RateLimitRule,
  result: SlidingWindowLimitResult
): RateLimitHeaderInfo {
  return {
    limit: result.limit,
    remaining: result.remaining,
    windowSeconds: result.windowSeconds,
    resetUnixSeconds: Math.ceil(result.resetAt / 1000),
    scope: rule.scope,
    keyKind: rule.scope,
  };
}

function buildHeaderFromToken(
  rule: RateLimitRule,
  result: TokenBucketEvaluation,
  config: TokenBucketRuleConfig
): RateLimitHeaderInfo {
  const windowSeconds = resolveTokenBucketWindow(config);
  const limit = config.limitOverride ?? config.capacity;

  return {
    limit,
    remaining: Math.max(result.remainingTokens, 0),
    windowSeconds,
    resetUnixSeconds: Math.ceil(result.resetAt / 1000),
    scope: rule.scope,
    keyKind: rule.scope,
  };
}

function shouldIncrementAuthFailure(policy: AuthBackoffPolicy, response: HttpResponseInit): boolean {
  const status = response.status ?? 200;
  const failures = policy.failureStatusCodes ?? [400, 401, 403];
  return failures.includes(status);
}

function shouldResetAuthFailure(policy: AuthBackoffPolicy, response: HttpResponseInit): boolean {
  if (policy.resetOnSuccess === false) {
    return false;
  }
  const status = response.status ?? 200;
  return status >= 200 && status < 300;
}

async function handleAuthBackoffPostResponse(
  policy: AuthBackoffPolicy,
  ctx: RateLimitRequestContext,
  hashedIp: string | null,
  response: HttpResponseInit
): Promise<void> {
  const operations: Promise<unknown>[] = [];

  if (shouldIncrementAuthFailure(policy, response)) {
    if (hashedIp) {
      const ipKey = await policy.ipKeyResolver(ctx);
      if (ipKey) {
        operations.push(incrementAuthFailure(ipKey, ctx.nowMs));
      }
    }

    if (policy.userKeyResolver && ctx.userId) {
      const userKey = await policy.userKeyResolver(ctx);
      if (userKey) {
        operations.push(incrementAuthFailure(userKey, ctx.nowMs));
      }
    }
  } else if (shouldResetAuthFailure(policy, response)) {
    if (hashedIp) {
      const ipKey = await policy.ipKeyResolver(ctx);
      if (ipKey) {
        operations.push(resetAuthFailures(ipKey));
      }
    }

    if (policy.userKeyResolver && ctx.userId) {
      const userKey = await policy.userKeyResolver(ctx);
      if (userKey) {
        operations.push(resetAuthFailures(userKey));
      }
    }
  }

  if (operations.length > 0) {
    await Promise.allSettled(operations);
  }
}

async function resolveKey(rule: RateLimitRule, ctx: RateLimitRequestContext): Promise<string | null> {
  const key = await rule.keyResolver(ctx);
  return key;
}

async function evaluateSlidingRule(
  rule: RateLimitRule,
  key: string,
  nowMs: number
): Promise<SlidingWindowLimitResult> {
  if (!rule.slidingWindow) {
    throw new Error('Sliding window configuration missing');
  }

  return applySlidingWindowLimit({
    key,
    windowSeconds: rule.slidingWindow.windowSeconds,
    limit: rule.slidingWindow.limit,
    amount: rule.slidingWindow.amount ?? 1,
    bucketSizeSeconds: rule.slidingWindow.bucketSizeSeconds,
    nowMs,
  });
}

async function evaluateTokenRule(
  rule: RateLimitRule,
  key: string,
  nowMs: number
): Promise<TokenBucketEvaluation> {
  if (!rule.tokenBucket) {
    throw new Error('Token bucket configuration missing');
  }

  const options: TokenBucketLimitOptions = {
    key,
    capacity: rule.tokenBucket.capacity,
    refillRatePerSecond: rule.tokenBucket.refillRatePerSecond,
    cost: rule.tokenBucket.cost ?? 1,
    nowMs,
  };

  return applyTokenBucketLimit(options);
}

export function withRateLimit(
  handler: (req: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>,
  policyOrResolver: RateLimitPolicy | RateLimitPolicyResolver
) {
  return async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (!RATE_LIMITS_ENABLED) {
      return handler(req, context);
    }

    const method = (req.method ?? 'GET').toUpperCase();
    if (method === 'OPTIONS') {
      return handler(req, context);
    }

    const policy = await resolvePolicy(policyOrResolver, req, context);
    if (!policy || policy.limits.length === 0) {
      return handler(req, context);
    }

    const nowMs = Date.now();
    const hashedIp = getHashedIpFromRequest(req);
    const requestContext: RateLimitRequestContext = {
      req,
      context,
      routeId: policy.routeId,
      policyName: policy.name,
      hashedIp,
      userId: null,
      nowMs,
    };

    if (policy.deriveUserId) {
      const derived = await policy.deriveUserId({ ...requestContext });
      requestContext.userId = derived;
    }

    const traceId = extractTraceId(context);

    if (policy.authBackoff) {
      const activeLock = await evaluateAuthBackoff(policy.authBackoff, requestContext, hashedIp);
      if (activeLock) {
        const block: RateLimitBlockContext = {
          scope: 'auth_backoff',
          limit: policy.authBackoff.limit,
          windowSeconds: policy.authBackoff.windowSeconds,
          retryAfterSeconds: activeLock.state.remainingLockoutSeconds,
          resetUnixSeconds: activeLock.state.lockedUntilMs
            ? Math.ceil(activeLock.state.lockedUntilMs / 1000)
            : Math.ceil(nowMs / 1000),
          keyKind: activeLock.scope,
        };

        recordBlockedMetric(policy, block, hashedIp, requestContext.userId);
        return build429Response(block, traceId);
      }
    }

    const headers: RateLimitHeaderInfo[] = [];
    let blockContext: RateLimitBlockContext | null = null;

    for (const rule of policy.limits) {
      const key = await resolveKey(rule, requestContext);
      if (!key) {
        continue;
      }

      if (rule.slidingWindow) {
        const slidingResult = await evaluateSlidingRule(rule, key, nowMs);
        headers.push(buildHeaderFromSliding(rule, slidingResult));

        if (slidingResult.blocked) {
          blockContext = {
            scope: rule.scope,
            limit: slidingResult.limit,
            windowSeconds: slidingResult.windowSeconds,
            retryAfterSeconds: slidingResult.retryAfterSeconds,
            resetUnixSeconds: Math.ceil(slidingResult.resetAt / 1000),
            keyKind: rule.scope,
          };
          break;
        }
      }

      if (blockContext) {
        break;
      }

      if (rule.tokenBucket) {
        const tokenResult = await evaluateTokenRule(rule, key, nowMs);
        headers.push(buildHeaderFromToken(rule, tokenResult, rule.tokenBucket));

        if (!tokenResult.allowed) {
          blockContext = {
            scope: rule.scope,
            limit: rule.tokenBucket.limitOverride ?? rule.tokenBucket.capacity,
            windowSeconds: resolveTokenBucketWindow(rule.tokenBucket),
            retryAfterSeconds: tokenResult.retryAfterSeconds,
            resetUnixSeconds: Math.ceil(tokenResult.resetAt / 1000),
            keyKind: rule.scope,
          };
          break;
        }
      }
    }

    if (blockContext) {
      recordBlockedMetric(policy, blockContext, hashedIp, requestContext.userId);
      return build429Response(blockContext, traceId);
    }

    const response = await handler(req, context);

    const selectedHeader = selectHeaderCandidate(headers);
    if (selectedHeader) {
      applyHeaderInfo(response, selectedHeader);
      recordAllowedMetric(policy, selectedHeader);
    }

    if (policy.authBackoff) {
      await handleAuthBackoffPostResponse(policy.authBackoff, requestContext, hashedIp, response);
    }

    return response;
  };
}

export function buildGlobalIpKey(ctx: RateLimitRequestContext): string | null {
  if (!ctx.hashedIp) {
    return null;
  }
  return buildIpKeyFromHash(ctx.hashedIp);
}

export function buildUserScopeKey(ctx: RateLimitRequestContext): string | null {
  if (!ctx.userId) {
    return null;
  }
  return buildUserKey(ctx.userId);
}

export function buildRouteScopeKey(route: string): RateLimitKeyResolver {
  return () => buildRouteKey(route);
}

export function buildAuthFailureIpKeyResolver(): RateLimitKeyResolver {
  return (ctx) => {
    if (!ctx.hashedIp) {
      return null;
    }
    return buildAuthFailureIpKey(ctx.hashedIp);
  };
}

export function buildAuthFailureUserKeyResolver(): RateLimitKeyResolver {
  return (ctx) => {
    if (!ctx.userId) {
      return null;
    }
    return buildAuthFailureUserKey(ctx.userId);
  };
}
