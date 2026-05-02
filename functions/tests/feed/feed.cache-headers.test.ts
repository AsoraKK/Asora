/**
 * Feed route cache-header tests
 *
 * Verifies that feed endpoints set the correct Cache-Control and Vary headers:
 * - Authenticated request → `Cache-Control: private, no-store` + `Vary: Authorization`
 * - Anonymous request     → `Cache-Control: public, max-age=60, stale-while-revalidate=30` + `Vary: Authorization`
 *
 * Both `feed/discover` (feed_discover_get) and `feed/news` (feed_news_get) handlers
 * share the same cache-header logic so both are tested here.
 */

import { InvocationContext } from '@azure/functions';
import { SignJWT } from 'jose';
import { resetAuthConfigForTesting } from '@auth/config';
import { httpReqMock } from '../helpers/http';

// ─────────────────────────────────────────────────────────────
// Mocks – must be declared before any import that triggers them
// ─────────────────────────────────────────────────────────────

// Stable feed result stub
const EMPTY_FEED = {
  body: {
    items: [],
    meta: { nextCursor: null },
  },
};

jest.mock('@feed/service/feedService', () => ({
  getFeed: jest.fn().mockResolvedValue(EMPTY_FEED),
}));

jest.mock('@posts/service/postsService', () => ({
  postsService: {
    enrichPost: jest.fn().mockImplementation(async (item: unknown) => item),
  },
}));

// authContext mock – controlled by each test
const extractAuthContextMock = jest.fn();
jest.mock('@shared/http/authContext', () => ({
  extractAuthContext: (...args: unknown[]) => extractAuthContextMock(...args),
}));

// ─────────────────────────────────────────────────────────────
// Import handlers after mocks are in place
// ─────────────────────────────────────────────────────────────

import { feed_discover_get } from '@feed/routes/feed_discover_get.function';
import { feed_news_get } from '@feed/routes/feed_news_get.function';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-secret-for-feed-cache-header-tests-32+chars!';

function makeContext(id = 'test-feed-cache'): InvocationContext {
  return {
    invocationId: id,
    log: jest.fn(),
    error: jest.fn(),
    traceContext: { traceParent: '00-00000000000000000000000000000001-0000000000000001-01' },
  } as unknown as InvocationContext;
}

async function signedToken(): Promise<string> {
  return new SignJWT({ sub: 'user-feed-test', roles: ['user'] })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('asora-auth')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(JWT_SECRET));
}

/** Make extractAuthContext succeed (authenticated) */
function mockAuthenticated(userId = 'user-feed-test') {
  extractAuthContextMock.mockImplementation(async (ctx: any) => ({
    userId,
    roles: ['user'],
    correlationId: ctx.correlationId,
  }));
}

/** Make extractAuthContext throw (anonymous) */
function mockAnonymous() {
  extractAuthContextMock.mockRejectedValue(new Error('No authorization header'));
}

// ─────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_ISSUER = 'asora-auth';
  resetAuthConfigForTesting();
});

beforeEach(() => {
  jest.clearAllMocks();
  resetAuthConfigForTesting();
});

afterAll(() => {
  resetAuthConfigForTesting();
});

// ─────────────────────────────────────────────────────────────
// feed/discover
// ─────────────────────────────────────────────────────────────

describe('feed_discover_get cache headers', () => {
  it('sets Cache-Control: private, no-store for authenticated requests', async () => {
    mockAuthenticated();
    const token = await signedToken();
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await feed_discover_get(req, makeContext('disc-auth'));

    const headers = response.headers as Record<string, string>;
    expect(headers['Cache-Control']).toBe('private, no-store');
  });

  it('sets Vary: Authorization regardless of auth state (authenticated)', async () => {
    mockAuthenticated();
    const token = await signedToken();
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await feed_discover_get(req, makeContext('disc-vary-auth'));
    const headers = response.headers as Record<string, string>;
    expect(headers['Vary']).toBe('Authorization');
  });

  it('sets Cache-Control: public, max-age=60, stale-while-revalidate=30 for anonymous requests', async () => {
    mockAnonymous();
    const req = httpReqMock({});

    const response = await feed_discover_get(req, makeContext('disc-anon'));
    const headers = response.headers as Record<string, string>;
    expect(headers['Cache-Control']).toBe('public, max-age=60, stale-while-revalidate=30');
  });

  it('sets Vary: Authorization for anonymous requests (prevents serving wrong cached copy)', async () => {
    mockAnonymous();
    const req = httpReqMock({});

    const response = await feed_discover_get(req, makeContext('disc-vary-anon'));
    const headers = response.headers as Record<string, string>;
    expect(headers['Vary']).toBe('Authorization');
  });

  it('does not include private directive in anonymous response', async () => {
    mockAnonymous();
    const req = httpReqMock({});

    const response = await feed_discover_get(req, makeContext('disc-anon-no-private'));
    const cacheControl = (response.headers as Record<string, string>)['Cache-Control'];
    expect(cacheControl).not.toContain('private');
  });

  it('does not include public directive in authenticated response', async () => {
    mockAuthenticated();
    const token = await signedToken();
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await feed_discover_get(req, makeContext('disc-auth-no-public'));
    const cacheControl = (response.headers as Record<string, string>)['Cache-Control'];
    expect(cacheControl).not.toContain('public');
  });
});

// ─────────────────────────────────────────────────────────────
// feed/news
// ─────────────────────────────────────────────────────────────

describe('feed_news_get cache headers', () => {
  // News Board is Black-tier only. mockAuthenticated must supply tier: 'black'.
  function mockBlackTier(userId = 'user-feed-test') {
    extractAuthContextMock.mockImplementation(async (ctx: any) => ({
      userId,
      roles: ['user'],
      tier: 'black',
      correlationId: ctx.correlationId,
    }));
  }

  it('sets Cache-Control: private, no-store for Black-tier authenticated requests', async () => {
    mockBlackTier();
    const token = await signedToken();
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await feed_news_get(req, makeContext('news-auth'));
    const headers = response.headers as Record<string, string>;
    expect(headers['Cache-Control']).toBe('private, no-store');
  });

  it('returns 401 for anonymous requests (News Board is authenticated-only)', async () => {
    mockAnonymous();
    const req = httpReqMock({});

    const response = await feed_news_get(req, makeContext('news-anon'));
    expect(response.status).toBe(401);
  });

  it('includes Vary: Authorization for authenticated Black-tier response', async () => {
    mockBlackTier();
    const token = await signedToken();
    const authReq = httpReqMock({ headers: { authorization: `Bearer ${token}` } });
    const authRes = await feed_news_get(authReq, makeContext('news-vary-auth'));
    expect((authRes.headers as Record<string, string>)['Vary']).toBe('Authorization');
  });
});
