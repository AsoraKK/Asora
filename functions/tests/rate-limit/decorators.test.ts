import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import {
  rateLimited,
  rateLimitedByRoute,
  rateLimitedWith,
  RateLimitDecorators,
} from '@http/rateLimitDecorators';

// Mock the rate limit store
jest.mock('@rate-limit/store', () => ({
  applySlidingWindowLimit: jest.fn().mockResolvedValue({
    total: 1,
    limit: 100,
    windowSeconds: 60,
    remaining: 99,
    blocked: false,
    retryAfterSeconds: 0,
    resetAt: Date.now() + 60_000,
    buckets: [],
  }),
  applyTokenBucketLimit: jest.fn().mockResolvedValue({
    allowed: true,
    remainingTokens: 9,
    retryAfterSeconds: 0,
    resetAt: Date.now(),
    state: { tokens: 9, updatedAt: new Date().toISOString() },
  }),
  getAuthFailureState: jest.fn().mockResolvedValue({
    count: 0,
    lastFailureAt: null,
    lockoutSeconds: 0,
    remainingLockoutSeconds: 0,
    lockedUntilMs: null,
  }),
  incrementAuthFailure: jest.fn(),
  resetAuthFailures: jest.fn(),
}));

// Mock Application Insights
jest.mock('applicationinsights', () => ({
  __esModule: true,
  default: {
    defaultClient: { trackMetric: jest.fn(), trackEvent: jest.fn() },
    setup: jest.fn().mockReturnValue({
      setAutoCollectConsole: jest.fn().mockReturnThis(),
      setAutoCollectDependencies: jest.fn().mockReturnThis(),
      setAutoCollectPerformance: jest.fn().mockReturnThis(),
      setAutoCollectRequests: jest.fn().mockReturnThis(),
      setAutoCollectExceptions: jest.fn().mockReturnThis(),
      setSendLiveMetrics: jest.fn().mockReturnThis(),
      start: jest.fn().mockReturnThis(),
    }),
  },
}));

beforeAll(() => {
  process.env.EMAIL_HASH_SALT = 'test-salt';
  process.env.RATE_LIMITS_ENABLED = 'true';
});

function createRequest(method = 'GET', path = 'test'): HttpRequest {
  return {
    method,
    url: `https://api.asora.dev/api/${path}`,
    headers: new Headers({ 'cf-connecting-ip': '127.0.0.1' }),
  } as unknown as HttpRequest;
}

function createContext(): InvocationContext {
  return {
    invocationId: 'test-invocation',
    traceContext: { traceParent: '00-abc-def-01' },
  } as InvocationContext;
}

async function simpleHandler(): Promise<HttpResponseInit> {
  return { status: 200, body: 'ok' };
}

describe('rateLimited decorator', () => {
  it('wraps handler with rate limiting for known function IDs', async () => {
    const wrapped = rateLimited('createPost', simpleHandler);

    expect(typeof wrapped).toBe('function');

    const response = await wrapped(createRequest('POST'), createContext());
    expect(response.status).toBe(200);
    expect(response.headers).toBeDefined();
  });

  it('applies generic policy for unknown function IDs', async () => {
    const wrapped = rateLimited('unknown-function', simpleHandler);

    const response = await wrapped(createRequest(), createContext());
    expect(response.status).toBe(200);
  });
});

describe('rateLimitedByRoute decorator', () => {
  it('determines policy from request path', async () => {
    const wrapped = rateLimitedByRoute(simpleHandler);

    const response = await wrapped(createRequest('GET', 'feed'), createContext());
    expect(response.status).toBe(200);
  });

  it('handles different route paths', async () => {
    const wrapped = rateLimitedByRoute(simpleHandler);

    const routes = ['health', 'auth/token', 'post', 'user/export'];

    for (const route of routes) {
      const response = await wrapped(createRequest('POST', route), createContext());
      expect(response.status).toBe(200);
    }
  });
});

describe('rateLimitedWith decorator', () => {
  it('uses provided custom policy', async () => {
    const customPolicy = {
      name: 'custom',
      routeId: 'custom/route',
      limits: [
        {
          id: 'custom-limit',
          scope: 'route' as const,
          keyResolver: () => 'custom:key',
          slidingWindow: { limit: 10, windowSeconds: 60 },
        },
      ],
    };

    const wrapped = rateLimitedWith(customPolicy, simpleHandler);

    const response = await wrapped(createRequest(), createContext());
    expect(response.status).toBe(200);
  });
});

describe('RateLimitDecorators namespace', () => {
  it('provides anonymous decorator', async () => {
    const wrapped = RateLimitDecorators.anonymous('health', simpleHandler);

    const response = await wrapped(createRequest(), createContext());
    expect(response.status).toBe(200);
  });

  it('provides write decorator', async () => {
    const wrapped = RateLimitDecorators.write('createPost', simpleHandler);

    const response = await wrapped(createRequest('POST'), createContext());
    expect(response.status).toBe(200);
  });

  it('provides auth decorator', async () => {
    const wrapped = RateLimitDecorators.auth('auth-token', simpleHandler);

    const response = await wrapped(createRequest('POST'), createContext());
    expect(response.status).toBe(200);
  });

  it('provides authenticated decorator', async () => {
    const wrapped = RateLimitDecorators.authenticated('auth-userinfo', simpleHandler);

    const response = await wrapped(createRequest(), createContext());
    expect(response.status).toBe(200);
  });
});

describe('Decorator preserves handler behavior', () => {
  it('passes request and context to original handler', async () => {
    const mockHandler = jest.fn(async (req: HttpRequest, ctx: InvocationContext) => {
      return {
        status: 200,
        body: JSON.stringify({ method: req.method, invocationId: ctx.invocationId }),
      };
    });

    const wrapped = rateLimited('getFeed', mockHandler);
    const req = createRequest('GET', 'feed');
    const ctx = createContext();

    await wrapped(req, ctx);

    expect(mockHandler).toHaveBeenCalledWith(req, ctx);
  });

  it('returns handler response unchanged (except headers)', async () => {
    const customResponse: HttpResponseInit = {
      status: 201,
      body: JSON.stringify({ id: 'abc123' }),
      headers: { 'X-Custom-Header': 'value' },
    };

    const handler = jest.fn(async () => customResponse);
    const wrapped = rateLimited('createPost', handler);

    const response = await wrapped(createRequest('POST'), createContext());

    expect(response.status).toBe(201);
    expect(response.body).toBe(customResponse.body);
    // Rate limit headers should be added
    expect(response.headers).toHaveProperty('X-RateLimit-Limit');
  });
});
