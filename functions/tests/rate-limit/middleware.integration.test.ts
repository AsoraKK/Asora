import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { withRateLimit, type RateLimitPolicy } from '@http/withRateLimit';
import {
  applySlidingWindowLimit,
  applyTokenBucketLimit,
  getAuthFailureState,
  incrementAuthFailure,
  resetAuthFailures,
  type SlidingWindowLimitResult,
} from '@rate-limit/store';

// Mock rate-limit store
jest.mock('@rate-limit/store', () => ({
  applySlidingWindowLimit: jest.fn(),
  applyTokenBucketLimit: jest.fn(),
  getAuthFailureState: jest.fn(),
  incrementAuthFailure: jest.fn(),
  resetAuthFailures: jest.fn(),
}));

// Mock Application Insights
jest.mock('applicationinsights', () => {
  const client = { trackMetric: jest.fn(), trackEvent: jest.fn() };
  const chainable = {
    setAutoCollectConsole: jest.fn().mockReturnThis(),
    setAutoCollectDependencies: jest.fn().mockReturnThis(),
    setAutoCollectPerformance: jest.fn().mockReturnThis(),
    setAutoCollectRequests: jest.fn().mockReturnThis(),
    setAutoCollectExceptions: jest.fn().mockReturnThis(),
    setSendLiveMetrics: jest.fn().mockReturnThis(),
    start: jest.fn().mockReturnThis(),
  };
  return {
    __esModule: true,
    default: { defaultClient: client, setup: jest.fn().mockReturnValue(chainable) },
  };
});

const applySlidingWindowLimitMock = applySlidingWindowLimit as jest.MockedFunction<
  typeof applySlidingWindowLimit
>;
const applyTokenBucketLimitMock = applyTokenBucketLimit as jest.MockedFunction<
  typeof applyTokenBucketLimit
>;
const getAuthFailureStateMock = getAuthFailureState as jest.MockedFunction<typeof getAuthFailureState>;
const incrementAuthFailureMock = incrementAuthFailure as jest.MockedFunction<typeof incrementAuthFailure>;
const resetAuthFailuresMock = resetAuthFailures as jest.MockedFunction<typeof resetAuthFailures>;

const FIXED_NOW = 1_700_000_000_000;

type Handler = (req: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>;

function createHandler(response: HttpResponseInit): jest.MockedFunction<Handler> {
  return jest.fn(async (_req: HttpRequest, _context: InvocationContext) => response) as jest.MockedFunction<Handler>;
}

function createRequest(
  method = 'GET',
  ip = '203.0.113.10',
  headers: Record<string, string> = {}
): HttpRequest {
  const headerBag = new Headers({ 'cf-connecting-ip': ip, ...headers });
  return {
    method,
    headers: headerBag,
    url: 'https://api.asora.dev/api/test',
  } as unknown as HttpRequest;
}

function createContext(traceId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'): InvocationContext {
  return {
    invocationId: 'invocation-1',
    traceContext: {
      traceParent: `00-${traceId}-bbbbbbbbbbbbbbbb-01`,
    },
  } as InvocationContext;
}

function allowedResult(remaining = 10, limit = 20): SlidingWindowLimitResult {
  return {
    total: limit - remaining,
    limit,
    windowSeconds: 60,
    remaining,
    blocked: false,
    retryAfterSeconds: 0,
    resetAt: FIXED_NOW + 60_000,
    buckets: [],
  };
}

function blockedResult(limit = 20, retryAfter = 30): SlidingWindowLimitResult {
  return {
    total: limit + 1,
    limit,
    windowSeconds: 60,
    remaining: 0,
    blocked: true,
    retryAfterSeconds: retryAfter,
    resetAt: FIXED_NOW + retryAfter * 1000,
    buckets: [],
  };
}

beforeAll(() => {
  process.env.EMAIL_HASH_SALT = 'unit-test-salt';
  process.env.RATE_LIMITS_ENABLED = 'true';
});

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  jest.clearAllMocks();

  // Default: no auth backoff lockout
  getAuthFailureStateMock.mockResolvedValue({
    count: 0,
    lastFailureAt: null,
    lockoutSeconds: 0,
    remainingLockoutSeconds: 0,
    lockedUntilMs: null,
  });
});

afterEach(() => {
  (Date.now as jest.Mock | undefined)?.mockRestore?.();
});

