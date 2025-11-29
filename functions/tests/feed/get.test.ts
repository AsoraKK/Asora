import { HttpRequest, InvocationContext } from '@azure/functions';
import { getFeed } from '@feed/routes/getFeed';
import * as feedService from '@feed/service/feedService';
import { HttpError } from '@shared/utils/errors';

jest.mock('@feed/service/feedService', () => ({
  getFeed: jest.fn(),
}));

jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    tryGetPrincipal: jest.fn(async (header: string | null | undefined) => {
      if (!header) {
        return null;
      }
      return { sub: 'user-1', raw: {} } as any;
    }),
  };
});

const mockedFeedService = feedService as jest.Mocked<typeof feedService>;

const mockContext = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  invocationId: 'test-invocation-id',
  functionName: 'feedGet',
  traceContext: {},
  triggerMetadata: {},
  retryContext: {},
  extraInputs: {},
  extraOutputs: {},
  options: {},
} as unknown as InvocationContext;

function createRequest(
  headers?: Record<string, string> | Headers,
  query?: Record<string, string>
): HttpRequest {
  const queryParams = new URLSearchParams(query);
  const baseRequest = {
    method: 'GET',
    url: `https://test.com/api/feed${query ? '?' + queryParams.toString() : ''}`,
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
  return baseRequest;
}

const defaultFeedBody = {
  items: [
    {
      id: 'alpha',
      createdAt: '2024-01-01T00:00:00.000Z',
      authorId: 'author-1',
    },
  ],
  meta: {
    count: 1,
    nextCursor: 'abc123',
    sinceCursor: 'xyz789',
  },
};

const defaultFeedResult = {
  body: defaultFeedBody,
  headers: { 'X-Cosmos-RU': '1.23' },
};

describe('Feed GET Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFeedService.getFeed.mockResolvedValue(defaultFeedResult);
  });

  // ─────────────────────────────────────────────────────────────
  // Basic response
  // ─────────────────────────────────────────────────────────────

  it('returns wrapped feed data with merged headers', async () => {
    const response = await getFeed(createRequest(), mockContext);

    expect(response.status).toBe(200);
    const parsed = JSON.parse(response.body ?? '{}');
    expect(parsed).toMatchObject({
      success: true,
      data: defaultFeedBody,
    });
    expect(response.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Vary: 'Authorization',
        'X-Cosmos-RU': '1.23',
      })
    );
  });

  // ─────────────────────────────────────────────────────────────
  // Cache headers
  // ─────────────────────────────────────────────────────────────

  describe('cache headers', () => {
    it('returns public cache headers for guest/anonymous requests', async () => {
      const response = await getFeed(createRequest(), mockContext);

      expect(response.headers['Cache-Control']).toBe('public, max-age=60, stale-while-revalidate=30');
      expect(response.headers['Vary']).toBe('Authorization');
    });

    it('returns private no-store cache headers for authenticated requests', async () => {
      const response = await getFeed(createRequest({ authorization: 'Bearer token' }), mockContext);

      expect(response.headers['Cache-Control']).toBe('private, no-store');
      expect(response.headers['Vary']).toBe('Authorization');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Query parameters
  // ─────────────────────────────────────────────────────────────

  describe('query parameters', () => {
    it('passes cursor parameter to service', async () => {
      await getFeed(createRequest(undefined, { cursor: 'my-cursor' }), mockContext);

      expect(mockedFeedService.getFeed).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: 'my-cursor' })
      );
    });

    it('passes since parameter to service', async () => {
      await getFeed(createRequest(undefined, { since: 'my-since' }), mockContext);

      expect(mockedFeedService.getFeed).toHaveBeenCalledWith(
        expect.objectContaining({ since: 'my-since' })
      );
    });

    it('passes limit parameter to service', async () => {
      await getFeed(createRequest(undefined, { limit: '25' }), mockContext);

      expect(mockedFeedService.getFeed).toHaveBeenCalledWith(
        expect.objectContaining({ limit: '25' })
      );
    });

    it('passes authorId parameter to service', async () => {
      await getFeed(createRequest(undefined, { authorId: 'author-123' }), mockContext);

      expect(mockedFeedService.getFeed).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: 'author-123' })
      );
    });

    it('handles multiple query parameters', async () => {
      await getFeed(
        createRequest(undefined, { cursor: 'c1', limit: '10', authorId: 'a1' }),
        mockContext
      );

      expect(mockedFeedService.getFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: 'c1',
          limit: '10',
          authorId: 'a1',
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Error handling
  // ─────────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('converts HttpError into client response', async () => {
      mockedFeedService.getFeed.mockRejectedValueOnce(new HttpError(400, 'bad cursor'));
      const response = await getFeed(createRequest(), mockContext);

      expect(response.status).toBe(400);
      expect(JSON.parse(response.body ?? '{}')).toEqual({ error: 'bad cursor' });
    });

    it('returns 400 for "cursor and since" conflict error', async () => {
      mockedFeedService.getFeed.mockRejectedValueOnce(
        new HttpError(400, 'Cannot use both cursor and since parameters')
      );
      const response = await getFeed(createRequest(), mockContext);

      expect(response.status).toBe(400);
      expect(JSON.parse(response.body ?? '{}')).toEqual({
        error: 'Cannot use both cursor and since parameters',
      });
    });

    it('returns 500 for unexpected errors', async () => {
      mockedFeedService.getFeed.mockRejectedValueOnce(new Error('Database connection failed'));
      const response = await getFeed(createRequest(), mockContext);

      expect(response.status).toBe(500);
      expect(mockContext.log).toHaveBeenCalledWith('feed.get.error', expect.any(Object));
    });
  });
});
