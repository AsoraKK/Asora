/**
 * Rate-limit hardening: 429 + Retry-After for key write endpoints
 *
 * Each describe block covers one route that must enforce rate limiting.
 * The test injects the real `withRateLimit` middleware with a production-like
 * policy and a mocked store so no Redis connection is needed.
 *
 * We verify:
 * 1. The response code is 429
 * 2. `Retry-After` header is present and is a positive integer string
 * 3. `X-RateLimit-Limit`, `X-RateLimit-Remaining` headers are present
 * 4. The JSON body contains `error: "rate_limited"` and `retry_after_seconds`
 */
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
import { getPolicyForRoute } from '@rate-limit/policies';

// ─────────────────────────────────────────────────────────────
// Module mocks
// ─────────────────────────────────────────────────────────────

jest.mock('@rate-limit/store', () => ({
  applySlidingWindowLimit: jest.fn(),
  applyTokenBucketLimit: jest.fn(),
  getAuthFailureState: jest.fn(),
  incrementAuthFailure: jest.fn(),
  resetAuthFailures: jest.fn(),
}));

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

const applySlidingWindowLimitMock = applySlidingWindowLimit as jest.MockedFunction<typeof applySlidingWindowLimit>;
const getAuthFailureStateMock = getAuthFailureState as jest.MockedFunction<typeof getAuthFailureState>;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const FIXED_NOW = 1_700_000_000_000;

function makeRequest(method: string, url: string): HttpRequest {
  return {
    method,
    headers: new Headers({ 'cf-connecting-ip': '203.0.113.42' }),
    url,
  } as unknown as HttpRequest;
}

function makeContext(): InvocationContext {
  return {
    invocationId: 'test-rate-limit',
    traceContext: {
      traceParent: '00-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-cccccccccccccccc-01',
    },
  } as unknown as InvocationContext;
}

const successHandler = jest.fn(async (): Promise<HttpResponseInit> => ({ status: 200, body: 'ok', headers: {} }));

/** Build a "blocked" sliding window result */
function blockedResult(retryAfterSeconds = 30): SlidingWindowLimitResult {
  return {
    total: 100,
    limit: 30,
    windowSeconds: 60,
    remaining: 0,
    blocked: true,
    retryAfterSeconds,
    resetAt: FIXED_NOW + retryAfterSeconds * 1_000,
    buckets: [],
  };
}

/** Build an "allowed" sliding window result */
function allowedResult(): SlidingWindowLimitResult {
  return {
    total: 1,
    limit: 30,
    windowSeconds: 60,
    remaining: 29,
    blocked: false,
    retryAfterSeconds: 0,
    resetAt: FIXED_NOW + 60_000,
    buckets: [],
  };
}

// ─────────────────────────────────────────────────────────────
// Per-route helper
// ─────────────────────────────────────────────────────────────

async function assertRateLimited(
  method: string,
  url: string,
  retryAfterSeconds = 30
): Promise<HttpResponseInit> {
  // All limit checks return blocked — this correctly handles routes where
  // user-scoped limits are skipped (no auth token) so only the IP limit fires.
  applySlidingWindowLimitMock.mockResolvedValue(blockedResult(retryAfterSeconds));

  getAuthFailureStateMock.mockResolvedValue({
    blocked: false,
    failures: 0,
    retryAfterSeconds: 0,
    windowSeconds: 1800,
  });

  const req = makeRequest(method, url);
  const policy = getPolicyForRoute(req);
  const wrapped = withRateLimit(successHandler, policy);

  const response = await wrapped(req, makeContext());
  return response;
}

// ─────────────────────────────────────────────────────────────
// Test setup
// ─────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env.RATE_LIMITS_ENABLED = 'true';
  process.env.EMAIL_HASH_SALT = 'unit-test-salt';
});

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  jest.clearAllMocks();
});

afterEach(() => {
  (Date.now as jest.Mock | undefined)?.mockRestore?.();
});

