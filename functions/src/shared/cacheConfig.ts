/**
 * Feed caching configuration and feature flags
 */

export type FeedCacheBackend = 'edge' | 'redis' | 'none';

export interface CacheConfig {
  backend: FeedCacheBackend;
  ttlSeconds: number;
  enableTelemetry: boolean;
}

/**
 * Get cache configuration from environment variables
 */
export function getCacheConfig(): CacheConfig {
  const backend = (process.env.FEED_CACHE_BACKEND || 'edge') as FeedCacheBackend;

  // Validate backend option
  if (!['edge', 'redis', 'none'].includes(backend)) {
    throw new Error(`Invalid FEED_CACHE_BACKEND: ${backend}. Must be one of: edge, redis, none`);
  }

  // Set TTL based on backend - edge is faster with shorter TTL
  let ttlSeconds: number;
  switch (backend) {
    case 'edge':
      ttlSeconds = 30; // Short TTL for edge caching
      break;
    case 'redis':
      ttlSeconds = 300; // Longer TTL for Redis
      break;
    case 'none':
    default:
      ttlSeconds = 0; // No caching
      break;
  }

  return {
    backend,
    ttlSeconds,
    enableTelemetry: true,
  };
}

/**
 * Check if Redis caching is enabled
 */
export function isRedisCacheEnabled(): boolean {
  return getCacheConfig().backend === 'redis';
}

/**
 * Check if edge caching is enabled
 */
export function isEdgeCacheEnabled(): boolean {
  return getCacheConfig().backend === 'edge';
}

/**
 * Check if any caching is enabled
 */
export function isCacheEnabled(): boolean {
  const backend = getCacheConfig().backend;
  return backend !== 'none';
}

/**
 * Check if telemetry should be collected based on request
 */
export function shouldCollectTelemetry(request: any): boolean {
  // Check for telemetry=1 query parameter (supports Request.url or test helper request.query)
  try {
    if (request?.url) {
      const url = new URL(request.url);
      if (url.searchParams.get('telemetry') === '1') return true;
      if (url.searchParams.get('telemetry') === '0') return false;
    }
  } catch {}

  if (request?.query) {
    const q = request.query as Record<string, string>;
    if (q.telemetry === '1') return true;
    if (q.telemetry === '0') return false;
  }

  // Check for x-debug-telemetry header. Accept either Request.headers.get or plain object headers
  const headersObj: any = request?.headers || {};
  const headerVal =
    typeof headersObj.get === 'function'
      ? headersObj.get('x-debug-telemetry')
      : headersObj['x-debug-telemetry'] || headersObj['X-Debug-Telemetry'];

  if (headerVal) {
    const secret = process.env.EDGE_TELEMETRY_SECRET;
    // Allow explicit '1' or matching secret
    if (headerVal === '1') return true;
    if (secret && headerVal === secret) return true;
    // Wrong secret should not enable telemetry
    return false;
  }

  return false;
}
