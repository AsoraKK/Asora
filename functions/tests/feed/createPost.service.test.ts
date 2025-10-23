import type { InvocationContext } from '@azure/functions';

import { createPost, __resetPostRateLimiterForTests } from '@feed/service/feedService';
import * as redisClient from '@shared/clients/redis';
import { HttpError } from '@shared/utils/errors';

jest.mock('@shared/clients/redis', () => ({
  isRedisEnabled: jest.fn(),
  withRedis: jest.fn(),
}));

const mockedRedis = redisClient as jest.Mocked<typeof redisClient>;

const userPrincipal = { kind: 'user', id: 'user-123' } as const;

function mockContext(): InvocationContext {
  return {
    invocationId: 'test',
    log: jest.fn(),
  } as unknown as InvocationContext;
}

describe('feed service createPost', () => {
  beforeEach(() => {
    mockedRedis.isRedisEnabled.mockReturnValue(false);
    mockedRedis.withRedis.mockResolvedValue(null as any);
    delete process.env.POST_RATE_LIMIT_PER_MINUTE;
    __resetPostRateLimiterForTests();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a post and primes the cache when Redis is enabled', async () => {
    mockedRedis.isRedisEnabled.mockReturnValue(true);

    const pipelineExec = jest.fn().mockResolvedValueOnce([[null, 'OK']]);
    mockedRedis.withRedis.mockImplementation(async (callback: (client: any) => Promise<any>) => {
      const pipeline = {
        zadd: jest.fn().mockReturnThis(),
        zremrangebyrank: jest.fn().mockReturnThis(),
        hincrby: jest.fn().mockReturnThis(),
        exec: pipelineExec,
      };

      const fakeRedis = {
        incr: jest.fn().mockResolvedValueOnce(1),
        expire: jest.fn().mockResolvedValueOnce(1),
        multi: jest.fn().mockReturnValue(pipeline),
      } as any;

      await callback(fakeRedis);
      return null;
    });

    const result = await createPost({
      principal: userPrincipal,
      payload: { text: 'Hello world', authorId: 'user-123' },
      context: mockContext(),
    });

    expect(result.body.status).toBe('success');
    expect(result.body.post.text).toBe('Hello world');
    expect(result.headers['X-Cache-Primed']).toBe('true');
    expect(result.headers['X-Redis-Status']).toBe('connected');
    expect(mockedRedis.isRedisEnabled).toHaveBeenCalled();
    expect(mockedRedis.withRedis).toHaveBeenCalledTimes(1);
    expect(pipelineExec).toHaveBeenCalledTimes(1);
  });

  it('enforces rate limiting even when redis is disabled', async () => {
    mockedRedis.isRedisEnabled.mockReturnValue(false);
    mockedRedis.withRedis.mockResolvedValue(null as any);
    process.env.POST_RATE_LIMIT_PER_MINUTE = '1';

    await createPost({
      principal: userPrincipal,
      payload: { text: 'One' },
      context: mockContext(),
    });

    await expect(
      createPost({
        principal: userPrincipal,
        payload: { text: 'Two' },
        context: mockContext(),
      })
    ).rejects.toMatchObject({
      status: 429,
      headers: expect.objectContaining({
        'Retry-After': expect.any(String),
      }),
    });
  });

  it('validates required text field', async () => {
    mockedRedis.isRedisEnabled.mockReturnValue(false);
    mockedRedis.withRedis.mockResolvedValue(null as any);

    await expect(
      createPost({
        principal: userPrincipal,
        payload: { text: '   ' },
        context: mockContext(),
      })
    ).rejects.toBeInstanceOf(HttpError);
  });
});
