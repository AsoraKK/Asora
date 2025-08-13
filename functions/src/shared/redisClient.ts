/**
 * Redis client for Asora platform caching
 *
 * Uses ioredis with TLS support for Azure Redis Cache integration.
 * Handles connection management, error handling, and provides
 * utilities for feed caching with appropriate TTL strategies.
 */

import Redis from 'ioredis';

export interface CacheEntry<T> {
  data: T;
  cachedAt: string;
  ttlSeconds: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  totalRequests: number;
}

// Global Redis client instance
let redisClient: Redis | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
const CONNECTION_RETRY_DELAY = 2000; // 2 seconds

// Cache metrics for telemetry
const cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  errors: 0,
  totalRequests: 0,
};

/**
 * Initialize Redis client with Azure-compatible configuration
 */
function createRedisClient(): Redis | null {
  const connectionString = process.env.REDIS_CONNECTION_STRING;

  if (!connectionString) {
    console.warn('REDIS_CONNECTION_STRING not configured. Caching will be disabled.');
    return null;
  }

  try {
    // Parse Redis connection string: rediss://:password@hostname:port
    const redisUrl = new URL(connectionString);

    const client = new Redis({
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port) || 6380,
      password: redisUrl.password,
      tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      commandTimeout: 5000,
      lazyConnect: true,
      // Retry strategy
      retryStrategy: times => {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 50, 2000); // Exponential backoff with cap
      },
    });

    client.on('connect', () => {
      console.log('Redis client connected successfully');
      connectionAttempts = 0;
    });

    client.on('error', err => {
      console.error('Redis client error:', err.message);
      cacheMetrics.errors++;
    });

    client.on('close', () => {
      console.warn('Redis connection closed');
    });

    return client;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
}

/**
 * Get Redis client instance with connection management
 */
export async function getRedisClient(): Promise<Redis | null> {
  if (!redisClient) {
    redisClient = createRedisClient();
  }

  if (!redisClient) {
    return null;
  }

  try {
    // Check if client is connected
    if (redisClient.status !== 'ready') {
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        console.error(
          `Max Redis connection attempts (${MAX_CONNECTION_ATTEMPTS}) reached. Disabling cache.`
        );
        return null;
      }

      connectionAttempts++;
      console.log(`Attempting to connect to Redis (attempt ${connectionAttempts})`);
      await redisClient.connect();
    }

    return redisClient;
  } catch (error) {
    console.error('Redis connection failed:', error);
    cacheMetrics.errors++;

    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
      console.error('Disabling Redis cache due to connection failures');
      redisClient = null;
    }

    return null;
  }
}

/**
 * Store data in cache with TTL
 */
export async function setCache<T>(key: string, data: T, ttlSeconds: number = 30): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    const cacheEntry: CacheEntry<T> = {
      data,
      cachedAt: new Date().toISOString(),
      ttlSeconds,
    };

    const serialized = JSON.stringify(cacheEntry);
    const result = await client.setex(key, ttlSeconds, serialized);

    return result === 'OK';
  } catch (error) {
    console.error(`Redis setCache error for key ${key}:`, error);
    cacheMetrics.errors++;
    return false;
  }
}

/**
 * Retrieve data from cache
 */
export async function getCache<T>(key: string): Promise<{
  data: T | null;
  hit: boolean;
  cachedAt?: string;
  remainingTtl?: number;
}> {
  cacheMetrics.totalRequests++;

  const client = await getRedisClient();
  if (!client) {
    cacheMetrics.misses++;
    return { data: null, hit: false };
  }

  try {
    const [cached, ttl] = await Promise.all([client.get(key), client.ttl(key)]);

    if (!cached) {
      cacheMetrics.misses++;
      return { data: null, hit: false };
    }

    const cacheEntry: CacheEntry<T> = JSON.parse(cached);
    cacheMetrics.hits++;

    return {
      data: cacheEntry.data,
      hit: true,
      cachedAt: cacheEntry.cachedAt,
      remainingTtl: ttl > 0 ? ttl : undefined,
    };
  } catch (error) {
    console.error(`Redis getCache error for key ${key}:`, error);
    cacheMetrics.errors++;
    cacheMetrics.misses++;
    return { data: null, hit: false };
  }
}

/**
 * Delete cache entry
 */
export async function deleteCache(key: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    const result = await client.del(key);
    return result > 0;
  } catch (error) {
    console.error(`Redis deleteCache error for key ${key}:`, error);
    cacheMetrics.errors++;
    return false;
  }
}

/**
 * Generate cache key for anonymous feed
 */
export function generateFeedCacheKey(page: number, pageSize: number): string {
  return `feed:anon:v1:page=${page}:size=${pageSize}`;
}

/**
 * Get cache metrics for telemetry
 */
export function getCacheMetrics(): CacheMetrics {
  return { ...cacheMetrics };
}

/**
 * Reset cache metrics (useful for testing)
 */
export function resetCacheMetrics(): void {
  cacheMetrics.hits = 0;
  cacheMetrics.misses = 0;
  cacheMetrics.errors = 0;
  cacheMetrics.totalRequests = 0;
}

/**
 * Close Redis connection (cleanup)
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      console.log('Redis connection closed cleanly');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}