describe('Rate limiting per IP', () => {
  const ipPolicy: RateLimitPolicy = {
    name: 'ip-test',
    routeId: 'test/ip',
    limits: [
      {
        id: 'ip-limit',
        scope: 'ip',
        keyResolver: (ctx) => (ctx.hashedIp ? `ip:${ctx.hashedIp}` : null),
        slidingWindow: { limit: 10, windowSeconds: 60 },
      },
    ],
  };

  it('allows requests below IP limit', async () => {
    applySlidingWindowLimitMock.mockResolvedValueOnce(allowedResult(9, 10));

    const handler = createHandler({ status: 200, body: 'ok' });
    const wrapped = withRateLimit(handler, ipPolicy);
    const response = await wrapped(createRequest(), createContext());

    expect(handler).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect((response.headers as Record<string, string>)?.['X-RateLimit-Remaining']).toBe('9');
  });

  it('blocks requests when IP limit exceeded', async () => {
    applySlidingWindowLimitMock.mockResolvedValueOnce(blockedResult(10, 45));

    const handler = createHandler({ status: 200, body: 'ok' });
    const wrapped = withRateLimit(handler, ipPolicy);
    const response = await wrapped(createRequest(), createContext());

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(429);

    const body = JSON.parse(response.body as string);
    expect(body.scope).toBe('ip');
    expect(body.retry_after_seconds).toBe(45);
  });

  it('tracks different IPs separately', async () => {
    applySlidingWindowLimitMock.mockResolvedValue(allowedResult(5, 10));

    const handler = createHandler({ status: 200, body: 'ok' });
    const wrapped = withRateLimit(handler, ipPolicy);

    // Two requests from different IPs
    await wrapped(createRequest('GET', '192.168.1.1'), createContext());
    await wrapped(createRequest('GET', '192.168.1.2'), createContext());

    // Should have called with different keys
    const calls = applySlidingWindowLimitMock.mock.calls;
    expect(calls.length).toBe(2);
    expect(calls[0]![0].key).not.toBe(calls[1]![0].key);
  });
});

describe('Rate limiting per principal/user', () => {
  const userPolicy: RateLimitPolicy = {
    name: 'user-test',
    routeId: 'test/user',
    limits: [
      {
        id: 'user-limit',
        scope: 'user',
        keyResolver: (ctx) => (ctx.userId ? `user:${ctx.userId}` : null),
        slidingWindow: { limit: 100, windowSeconds: 60 },
      },
    ],
    deriveUserId: () => 'user-123',
  };

  it('allows requests below user limit', async () => {
    applySlidingWindowLimitMock.mockResolvedValueOnce(allowedResult(95, 100));

    const handler = createHandler({ status: 200, body: 'ok' });
    const wrapped = withRateLimit(handler, userPolicy);
    const response = await wrapped(createRequest(), createContext());

    expect(handler).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect((response.headers as Record<string, string>)?.['X-RateLimit-Limit']).toBe('100');
  });

  it('blocks requests when user limit exceeded', async () => {
    applySlidingWindowLimitMock.mockResolvedValueOnce(blockedResult(100, 20));

    const handler = createHandler({ status: 200, body: 'ok' });
    const wrapped = withRateLimit(handler, userPolicy);
    const response = await wrapped(createRequest(), createContext());

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(429);

    const body = JSON.parse(response.body as string);
    expect(body.scope).toBe('user');
  });

  it('skips user limit when userId cannot be derived', async () => {
    const noUserPolicy: RateLimitPolicy = {
      ...userPolicy,
      deriveUserId: () => null, // Cannot derive user
    };

    const handler = createHandler({ status: 200, body: 'ok' });
    const wrapped = withRateLimit(handler, noUserPolicy);
    const response = await wrapped(createRequest(), createContext());

    // Should pass through since no key could be resolved
    expect(handler).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(applySlidingWindowLimitMock).not.toHaveBeenCalled();
  });
});

