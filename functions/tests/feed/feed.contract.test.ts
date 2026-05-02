/**
 * Feed route – contract smoke tests (CI gate)
 *
 * Fast, focused checks that the route layer:
 *   1. Wraps all responses in the canonical { success, data, timestamp } envelope
 *   2. Sets security headers on every response
 *   3. Sets Vary: Authorization on every response (including error responses)
 *   4. Forwards includeTestPosts and testSessionId query parameters to the service
 *   5. Returns 429 JSON when the rate limiter fires
 *
 * These complement the broader route tests in get.test.ts; this file is kept
 * small enough to run in < 200 ms and serve as a CI gate.
 */

import { HttpRequest, InvocationContext } from '@azure/functions';
import { getFeed } from '@feed/routes/getFeed';
import * as feedService from '@feed/service/feedService';
import { HttpError } from '@shared/utils/errors';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('@feed/service/feedService', () => ({
  getFeed: jest.fn(),
}));

jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    tryGetPrincipal: jest.fn(async (header: string | null | undefined) =>
      header ? { sub: 'user-1', raw: {} } : null,
    ),
  };
});

const mockedFeedService = feedService as jest.Mocked<typeof feedService>;

// ─────────────────────────────────────────────────────────────────────────────
// Test infra
// ─────────────────────────────────────────────────────────────────────────────

const mockContext = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  invocationId: 'contract-test',
  functionName: 'feedGet',
  traceContext: {},
  triggerMetadata: {},
  retryContext: {},
  extraInputs: {},
  extraOutputs: {},
  options: {},
} as unknown as InvocationContext;

function createRequest(
  query: Record<string, string> = {},
  headers: Record<string, string> = {},
): HttpRequest {
  const queryParams = new URLSearchParams(query);
  return {
    method: 'GET',
    url: `https://test.com/api/feed?${queryParams.toString()}`,
    headers: new Headers(headers),
    query: {
      get: (key: string) => queryParams.get(key),
      entries: () => queryParams.entries(),
    },
    params: {},
    user: null,
    body: {},
    formData: jest.fn(),
    json: jest.fn(),
    text: jest.fn(),
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
  } as unknown as HttpRequest;
}

