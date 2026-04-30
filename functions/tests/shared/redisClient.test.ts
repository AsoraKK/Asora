import type Redis from 'ioredis';

const mockRedisInstances: Array<{
  connectionString: string;
  options: Record<string, unknown>;
  instance: {
    status: string;
    connect: jest.Mock;
    quit: jest.Mock;
    on: jest.Mock;
  };
}> = [];

const MockRedis = jest.fn().mockImplementation((connectionString: string, options: Record<string, unknown>) => {
  const instance = {
    status: 'ready',
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };

  mockRedisInstances.push({ connectionString, options, instance });
  return instance;
});

jest.mock('ioredis', () => ({
  __esModule: true,
  default: MockRedis,
}));

function loadRedisModule() {
  return require('../../shared/redisClient') as typeof import('../../shared/redisClient');
}

describe('redisClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisInstances.length = 0;
    delete process.env.REDIS_CONNECTION_STRING;
    jest.resetModules();
  });

  it('returns null when Redis is disabled', async () => {
    const redis = loadRedisModule();

    expect(redis.isRedisEnabled()).toBe(false);
    expect(redis.getRedisClient()).toBeNull();
    await expect(redis.withRedis(async () => 'value')).resolves.toBeNull();
  });

  it('creates and caches a Redis client when enabled', () => {
    process.env.REDIS_CONNECTION_STRING = 'redis://localhost:6379';

    const redis = loadRedisModule();
    const first = redis.getRedisClient();
    const second = redis.getRedisClient();

    expect(first).toBe(second);
    expect(MockRedis).toHaveBeenCalledTimes(1);
    expect(mockRedisInstances[0].connectionString).toBe('redis://localhost:6379');
    expect(mockRedisInstances[0].options).toMatchObject({
      enableAutoPipelining: true,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    expect(mockRedisInstances[0].instance.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('connects lazily when status is wait and forwards the client to the callback', async () => {
    process.env.REDIS_CONNECTION_STRING = 'redis://localhost:6379';

    const redis = loadRedisModule();
    const client = redis.getRedisClient() as unknown as ReturnType<typeof MockRedis>;
    const instance = mockRedisInstances[0].instance;
    instance.status = 'wait';

    const result = await redis.withRedis(async activeClient => {
      expect(activeClient).toBe(client as unknown as Redis);
      return 'cache-hit';
    });

    expect(instance.connect).toHaveBeenCalledTimes(1);
    expect(result).toBe('cache-hit');
  });

  it('closes and recreates the client after closeRedis', async () => {
    process.env.REDIS_CONNECTION_STRING = 'redis://localhost:6379';

    const redis = loadRedisModule();
    const first = redis.getRedisClient();
    expect(first).not.toBeNull();

    await redis.closeRedis();
    const second = redis.getRedisClient();

    expect(mockRedisInstances[0].instance.quit).toHaveBeenCalledTimes(1);
    expect(second).not.toBe(first);
    expect(MockRedis).toHaveBeenCalledTimes(2);
  });
});