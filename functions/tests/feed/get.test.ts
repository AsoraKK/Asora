import { HttpRequest, InvocationContext } from '@azure/functions';
import { getFeed } from '@feed/routes/getFeed';
import * as redisClient from '@shared/clients/redis';

jest.mock('@shared/clients/redis', () => ({
  isRedisEnabled: jest.fn(),
  withRedis: jest.fn(),
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

const mockedRedis = redisClient as jest.Mocked<typeof redisClient>;

// Mock the InvocationContext
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

// Mock HttpRequest
const mockRequest = {
  method: 'GET',
  url: 'https://test.com/api/feed',
  headers: new Headers(),
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

describe('Feed GET Handler', () => {
  beforeEach(() => {
    mockedRedis.isRedisEnabled.mockReturnValue(false);
    mockedRedis.withRedis.mockResolvedValue(null as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 with feed data structure', async () => {
    const response = await getFeed(mockRequest, mockContext);

    expect(response.status).toBe(200);
    const headers = response.headers as Record<string, string> | undefined;
    expect(headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        Vary: 'Authorization',
        'X-Cache-Status': 'disabled',
        'X-Redis-Status': 'disabled',
        'X-RU-Estimate': '1',
      })
    );
    expect(headers?.['X-Request-Duration']).toBeDefined();
    const body = JSON.parse(response.body ?? '{}');
    expect(body).toMatchObject({
      status: 'ok',
      service: 'asora-function-dev',
      ts: expect.any(String),
      data: {
        posts: expect.any(Array),
        pagination: {
          page: expect.any(Number),
          limit: expect.any(Number),
          total: expect.any(Number),
          hasMore: expect.any(Boolean),
        },
      },
    });
  });

  it('should log the request', async () => {
    await getFeed(mockRequest, mockContext);

    expect(mockContext.log).toHaveBeenCalledWith('feed.get.start', { principal: 'guest' });
  });

  it('should surface redis failures via headers without crashing', async () => {
    mockedRedis.isRedisEnabled.mockReturnValue(true);
    mockedRedis.withRedis.mockImplementationOnce(async () => {
      throw new Error('redis boom');
    });

    const response = await getFeed(mockRequest, mockContext);

    expect(response.status).toBe(200);
    const headers = response.headers as Record<string, string> | undefined;
    expect(headers).toEqual(
      expect.objectContaining({
        'X-Redis-Status': 'error',
        'X-Cache-Status': 'miss',
      })
    );
  });

  it('should return cached posts when redis returns data', async () => {
    mockedRedis.isRedisEnabled.mockReturnValue(true);
    mockedRedis.withRedis.mockImplementation(async (fn: any) => {
      const redisMock = {
        zrevrange: jest.fn().mockResolvedValue([
          JSON.stringify({ id: 'p1', title: 'Cached' }),
          '{"id"', // malformed to trigger parse guard
        ]),
      };
      await fn(redisMock);
      return null;
    });

    const response = await getFeed(mockRequest, mockContext);
    const headers = response.headers as Record<string, string> | undefined;
    expect(headers).toEqual(
      expect.objectContaining({
        'X-Cache-Status': 'hit',
        'X-Redis-Status': 'connected',
        'X-RU-Estimate': '0',
      })
    );
    const body = JSON.parse(response.body ?? '{}');
    expect(body.data.posts).toEqual([{ id: 'p1', title: 'Cached' }]);
  });

  it('should use private cache headers when Authorization header is present', async () => {
    const authRequest = {
      ...mockRequest,
      headers: new Headers({ authorization: 'Bearer valid-token' }),
    } as unknown as HttpRequest;

    const response = await getFeed(authRequest, mockContext);
    const headers = response.headers as Record<string, string> | undefined;
    expect(headers?.['Cache-Control']).toBe('private, no-store');
    expect(headers?.['X-Cache-Status']).toBe('disabled');
  });

  it('should return 500 when unexpected error occurs', async () => {
    const failingRequest = {
      ...mockRequest,
      headers: {
        has: () => {
          throw new Error('header failure');
        },
      },
    } as any;

    const response = await getFeed(failingRequest, mockContext);

    expect(response.status).toBe(500);
    const body = JSON.parse(response.body ?? '{}');
    expect(body.error).toBe('internal');
  });
});