describe('Combined IP + user limits', () => {
  const combinedPolicy: RateLimitPolicy = {
    name: 'combined-test',
    routeId: 'test/combined',
    limits: [
      {
        id: 'global-ip',
        scope: 'ip',
        keyResolver: (ctx) => (ctx.hashedIp ? `ip:${ctx.hashedIp}` : null),
        slidingWindow: { limit: 60, windowSeconds: 60 },
      },
      {
        id: 'user-limit',
        scope: 'user',
        keyResolver: (ctx) => (ctx.userId ? `user:${ctx.userId}` : null),
        slidingWindow: { limit: 120, windowSeconds: 60 },
      },
    ],
    deriveUserId: () => 'user-456',
  };

  it('applies both limits and reports tightest constraint', async () => {
    // IP has 10 remaining, user has 50 remaining
    applySlidingWindowLimitMock
      .mockResolvedValueOnce(allowedResult(10, 60)) // IP limit
      .mockResolvedValueOnce(allowedResult(50, 120)); // User limit

    const handler = createHandler({ status: 200, body: 'ok' });
    const wrapped = withRateLimit(handler, combinedPolicy);
    const response = await wrapped(createRequest(), createContext());

    expect(handler).toHaveBeenCalled();
    expect(response.status).toBe(200);
    // Should report the tighter constraint (IP with 10 remaining)
    expect((response.headers as Record<string, string>)?.['X-RateLimit-Remaining']).toBe('10');
    expect((response.headers as Record<string, string>)?.['X-RateLimit-Limit']).toBe('60');
  });

  it('blocks on first exceeded limit (IP)', async () => {
    applySlidingWindowLimitMock
      .mockResolvedValueOnce(blockedResult(60, 30)) // IP limit exceeded
      .mockResolvedValueOnce(allowedResult(50, 120)); // User limit fine

    const handler = createHandler({ status: 200, body: 'ok' });
    const wrapped = withRateLimit(handler, combinedPolicy);
    const response = await wrapped(createRequest(), createContext());

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(429);

    const body = JSON.parse(response.body as string);
    expect(body.scope).toBe('ip');
  });
});

describe('Auth backoff behavior', () => {
  const authPolicy: RateLimitPolicy = {
    name: 'auth-test',
    routeId: 'auth/login',
    limits: [
      {
        id: 'route-ip',
        scope: 'route',
        keyResolver: () => 'route:auth:ip',
        slidingWindow: { limit: 20, windowSeconds: 60 },
      },
    ],
    deriveUserId: () => 'user-789',
    authBackoff: {
      limit: 5,
      windowSeconds: 1800, // 30 minutes
      failureStatusCodes: [401, 403],
      ipKeyResolver: (ctx) => `authfail:ip:${ctx.hashedIp}`,
      userKeyResolver: (ctx) => `authfail:user:${ctx.userId}`,
      resetOnSuccess: true,
    },
  };

  it('blocks when auth backoff is active', async () => {
    getAuthFailureStateMock.mockResolvedValue({
      count: 6,
      lastFailureAt: new Date(FIXED_NOW - 60_000).toISOString(),
      lockoutSeconds: 120,
      remainingLockoutSeconds: 90,
      lockedUntilMs: FIXED_NOW + 90_000,
    });

    const handler = createHandler({ status: 401, body: 'denied' });
    const wrapped = withRateLimit(handler, authPolicy);
    const response = await wrapped(createRequest('POST'), createContext());

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(429);

    const body = JSON.parse(response.body as string);
    expect(body.scope).toBe('auth_backoff');
    expect(body.reason).toBe('auth_backoff');
    expect(body.retry_after_seconds).toBe(90);
  });

  it('increments failure count on 401 response', async () => {
    applySlidingWindowLimitMock.mockResolvedValue(allowedResult(15, 20));
    incrementAuthFailureMock.mockResolvedValue({ count: 1, lockoutSeconds: 0, lastFailureAt: new Date().toISOString() });

    const handler = createHandler({ status: 401, body: 'unauthorized' });
    const wrapped = withRateLimit(handler, authPolicy);
    await wrapped(createRequest('POST'), createContext());

    expect(handler).toHaveBeenCalled();
    expect(incrementAuthFailureMock).toHaveBeenCalledTimes(2); // IP + user
  });

  it('resets failure count on successful auth', async () => {
    applySlidingWindowLimitMock.mockResolvedValue(allowedResult(15, 20));
    resetAuthFailuresMock.mockResolvedValue(undefined);

    const handler = createHandler({ status: 200, body: 'ok' });
    const wrapped = withRateLimit(handler, authPolicy);
    await wrapped(createRequest('POST'), createContext());

    expect(handler).toHaveBeenCalled();
    expect(resetAuthFailuresMock).toHaveBeenCalledTimes(2); // IP + user
    expect(incrementAuthFailureMock).not.toHaveBeenCalled();
  });

  it('does not reset on non-auth-failure errors', async () => {
    applySlidingWindowLimitMock.mockResolvedValue(allowedResult(15, 20));

    // 500 error is not in failureStatusCodes and not a success
    const handler = createHandler({ status: 500, body: 'server error' });
    const wrapped = withRateLimit(handler, authPolicy);
    await wrapped(createRequest('POST'), createContext());

    expect(incrementAuthFailureMock).not.toHaveBeenCalled();
    expect(resetAuthFailuresMock).not.toHaveBeenCalled();
  });
});

