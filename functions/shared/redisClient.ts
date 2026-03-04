import Redis from 'ioredis';

let cachedClient: Redis | null = null;

const connectionStringEnv = 'REDIS_CONNECTION_STRING';

export function isRedisEnabled(): boolean {
  return Boolean(process.env[connectionStringEnv]);
}

export function getRedisClient(): Redis | null {
  if (!isRedisEnabled()) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  const connectionString = process.env[connectionStringEnv]!;

  cachedClient = new Redis(connectionString, {
    enableAutoPipelining: true,
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    retryStrategy: times => Math.min(times * 50, 500),
  });

  cachedClient.on('error', err => {
    console.error('[Redis] connection error', err);
  });

  return cachedClient;
}

export async function closeRedis(): Promise<void> {
  if (cachedClient) {
    await cachedClient.quit();
    cachedClient = null;
  }
}

export async function withRedis<T>(fn: (client: Redis) => Promise<T>): Promise<T | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  if (client.status === 'wait' || client.status === 'close') {
    await client.connect();
  }

  return fn(client);
}
