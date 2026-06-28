/**
 * Current News Board policy:
 * authenticated Free, Premium, Black, and Admin users can read News Board.
 * Anonymous requests remain blocked.
 */

/**
 * News Board Access Tests - Workstream 10
 *
 * Historical policy note: this originally enforced Black-tier access.
 * Current assertions below verify authenticated Free, Premium, Black, and Admin access.
 *   - Anonymous requests → 401
 *   - Free-tier users → 200
 *   - Premium-tier users → 200
 *   - Black-tier users → 200
 *   - Admin-tier users → 200
 */

import type { InvocationContext } from '@azure/functions';
import { extractAuthContext } from '@shared/http/authContext';
import { getFeed } from '@feed/service/feedService';
import { postsService } from '@posts/service/postsService';
import { httpReqMock } from '../helpers/http';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('@shared/http/authContext', () => ({
  extractAuthContext: jest.fn(),
}));

jest.mock('@feed/service/feedService', () => ({
  getFeed: jest.fn(),
}));

jest.mock('@posts/service/postsService', () => ({
  postsService: {
    enrichPost: jest.fn((item: unknown) => item),
  },
}));

const mockedExtractAuth = jest.mocked(extractAuthContext);
const mockedGetFeed = jest.mocked(getFeed);

const contextStub = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  traceContext: {},
  invocationId: 'news-gate-test',
  functionName: 'feed_news_get',
  triggerMetadata: {},
  retryContext: {},
  extraInputs: {},
  extraOutputs: {},
  options: {},
} as unknown as InvocationContext;

const emptyFeedResult = {
  status: 200,
  body: {
    success: true,
    data: {
      items: [],
      meta: { nextCursor: undefined },
    },
    items: [],
    meta: { nextCursor: undefined },
  },
};

function makeAuthContext(tier: string) {
  return {
    userId: `user-${tier}`,
    roles: ['user'],
    tier,
    token: {},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('News Board — tier gate (GET /api/feed/news)', () => {
  let feed_news_get: typeof import('@feed/routes/feed_news_get.function').feed_news_get;

  beforeAll(async () => {
    // Import after mocks are set up (module is auto-registered in Azure Functions)
    const mod = await import('@feed/routes/feed_news_get.function');
    feed_news_get = mod.feed_news_get;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetFeed.mockResolvedValue(emptyFeedResult as any);
  });

  // ─────────────────────────────────────────────────────────────
  // Blocked cases
  // ─────────────────────────────────────────────────────────────

  it('returns 401 for anonymous (unauthenticated) requests', async () => {
    mockedExtractAuth.mockRejectedValue(new Error('Missing token'));

    const req = httpReqMock({ method: 'GET' });
    const result = await feed_news_get(req, contextStub);

    expect(result.status).toBe(401);
    const body = result.jsonBody as any;
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 for free-tier users', async () => {
    mockedExtractAuth.mockResolvedValue(makeAuthContext('free') as any);

    const req = httpReqMock({ method: 'GET' });
    const result = await feed_news_get(req, contextStub);

    expect(result.status).toBe(200);
    expect(mockedGetFeed).toHaveBeenCalledTimes(1);
  });

  it('returns 200 for premium-tier users', async () => {
    mockedExtractAuth.mockResolvedValue(makeAuthContext('premium') as any);

    const req = httpReqMock({ method: 'GET' });
    const result = await feed_news_get(req, contextStub);

    expect(result.status).toBe(200);
    expect(mockedGetFeed).toHaveBeenCalledTimes(1);
  });

  // ─────────────────────────────────────────────────────────────
  // Allowed cases
  // ─────────────────────────────────────────────────────────────

  it('returns 200 for Black-tier users', async () => {
    mockedExtractAuth.mockResolvedValue(makeAuthContext('black') as any);

    const req = httpReqMock({ method: 'GET' });
    const result = await feed_news_get(req, contextStub);

    expect(result.status).toBe(200);
    expect(mockedGetFeed).toHaveBeenCalledTimes(1);
  });

  it('returns 200 for Admin-tier users', async () => {
    mockedExtractAuth.mockResolvedValue(makeAuthContext('admin') as any);

    const req = httpReqMock({ method: 'GET' });
    const result = await feed_news_get(req, contextStub);

    expect(result.status).toBe(200);
  });

  // ─────────────────────────────────────────────────────────────
  // Cache-control enforcement
  // ─────────────────────────────────────────────────────────────

  it('sets Cache-Control: private, no-store for authenticated responses', async () => {
    mockedExtractAuth.mockResolvedValue(makeAuthContext('black') as any);

    const req = httpReqMock({ method: 'GET' });
    const result = await feed_news_get(req, contextStub);

    expect(result.status).toBe(200);
    expect(result.headers?.['Cache-Control']).toBe('private, no-store');
  });
});