describe('Rate limit response format', () => {
  const policy: RateLimitPolicy = {
    name: 'format-test',
    routeId: 'test/format',
    limits: [
      {
        id: 'test-limit',
        scope: 'route',
        keyResolver: () => 'route:test',
        slidingWindow: { limit: 5, windowSeconds: 300 },
      },
    ],
  };

  it('includes all required fields in 429 response', async () => {
    applySlidingWindowLimitMock.mockResolvedValueOnce(blockedResult(5, 120));

    const handler = createHandler({ status: 200, body: 'ok' });
    const wrapped = withRateLimit(handler, policy);
    const response = await wrapped(createRequest(), createContext('trace123trace123trace123trace123'));

    expect(response.status).toBe(429);
    expect((response.headers as Record<string, string>)?.['Content-Type']).toBe('application/json');
    expect((response.headers as Record<string, string>)?.['Retry-After']).toBe('120');
    expect((response.headers as Record<string, string>)?.['X-RateLimit-Limit']).toBe('5');
    expect((response.headers as Record<string, string>)?.['X-RateLimit-Remaining']).toBe('0');

    const body = JSON.parse(response.body as string);
    expect(body).toEqual({
      error: 'rate_limited',
      scope: 'route',
      limit: 5,
      window_seconds: 60, // From sliding window config
      retry_after_seconds: 120,
      trace_id: 'trace123trace123trace123trace123',
    });
  });

  it('adds rate limit headers to successful responses', async () => {
    applySlidingWindowLimitMock.mockResolvedValueOnce(allowedResult(3, 5));

    const handler = createHandler({ status: 201, body: 'created' });
    const wrapped = withRateLimit(handler, policy);
    const response = await wrapped(createRequest('POST'), createContext());

    expect(response.status).toBe(201);
    expect((response.headers as Record<string, string>)?.['X-RateLimit-Limit']).toBe('5');
    expect((response.headers as Record<string, string>)?.['X-RateLimit-Remaining']).toBe('3');
    expect((response.headers as Record<string, string>)?.['X-RateLimit-Reset']).toBeDefined();
  });
});

describe('Edge cases', () => {
  it('skips rate limiting for OPTIONS requests', async () => {
    const policy: RateLimitPolicy = {
      name: 'options-test',
      routeId: 'test',
      limits: [
        {
          id: 'test',
          scope: 'route',
          keyResolver: () => 'route:test',
          slidingWindow: { limit: 1, windowSeconds: 60 },
        },
      ],
    };

    applySlidingWindowLimitMock.mockResolvedValueOnce(blockedResult(1, 60));

    const handler = createHandler({ status: 204, body: '' });
    const wrapped = withRateLimit(handler, policy);
    const response = await wrapped(createRequest('OPTIONS'), createContext());

    expect(handler).toHaveBeenCalled();
    expect(response.status).toBe(204);
    expect(applySlidingWindowLimitMock).not.toHaveBeenCalled();
  });

  it('handles null policy resolver gracefully', async () => {
    const handler = createHandler({ status: 200, body: 'ok' });
    const wrapped = withRateLimit(handler, () => null);
    const response = await wrapped(createRequest(), createContext());

    expect(handler).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it('handles policy with no limits gracefully', async () => {
    const emptyPolicy: RateLimitPolicy = {
      name: 'empty',
      routeId: 'empty',
      limits: [],
    };

    const handler = createHandler({ status: 200, body: 'ok' });
    const wrapped = withRateLimit(handler, emptyPolicy);
    const response = await wrapped(createRequest(), createContext());

    expect(handler).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});
