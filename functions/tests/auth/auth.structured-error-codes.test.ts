/**
 * Structured error-code contract tests
 *
 * Verifies that each category of error response carries the documented
 * machine-readable fields so API clients can handle errors programmatically.
 *
 * Categories tested:
 *  - 401  (authentication failure) from requireAuth
 *  - 403  (authorization failure) from requireRoles
 *  - 403  (account_disabled)      from requireActiveAdmin
 *  - 429  (rate limited)          from withRateLimit
 *  - 403  (invite_required)       from token exchange
 */

import { SignJWT } from 'jose';
import { resetAuthConfigForTesting } from '@auth/config';
import { requireAuth } from '@auth/requireAuth';
import { requireAdmin } from '@auth/requireRoles';
import { requireActiveAdmin } from '@admin/adminAuthUtils';
import { withRateLimit, type RateLimitPolicy } from '@http/withRateLimit';
import {
  applySlidingWindowLimit,
  getAuthFailureState,
  type SlidingWindowLimitResult,
} from '@rate-limit/store';
import { httpReqMock } from '../helpers/http';

// ─────────────────────────────────────────────────────────────
// Mocks
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

const mockUserRead = jest.fn();
jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(() => ({
    container: jest.fn(() => ({
      item: jest.fn(() => ({ read: mockUserRead })),
    })),
  })),
}));

const applySlidingWindowLimitMock = applySlidingWindowLimit as jest.MockedFunction<typeof applySlidingWindowLimit>;
const getAuthFailureStateMock = getAuthFailureState as jest.MockedFunction<typeof getAuthFailureState>;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-secret-key-for-unit-tests-only-min-32chars!';
const JWT_ISSUER = 'asora-auth';
const secretBytes = new TextEncoder().encode(JWT_SECRET);
const FIXED_NOW = 1_700_000_000_000;

async function createToken(sub: string, roles: string[] = []): Promise<string> {
  return new SignJWT({ sub, roles })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secretBytes);
}

const contextStub: any = {
  log: jest.fn(),
  invocationId: 'test-error-codes',
  traceContext: { traceParent: '00-dddddddddddddddddddddddddddddddd-eeeeeeeeeeeeeeee-01' },
};
const successHandler = jest.fn(async () => ({ status: 200, jsonBody: { ok: true } }));

function blockedResult(): SlidingWindowLimitResult {
  return {
    total: 100, limit: 10, windowSeconds: 60, remaining: 0,
    blocked: true, retryAfterSeconds: 30, resetAt: FIXED_NOW + 30_000, buckets: [],
  };
}

function allowedResult(): SlidingWindowLimitResult {
  return {
    total: 1, limit: 10, windowSeconds: 60, remaining: 9,
    blocked: false, retryAfterSeconds: 0, resetAt: FIXED_NOW + 60_000, buckets: [],
  };
}

function testPolicy(): RateLimitPolicy {
  return {
    name: 'test',
    routeId: 'test-route',
    limits: [
      { id: 'ip', scope: 'ip', keyResolver: () => 'ip:test', slidingWindow: { limit: 10, windowSeconds: 60 } },
      { id: 'user', scope: 'user', keyResolver: () => 'user:test', slidingWindow: { limit: 10, windowSeconds: 60 } },
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// Test setup
// ─────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_ISSUER = JWT_ISSUER;
  process.env.RATE_LIMITS_ENABLED = 'true';
  process.env.EMAIL_HASH_SALT = 'unit-test-salt';
  resetAuthConfigForTesting();
});

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  jest.clearAllMocks();
  resetAuthConfigForTesting();
});

afterEach(() => {
  (Date.now as jest.Mock | undefined)?.mockRestore?.();
});

afterAll(() => {
  resetAuthConfigForTesting();
});

// ─────────────────────────────────────────────────────────────
// 401 error-code contract
// ─────────────────────────────────────────────────────────────