// ─────────────────────────────────────────────────────────────
// Route-specific 429 tests
// ─────────────────────────────────────────────────────────────

describe('rate limit – POST /auth/token', () => {
  it('returns 429 when the limit is exceeded', async () => {
    const response = await assertRateLimited('POST', 'https://api.asora.dev/auth/token');
    expect(response.status).toBe(429);
  });

  it('includes a Retry-After header with a positive integer value', async () => {
    const response = await assertRateLimited('POST', 'https://api.asora.dev/auth/token', 45);
    const retryAfter = (response.headers as Record<string, string>)?.['Retry-After'];
    expect(retryAfter).toBeDefined();
    expect(Number(retryAfter)).toBeGreaterThan(0);
    expect(Number.isInteger(Number(retryAfter))).toBe(true);
  });

  it('includes X-RateLimit-Remaining: 0', async () => {
    const response = await assertRateLimited('POST', 'https://api.asora.dev/auth/token');
    expect((response.headers as Record<string, string>)?.['X-RateLimit-Remaining']).toBe('0');
  });

  it('returns JSON body with error="rate_limited"', async () => {
    const response = await assertRateLimited('POST', 'https://api.asora.dev/auth/token');
    const body = JSON.parse(response.body as string);
    expect(body.error).toBe('rate_limited');
    expect(typeof body.retry_after_seconds).toBe('number');
    expect(body.retry_after_seconds).toBeGreaterThan(0);
  });

  it('does not call the downstream handler when blocked', async () => {
    await assertRateLimited('POST', 'https://api.asora.dev/auth/token');
    expect(successHandler).not.toHaveBeenCalled();
  });
});

describe('rate limit – POST /post (create post)', () => {
  it('returns 429 when the limit is exceeded', async () => {
    const response = await assertRateLimited('POST', 'https://api.asora.dev/post');
    expect(response.status).toBe(429);
  });

  it('includes Retry-After and X-RateLimit-* headers', async () => {
    const response = await assertRateLimited('POST', 'https://api.asora.dev/post', 60);
    const headers = response.headers as Record<string, string>;
    expect(headers['Retry-After']).toBeDefined();
    expect(headers['X-RateLimit-Limit']).toBeDefined();
    expect(headers['X-RateLimit-Reset']).toBeDefined();
  });
});

describe('rate limit – POST /moderation/flag', () => {
  it('returns 429 when the limit is exceeded', async () => {
    const response = await assertRateLimited('POST', 'https://api.asora.dev/moderation/flag');
    expect(response.status).toBe(429);
  });

  it('returns structured rate_limited body', async () => {
    const response = await assertRateLimited('POST', 'https://api.asora.dev/moderation/flag');
    const body = JSON.parse(response.body as string);
    expect(body.error).toBe('rate_limited');
    expect(typeof body.limit).toBe('number');
    expect(typeof body.window_seconds).toBe('number');
  });
});

describe('rate limit – POST /moderation/appeals', () => {
  it('returns 429 when the limit is exceeded', async () => {
    const response = await assertRateLimited('POST', 'https://api.asora.dev/moderation/appeals');
    expect(response.status).toBe(429);
  });

  it('includes Retry-After header', async () => {
    const response = await assertRateLimited('POST', 'https://api.asora.dev/moderation/appeals', 20);
    const headers = response.headers as Record<string, string>;
    expect(Number(headers['Retry-After'])).toBeGreaterThan(0);
  });
});

describe('rate limit – POST /user/export', () => {
  it('returns 429 when the limit is exceeded', async () => {
    const response = await assertRateLimited('POST', 'https://api.asora.dev/user/export');
    expect(response.status).toBe(429);
  });

  it('does not call the downstream handler', async () => {
    await assertRateLimited('POST', 'https://api.asora.dev/user/export');
    expect(successHandler).not.toHaveBeenCalled();
  });
});