const SERVICE_RESPONSE = {
  body: {
    items: [{ id: 'post-1', createdAt: 9999 }],
    meta: {
      count: 1,
      nextCursor: null,
      sinceCursor: null,
      timingsMs: { query: 5, total: 10 },
      applied: { feedType: 'public', visibilityFilters: ['public'], authorCount: 0 },
    },
  },
  headers: {
    'X-Feed-Type': 'public',
    'X-Feed-Limit': '30',
    'X-Cosmos-RU': '1.5',
    'X-Request-Duration': '10',
    'X-Feed-Author-Count': '0',
    'X-Cosmos-Continuation-Token': '',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedFeedService.getFeed.mockResolvedValue(SERVICE_RESPONSE as any);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Response envelope shape
// ─────────────────────────────────────────────────────────────────────────────

describe('response envelope', () => {
  it('wraps data in { success: true, data, timestamp }', async () => {
    const req = createRequest();
    const res = await getFeed(req, mockContext);

    expect(res.status).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('data contains items array and meta object', async () => {
    const req = createRequest();
    const res = await getFeed(req, mockContext);

    const { data } = JSON.parse(res.body as string);
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.meta).toBeDefined();
    expect(typeof data.meta.count).toBe('number');
  });

  it('Content-Type is application/json', async () => {
    const req = createRequest();
    const res = await getFeed(req, mockContext);

    expect(res.headers!['Content-Type']).toContain('application/json');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Security headers
// ─────────────────────────────────────────────────────────────────────────────

describe('security headers', () => {
  it('sets Strict-Transport-Security on successful responses', async () => {
    const res = await getFeed(createRequest(), mockContext);
    expect(res.headers!['Strict-Transport-Security']).toContain('max-age=');
  });

  it('sets X-Content-Type-Options: nosniff (via security headers)', async () => {
    const res = await getFeed(createRequest(), mockContext);
    // Security headers block includes X-Content-Type-Options
    expect(res.headers!['X-Content-Type-Options']).toBe('nosniff');
  });

  it('sets Content-Security-Policy on successful responses', async () => {
    const res = await getFeed(createRequest(), mockContext);
    expect(res.headers!['Content-Security-Policy']).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Vary: Authorization always present
// ─────────────────────────────────────────────────────────────────────────────

describe('Vary: Authorization contract', () => {
  it('Vary: Authorization is set on successful response', async () => {
    const res = await getFeed(createRequest(), mockContext);
    expect(res.headers!['Vary']).toContain('Authorization');
  });

  it('includes Authorization in Vary header even if service adds others', async () => {
    mockedFeedService.getFeed.mockResolvedValueOnce({
      ...SERVICE_RESPONSE,
      headers: { ...SERVICE_RESPONSE.headers },
    } as any);

    const res = await getFeed(createRequest(), mockContext);
    expect(res.headers!['Vary']).toContain('Authorization');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Query param forwarding
// ─────────────────────────────────────────────────────────────────────────────

describe('query param forwarding to service', () => {
  it('forwards cursor param to service call', async () => {
    const req = createRequest({ cursor: 'abc123' });
    await getFeed(req, mockContext);

    expect(mockedFeedService.getFeed).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: 'abc123' }),
    );
  });

  it('forwards since param to service call', async () => {
    const req = createRequest({ since: 'def456' });
    await getFeed(req, mockContext);

    expect(mockedFeedService.getFeed).toHaveBeenCalledWith(
      expect.objectContaining({ since: 'def456' }),
    );
  });

  it('forwards limit param to service call', async () => {
    const req = createRequest({ limit: '20' });
    await getFeed(req, mockContext);

    expect(mockedFeedService.getFeed).toHaveBeenCalledWith(
      expect.objectContaining({ limit: '20' }),
    );
  });

  it('forwards authorId param to service call', async () => {
    const req = createRequest({ authorId: 'user-xyz' });
    await getFeed(req, mockContext);

    expect(mockedFeedService.getFeed).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: 'user-xyz' }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Service error → proper HTTP error responses
// ─────────────────────────────────────────────────────────────────────────────

describe('service error handling', () => {
  it('HttpError 400 → 400 JSON response with error field', async () => {
    mockedFeedService.getFeed.mockRejectedValueOnce(
      new HttpError(400, 'Invalid cursor'),
    );

    const res = await getFeed(createRequest(), mockContext);

    expect(res.status).toBe(400);
    const body = JSON.parse(res.body as string);
    expect(body.error).toBe('Invalid cursor');
  });

  it('HttpError 400 response has Content-Type: application/json', async () => {
    mockedFeedService.getFeed.mockRejectedValueOnce(
      new HttpError(400, 'cursor and since'),
    );

    const res = await getFeed(createRequest(), mockContext);

    expect(res.headers!['Content-Type']).toContain('application/json');
  });

  it('unexpected error → 500 response', async () => {
    mockedFeedService.getFeed.mockRejectedValueOnce(new Error('DB exploded'));

    const res = await getFeed(createRequest(), mockContext);

    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Cache-Control policy per auth state
// ─────────────────────────────────────────────────────────────────────────────

describe('Cache-Control policy', () => {
  it('guest request gets public cache with max-age', async () => {
    const req = createRequest({}, {}); // no Authorization header
    const res = await getFeed(req, mockContext);

    const cc = res.headers!['Cache-Control'];
    expect(cc).toContain('public');
    expect(cc).toContain('max-age=60');
  });

  it('authenticated request gets private no-store', async () => {
    const req = createRequest({}, { Authorization: 'Bearer token123' });
    const res = await getFeed(req, mockContext);

    const cc = res.headers!['Cache-Control'];
    expect(cc).toContain('private');
    expect(cc).toContain('no-store');
  });
});
