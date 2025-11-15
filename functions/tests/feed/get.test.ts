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

function createRequest(headers?: Record<string, string> | Headers): HttpRequest {
  const baseRequest = {
    method: 'GET',
    url: 'https://test.com/api/feed',
    headers: new Headers(headers),
    query: new URLSearchParams(),
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
    nextCursor: null,
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

  it('returns wrapped feed data with the merged headers', async () => {
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
        'Cache-Control': 'public, max-age=60',
        Vary: 'Authorization',
        'X-Cosmos-RU': '1.23',
      })
    );
  });

  it('returns private caching headers for authenticated callers', async () => {
    const authResponse = await getFeed(createRequest({ authorization: 'Bearer token' }), mockContext);
    expect(authResponse.headers['Cache-Control']).toBe('private, no-store');
  });

  it('converts HttpError into a client response', async () => {
    mockedFeedService.getFeed.mockRejectedValueOnce(new HttpError(400, 'bad cursor'));
    const response = await getFeed(createRequest(), mockContext);
    expect(response.status).toBe(400);
    expect(JSON.parse(response.body ?? '{}')).toEqual({ error: 'bad cursor' });
  });
});
