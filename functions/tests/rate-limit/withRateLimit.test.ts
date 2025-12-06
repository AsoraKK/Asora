import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { withRateLimit, type RateLimitPolicy } from '@http/withRateLimit';
import {
  applySlidingWindowLimit,
  applyTokenBucketLimit,
  getAuthFailureState,
  incrementAuthFailure,
  resetAuthFailures,
  type AuthFailureState,
  type SlidingWindowLimitResult,
  type TokenBucketEvaluation,
} from '@rate-limit/store';

jest.mock('@rate-limit/store', () => ({
  applySlidingWindowLimit: jest.fn(),
  applyTokenBucketLimit: jest.fn(),
  getAuthFailureState: jest.fn(),
  incrementAuthFailure: jest.fn(),
  resetAuthFailures: jest.fn(),
}));

jest.mock('applicationinsights', () => {
  const client = {
    trackMetric: jest.fn(),
    trackEvent: jest.fn(),
  };

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
    default: {
      defaultClient: client,
      setup: jest.fn().mockReturnValue(chainable),
    },
  };
});

const applySlidingWindowLimitMock = applySlidingWindowLimit as jest.MockedFunction<typeof applySlidingWindowLimit>;
const applyTokenBucketLimitMock = applyTokenBucketLimit as jest.MockedFunction<typeof applyTokenBucketLimit>;
const getAuthFailureStateMock = getAuthFailureState as jest.MockedFunction<typeof getAuthFailureState>;
const incrementAuthFailureMock = incrementAuthFailure as jest.MockedFunction<typeof incrementAuthFailure>;
const resetAuthFailuresMock = resetAuthFailures as jest.MockedFunction<typeof resetAuthFailures>;

const FIXED_NOW = 1_700_000_000_000;
const AUTH_FAILURE_WINDOW_SECONDS = 30 * 60;

type Handler = (req: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>;

function createHandler(response: HttpResponseInit): jest.MockedFunction<Handler> {
  const fn = jest.fn<Promise<HttpResponseInit>, [HttpRequest, InvocationContext]>(async () => response);
  return fn as jest.MockedFunction<Handler>;
}

function createRequest(method = 'GET', headers: Record<string, string> = {}, url = 'https://api.asora.dev/feed'): HttpRequest {
  const headerBag = new Headers({ 'cf-connecting-ip': '203.0.113.10', ...headers });
  return {
    method,
    headers: headerBag,
    url,
  } as unknown as HttpRequest;
}

function createContext(): InvocationContext {
  return {
    invocationId: 'invocation-1',
    traceContext: {
      traceParent: '00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01',
    },
  } as InvocationContext;
}

function createPolicy(): RateLimitPolicy {
  return {
    name: 'test-policy',
    routeId: 'test-route',
    limits: [
      {
        id: 'route-limit',
        scope: 'route',
        keyResolver: () => 'route:test:ip',
        slidingWindow: { limit: 2, windowSeconds: 60 },
      },
      {
        id: 'user-limit',
        scope: 'user',
        keyResolver: () => 'user:test',
        slidingWindow: { limit: 5, windowSeconds: 60 },
      },
    ],
  };
}

function createAuthPolicy(options?: { deriveUserId?: () => string | null }): RateLimitPolicy {
  const deriveUserId = options?.deriveUserId ?? (() => 'user-ctx');
  return {
    name: 'auth-policy',
    routeId: 'auth/login',
    limits: [
      {
        id: 'auth-ip',
        scope: 'route',
        keyResolver: () => 'route:auth:ip',
        slidingWindow: { limit: 20, windowSeconds: 60 },
      },
    ],
    deriveUserId,
    authBackoff: {
      limit: 20,
      windowSeconds: AUTH_FAILURE_WINDOW_SECONDS,
      ipKeyResolver: () => 'authfail:ip',
      userKeyResolver: () => 'authfail_user:user-ctx',
      failureStatusCodes: [400, 401, 403],
      resetOnSuccess: true,
    },
  };
}

beforeAll(() => {
  process.env.EMAIL_HASH_SALT = 'unit-test-salt';
  process.env.RATE_LIMITS_ENABLED = 'true';
});

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  jest.clearAllMocks();
});

