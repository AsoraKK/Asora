import { HttpRequest, InvocationContext } from '@azure/functions';

import { createPost, __resetPostRateLimiterForTests } from '../create';
import * as redisClient from '../../../shared/redisClient';

let isRedisEnabledSpy: jest.SpyInstance<boolean, []>;
let withRedisSpy: jest.SpyInstance<Promise<unknown> | null, any[]>;

function mockContext(): InvocationContext {
  return {
    invocationId: 'test',
    log: jest.fn(),
  } as unknown as InvocationContext;
}

function requestWithBody(body: unknown): HttpRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: new Map<string, string>(),
  } as unknown as HttpRequest;
}

describe('createPost', () => {
  beforeEach(() => {
    isRedisEnabledSpy = jest.spyOn(redisClient, 'isRedisEnabled').mockReturnValue(false);
    withRedisSpy = jest.spyOn(redisClient, 'withRedis').mockResolvedValue(null);
    delete process.env.POST_RATE_LIMIT_PER_MINUTE;
    __resetPostRateLimiterForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a post and primes the cache when Redis is enabled', async () => {
    isRedisEnabledSpy.mockReturnValue(true);

    const pipelineExec = jest.fn().mockResolvedValueOnce([[null, 'OK']]);
    withRedisSpy.mockImplementation(async (callback: (client: any) => Promise<any>) => {
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

    const req = requestWithBody({ text: 'Hello world', authorId: 'user-123' });
    const res = await createPost(req, mockContext());

    expect(res.status).toBe(201);
    const headers = res.headers as Record<string, string> | undefined;
    expect(headers?.['X-Cache-Primed']).toBe('true');
    expect(headers?.['X-Redis-Status']).toBe('connected');
    expect(headers?.['X-RateLimit-Limit']).toBe('900');
    expect(isRedisEnabledSpy).toHaveBeenCalled();
    expect(withRedisSpy).toHaveBeenCalledTimes(1);
    expect(pipelineExec).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid json payload', async () => {
    isRedisEnabledSpy.mockReturnValue(false);
    withRedisSpy.mockResolvedValue(null);

    const req = {
      json: jest.fn().mockRejectedValue(new Error('nope')),
      headers: new Map<string, string>(),
    } as unknown as HttpRequest;

    const res = await createPost(req, mockContext());

    expect(res.status).toBe(400);
    expect(res.jsonBody).toMatchObject({ status: 'error' });
  });

  it('enforces rate limiting even when redis is disabled', async () => {
    isRedisEnabledSpy.mockReturnValue(false);
    withRedisSpy.mockResolvedValue(null);
    process.env.POST_RATE_LIMIT_PER_MINUTE = '1';

    const first = await createPost(requestWithBody({ text: 'One' }), mockContext());
    const second = await createPost(requestWithBody({ text: 'Two' }), mockContext());

    expect(first.status).toBe(201);
    expect(second.status).toBe(429);
    const headers = second.headers as Record<string, string> | undefined;
    expect(headers?.['Retry-After']).toBeDefined();
    expect(headers?.['X-RateLimit-Remaining']).toBe('0');
  });

  it('validates required text field', async () => {
    isRedisEnabledSpy.mockReturnValue(false);
    withRedisSpy.mockResolvedValue(null);

    const res = await createPost(requestWithBody({ text: '   ' }), mockContext());

    expect(res.status).toBe(400);
    expect(res.jsonBody).toMatchObject({ message: expect.stringContaining('Field "text" is required') });
  });
});