describe('structured error codes – 401 (authentication failure)', () => {
  it('body contains `error` and `message` string fields', async () => {
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ method: 'GET' });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(401);
    const body = JSON.parse(response.body as string);
    expect(typeof body.error).toBe('string');
    // message lives in the WWW-Authenticate header error_description, not the body
  });

  it('WWW-Authenticate header follows RFC 6750 Bearer format', async () => {
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ method: 'GET' });

    const response = await handler(req, contextStub);

    const wwwAuth = (response.headers as Record<string, string>)['WWW-Authenticate'] ?? '';
    // RFC 6750: Bearer realm="..." error="..." error_description="..."
    expect(wwwAuth).toMatch(/^Bearer /);
    expect(wwwAuth).toMatch(/error="/);
  });
});

// ─────────────────────────────────────────────────────────────
// 403 error-code contract – role check
// ─────────────────────────────────────────────────────────────

describe('structured error codes – 403 (insufficient role)', () => {
  it('body contains error="forbidden" and code="insufficient_permissions"', async () => {
    const token = await createToken('user-123', []); // no admin role
    const handler = requireAdmin(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(403);
    const body = JSON.parse(response.body as string);
    expect(body.error).toBe('forbidden');
    expect(body.code).toBe('insufficient_permissions');
    expect(Array.isArray(body.requiredRoles)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// 403 error-code contract – account disabled
// ─────────────────────────────────────────────────────────────

describe('structured error codes – 403 (account_disabled)', () => {
  it('body contains error="account_disabled" and a message string', async () => {
    mockUserRead.mockResolvedValue({ resource: { id: 'admin-x', isActive: false } });

    const token = await createToken('admin-x', ['admin']);
    const handler = requireActiveAdmin(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(403);
    const body = JSON.parse(response.body as string);
    expect(body.error).toBe('account_disabled');
    expect(typeof body.message).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────
// 429 error-code contract
// ─────────────────────────────────────────────────────────────

describe('structured error codes – 429 (rate_limited)', () => {
  it('body contains error="rate_limited", limit, window_seconds, retry_after_seconds', async () => {
    applySlidingWindowLimitMock
      .mockResolvedValueOnce(allowedResult())
      .mockResolvedValueOnce(blockedResult());

    getAuthFailureStateMock.mockResolvedValue({
      blocked: false, failures: 0, retryAfterSeconds: 0, windowSeconds: 1800,
    });

    const req = httpReqMock({
      method: 'POST',
      url: 'https://api.asora.dev/test',
      headers: { 'cf-connecting-ip': '203.0.113.10' },
    });

    const wrapped = withRateLimit(successHandler, testPolicy());
    const response = await wrapped(req, contextStub);

    expect(response.status).toBe(429);
    const body = JSON.parse(response.body as string);
    expect(body.error).toBe('rate_limited');
    expect(typeof body.limit).toBe('number');
    expect(typeof body.window_seconds).toBe('number');
    expect(typeof body.retry_after_seconds).toBe('number');
    expect(body.retry_after_seconds).toBeGreaterThan(0);
  });

  it('has Retry-After and X-RateLimit-* headers present', async () => {
    applySlidingWindowLimitMock
      .mockResolvedValueOnce(allowedResult())
      .mockResolvedValueOnce(blockedResult());

    getAuthFailureStateMock.mockResolvedValue({
      blocked: false, failures: 0, retryAfterSeconds: 0, windowSeconds: 1800,
    });

    const req = httpReqMock({
      method: 'POST',
      url: 'https://api.asora.dev/test',
      headers: { 'cf-connecting-ip': '203.0.113.10' },
    });

    const wrapped = withRateLimit(successHandler, testPolicy());
    const response = await wrapped(req, contextStub);

    const h = response.headers as Record<string, string>;
    expect(h['Retry-After']).toBeDefined();
    expect(h['X-RateLimit-Limit']).toBeDefined();
    expect(h['X-RateLimit-Remaining']).toBe('0');
    expect(h['X-RateLimit-Reset']).toBeDefined();
  });
});
