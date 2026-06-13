/**
 * Rate-limit hardening: standard 429 behaviour for route-mapped and
 * function-mapped endpoint policies.
 */
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { withRateLimit } from '@http/withRateLimit';
import {
  applySlidingWindowLimit,
  applyTokenBucketLimit,
  getAuthFailureState,
  incrementAuthFailure,
  resetAuthFailures,
  type SlidingWindowLimitResult,
} from '@rate-limit/store';
import { getPolicyForFunction, getPolicyForRoute } from '@rate-limit/policies';

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

async function assertPolicyRateLimited(
  req: HttpRequest,
  policyFactory: (req: HttpRequest) => ReturnType<typeof getPolicyForRoute>,
  retryAfterSeconds = 30
): Promise<HttpResponseInit> {
  applySlidingWindowLimitMock.mockResolvedValue(blockedResult(retryAfterSeconds));
  getAuthFailureStateMock.mockResolvedValue({
    blocked: false,
    failures: 0,
    retryAfterSeconds: 0,
    windowSeconds: 1800,
  });

  const wrapped = withRateLimit(successHandler, policyFactory(req));
  return wrapped(req, makeContext());
}

async function assertRouteRateLimited(
  method: string,
  url: string,
  retryAfterSeconds = 30
): Promise<HttpResponseInit> {
  return assertPolicyRateLimited(makeRequest(method, url), getPolicyForRoute, retryAfterSeconds);
}

async function assertFunctionRateLimited(
  functionId: Parameters<typeof getPolicyForFunction>[0],
  method: string,
  url: string,
  retryAfterSeconds = 30
): Promise<HttpResponseInit> {
  const req = makeRequest(method, url);
  return assertPolicyRateLimited(req, () => getPolicyForFunction(functionId), retryAfterSeconds);
}

function parseJsonBody(response: HttpResponseInit): Record<string, unknown> {
  return JSON.parse(response.body as string) as Record<string, unknown>;
}

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

describe('route-mapped 429 responses', () => {
  const cases: Array<{ title: string; method: string; url: string }> = [
    { title: 'POST /auth/token', method: 'POST', url: 'https://api.asora.dev/api/auth/token' },
    { title: 'POST /auth/refresh', method: 'POST', url: 'https://api.asora.dev/api/auth/refresh' },
    { title: 'GET /auth/userinfo', method: 'GET', url: 'https://api.asora.dev/api/auth/userinfo' },
    { title: 'GET /feed/discover', method: 'GET', url: 'https://api.asora.dev/api/feed/discover' },
    { title: 'POST /moderation/flag', method: 'POST', url: 'https://api.asora.dev/api/moderation/flag' },
    { title: 'POST /moderation/appeals', method: 'POST', url: 'https://api.asora.dev/api/moderation/appeals' },
    { title: 'PATCH /users/me', method: 'PATCH', url: 'https://api.asora.dev/api/users/me' },
    { title: 'POST /_admin/content/{id}/block', method: 'POST', url: 'https://api.asora.dev/api/_admin/content/content-1/block' },
  ];

  for (const { title, method, url } of cases) {
    describe(title, () => {
      it('returns 429 with standard headers and body', async () => {
        const response = await assertRouteRateLimited(method, url, 45);

        expect(response.status).toBe(429);
        expect((response.headers as Record<string, string>)['Retry-After']).toBe('45');
        expect((response.headers as Record<string, string>)['X-RateLimit-Remaining']).toBe('0');
        expect((response.headers as Record<string, string>)['X-RateLimit-Limit']).toBeDefined();
        expect((response.headers as Record<string, string>)['X-RateLimit-Reset']).toBeDefined();

        const body = parseJsonBody(response);
        expect(body.error).toBe('rate_limited');
        expect(typeof body.limit).toBe('number');
        expect(typeof body.window_seconds).toBe('number');
        expect(body.retry_after_seconds).toBe(45);
      });

      it('does not call the downstream handler when blocked', async () => {
        await assertRouteRateLimited(method, url);
        expect(successHandler).not.toHaveBeenCalled();
      });
    });
  }
});

describe('function-mapped 429 responses', () => {
  const cases: Array<{ functionId: Parameters<typeof getPolicyForFunction>[0]; method: string; url: string }> = [
    { functionId: 'createPost', method: 'POST', url: 'https://api.asora.dev/api/posts' },
    { functionId: 'createComment', method: 'POST', url: 'https://api.asora.dev/api/posts/post-1/comments' },
    { functionId: 'appeals-create', method: 'POST', url: 'https://api.asora.dev/api/appeals' },
    { functionId: 'appeals-vote', method: 'POST', url: 'https://api.asora.dev/api/appeals/appeal-1/vote' },
    { functionId: 'media-upload-url', method: 'POST', url: 'https://api.asora.dev/api/media/upload-url' },
    { functionId: 'auth-redeem-invite', method: 'POST', url: 'https://api.asora.dev/api/auth/redeem-invite' },
  ];

  for (const { functionId, method, url } of cases) {
    it(`${functionId} returns structured 429 when the limit is exceeded`, async () => {
      const response = await assertFunctionRateLimited(functionId, method, url, 20);

      expect(response.status).toBe(429);
      expect((response.headers as Record<string, string>)['Retry-After']).toBe('20');

      const body = parseJsonBody(response);
      expect(body.error).toBe('rate_limited');
      expect(body.retry_after_seconds).toBe(20);
      expect(successHandler).not.toHaveBeenCalled();
    });
  }
});