afterEach(() => {
  (Date.now as jest.Mock | undefined)?.mockRestore?.();
});

describe('withRateLimit middleware', () => {
  it('returns 429 with contract when a limit is exceeded', async () => {
    const slidingAllowed: SlidingWindowLimitResult = {
      total: 1,
      limit: 30,
      windowSeconds: 60,
      remaining: 29,
      blocked: false,
      retryAfterSeconds: 0,
      resetAt: FIXED_NOW + 60_000,
      buckets: [],
    };

    const slidingBlocked: SlidingWindowLimitResult = {
      total: 6,
      limit: 5,
      windowSeconds: 60,
      remaining: 0,
      blocked: true,
      retryAfterSeconds: 30,
      resetAt: FIXED_NOW + 30_000,
      buckets: [],
    };

    applySlidingWindowLimitMock.mockResolvedValueOnce(slidingAllowed).mockResolvedValueOnce(slidingBlocked);

    const handler = createHandler({ status: 200, headers: {}, body: 'ok' });

    const wrapped = withRateLimit(handler, createPolicy());
    const response = await wrapped(createRequest(), createContext());

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(429);
    expect(response.headers?.['Retry-After']).toBe('30');
    expect(response.headers?.['X-RateLimit-Limit']).toBe('5');
    expect(response.headers?.['X-RateLimit-Remaining']).toBe('0');
    expect(response.headers?.['X-RateLimit-Reset']).toBe(String(Math.ceil((FIXED_NOW + 30_000) / 1000)));

    const body = JSON.parse(response.body as string);
    expect(body.error).toBe('rate_limited');
    expect(body.scope).toBe('user');
    expect(body.limit).toBe(5);
    expect(body.window_seconds).toBe(60);
    expect(body.retry_after_seconds).toBe(30);
    expect(body.trace_id).toBe('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(body).not.toHaveProperty('reason');
  });

  it('decorates successful responses with rate limit headers', async () => {
    const slidingAllowed: SlidingWindowLimitResult = {
      total: 1,
      limit: 30,
      windowSeconds: 60,
      remaining: 29,
      blocked: false,
      retryAfterSeconds: 0,
      resetAt: FIXED_NOW + 60_000,
      buckets: [],
    };

    applySlidingWindowLimitMock.mockResolvedValue(slidingAllowed);
    applyTokenBucketLimitMock.mockResolvedValueOnce({
      allowed: true,
      remainingTokens: 9,
      retryAfterSeconds: 0,
      resetAt: FIXED_NOW,
      state: { tokens: 9, updatedAt: new Date(FIXED_NOW).toISOString() },
    } as TokenBucketEvaluation);

    const handler = createHandler({ status: 200, headers: {}, body: JSON.stringify({ ok: true }) });

    const policy: RateLimitPolicy = {
      name: 'token-policy',
      routeId: 'writes',
      limits: [
        {
          id: 'route-user',
          scope: 'route',
          keyResolver: () => 'route:writes:user:1',
          slidingWindow: { limit: 30, windowSeconds: 60 },
          tokenBucket: { capacity: 10, refillRatePerSecond: 0.5, limitOverride: 30, windowSeconds: 60 },
        },
      ],
      deriveUserId: () => 'user-1',
    };

    const wrapped = withRateLimit(handler, policy);
    const response = await wrapped(createRequest('POST'), createContext());

    expect(handler).toHaveBeenCalledTimes(1);
    expect(response.headers?.['X-RateLimit-Limit']).toBe('30');
    expect(response.headers?.['X-RateLimit-Remaining']).toBe('9');
  });

  it('applies auth backoff when lockout is active', async () => {
    getAuthFailureStateMock.mockResolvedValue({
      count: 5,
      lastFailureAt: new Date(FIXED_NOW - 10_000).toISOString(),
      lockoutSeconds: 32,
      remainingLockoutSeconds: 25,
      lockedUntilMs: FIXED_NOW + 25_000,
    });

    const handler = createHandler({ status: 401, headers: {}, body: 'denied' });

    const wrapped = withRateLimit(handler, createAuthPolicy());
    const response = await wrapped(createRequest('POST'), createContext());

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(429);
    const payload = JSON.parse(response.body as string);
    expect(payload.scope).toBe('auth_backoff');
    expect(payload.retry_after_seconds).toBe(25);
    expect(payload.reason).toBe('auth_backoff');
  });

  it('resets auth failures after successful request', async () => {
    applySlidingWindowLimitMock.mockResolvedValue({
      total: 1,
      limit: 20,
      windowSeconds: 60,
      remaining: 19,
      blocked: false,
      retryAfterSeconds: 0,
      resetAt: FIXED_NOW + 60_000,
      buckets: [],
    });

    getAuthFailureStateMock.mockResolvedValue({
      count: 0,
      lastFailureAt: null,
      lockoutSeconds: 0,
      remainingLockoutSeconds: 0,
      lockedUntilMs: null,
    });

    const handler = createHandler({ status: 200, headers: {}, body: 'ok' });

    const wrapped = withRateLimit(handler, createAuthPolicy());
    await wrapped(createRequest('POST'), createContext());

    expect(handler).toHaveBeenCalledTimes(1);
    expect(resetAuthFailuresMock.mock.calls).toEqual(
      expect.arrayContaining([
        ['authfail:ip'],
        ['authfail_user:user-ctx'],
      ])
    );
  });

  it('enforces auth backoff keyed by IP when the user is unknown', async () => {
    const slidingAllowed: SlidingWindowLimitResult = {
      total: 1,
      limit: 20,
      windowSeconds: 60,
      remaining: 19,
      blocked: false,
      retryAfterSeconds: 0,
      resetAt: FIXED_NOW + 60_000,
      buckets: [],
    };

    applySlidingWindowLimitMock.mockResolvedValue(slidingAllowed);

    const unlockedState: AuthFailureState = {
      count: 0,
      lastFailureAt: null,
      lockoutSeconds: 0,
      remainingLockoutSeconds: 0,
      lockedUntilMs: null,
    };

    const lockedState: AuthFailureState = {
      count: 4,
      lastFailureAt: new Date(FIXED_NOW).toISOString(),
      lockoutSeconds: 60,
      remainingLockoutSeconds: 30,
      lockedUntilMs: FIXED_NOW + 30_000,
    };

    getAuthFailureStateMock
      .mockResolvedValueOnce(unlockedState)
      .mockResolvedValueOnce(unlockedState)
      .mockResolvedValueOnce(unlockedState)
      .mockResolvedValueOnce(lockedState);

    const handler = createHandler({ status: 401, headers: {}, body: 'denied' });
    const wrapped = withRateLimit(handler, createAuthPolicy({ deriveUserId: () => null }));
    const req = createRequest('POST');
    const ctx = createContext();

    for (let i = 0; i < 3; i++) {
      const res = await wrapped(req, ctx);
      expect(res.status).not.toBe(429);
    }

    const blocked = await wrapped(req, ctx);
    expect(blocked.status).toBe(429);
    expect(handler).toHaveBeenCalledTimes(3);
    const payload = JSON.parse(blocked.body as string);
    expect(payload.scope).toBe('auth_backoff');
    expect(payload.reason).toBe('auth_backoff');
    expect(payload.retry_after_seconds).toBe(30);

    const failureKeys = incrementAuthFailureMock.mock.calls.map(([key]) => key);
    expect(failureKeys).toHaveLength(3);
    expect(failureKeys.every((key) => key.startsWith('authfail:'))).toBe(true);
    expect(failureKeys.some((key) => key.startsWith('authfail_user:'))).toBe(false);
  });

  it('tracks auth failures per user once a principal is known', async () => {
    const slidingAllowed: SlidingWindowLimitResult = {
      total: 1,
      limit: 20,
      windowSeconds: 60,
      remaining: 19,
      blocked: false,
      retryAfterSeconds: 0,
      resetAt: FIXED_NOW + 60_000,
      buckets: [],
    };

    applySlidingWindowLimitMock.mockResolvedValue(slidingAllowed);
    getAuthFailureStateMock.mockResolvedValue({
      count: 0,
      lastFailureAt: null,
      lockoutSeconds: 0,
      remainingLockoutSeconds: 0,
      lockedUntilMs: null,
    });

    const handler = createHandler({ status: 401, headers: {}, body: 'denied' });
    const wrapped = withRateLimit(handler, createAuthPolicy());
    await wrapped(createRequest('POST'), createContext());

    expect(handler).toHaveBeenCalledTimes(1);
    expect(incrementAuthFailureMock).toHaveBeenCalledTimes(2);
    expect(
      incrementAuthFailureMock.mock.calls.some(([key]) => key.startsWith('authfail_user:'))
    ).toBe(true);

    const authFailureKeys = getAuthFailureStateMock.mock.calls.map(([key]) => key);
    expect(authFailureKeys).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^authfail:/),
        expect.stringMatching(/^authfail_user:/),
      ])
    );
  });

  it('allows auth requests again once the failure window expires', async () => {
    const slidingAllowed: SlidingWindowLimitResult = {
      total: 1,
      limit: 20,
      windowSeconds: 60,
      remaining: 19,
      blocked: false,
      retryAfterSeconds: 0,
      resetAt: FIXED_NOW + 60_000,
      buckets: [],
    };

    applySlidingWindowLimitMock.mockResolvedValue(slidingAllowed);

    const lockedState: AuthFailureState = {
      count: 5,
      lastFailureAt: new Date(FIXED_NOW).toISOString(),
      lockoutSeconds: 60,
      remainingLockoutSeconds: 30,
      lockedUntilMs: FIXED_NOW + 30_000,
    };

    const unlockedState: AuthFailureState = {
      count: 0,
      lastFailureAt: null,
      lockoutSeconds: 0,
      remainingLockoutSeconds: 0,
      lockedUntilMs: null,
    };

    getAuthFailureStateMock.mockResolvedValueOnce(lockedState).mockResolvedValueOnce(unlockedState);

    const handler = createHandler({ status: 200, headers: {}, body: 'ok' });
    const wrapped = withRateLimit(handler, createAuthPolicy());

    const blocked = await wrapped(createRequest('POST'), createContext());
    expect(blocked.status).toBe(429);

    const futureNow = FIXED_NOW + AUTH_FAILURE_WINDOW_SECONDS * 1000 + 1_000;
    (Date.now as jest.Mock).mockReturnValue(futureNow);

    const allowed = await wrapped(createRequest('POST'), createContext());
    expect(allowed.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not trigger auth backoff for non-auth policies', async () => {
    const slidingAllowed: SlidingWindowLimitResult = {
      total: 1,
      limit: 20,
      windowSeconds: 60,
      remaining: 19,
      blocked: false,
      retryAfterSeconds: 0,
      resetAt: FIXED_NOW + 60_000,
      buckets: [],
    };

    applySlidingWindowLimitMock.mockResolvedValue(slidingAllowed);

    const handler = createHandler({ status: 401, headers: {}, body: 'denied' });
    const wrapped = withRateLimit(handler, createPolicy());
    const response = await wrapped(createRequest('POST'), createContext());

    expect(response.status).toBe(401);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(getAuthFailureStateMock).not.toHaveBeenCalled();
    expect(incrementAuthFailureMock).not.toHaveBeenCalled();
  });
});
