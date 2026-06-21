/**
 * ASORA RATE LIMITING UTILITIES
 *
 * 🎯 Purpose: Prevent API abuse and spam with configurable rate limits
 * 🔐 Security: Redis-based distributed rate limiting
 * 📊 Features: Sliding window, custom key generators, different limits per endpoint
 */

import { HttpRequest } from '@azure/functions';

export interface RateLimiterConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator: (req: HttpRequest) => string; // Function to generate rate limit key
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  blocked: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

// In-memory store for development (use Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(config: RateLimiterConfig) {
  return {
    async checkRateLimit(req: HttpRequest): Promise<RateLimitResult> {
      const key = config.keyGenerator(req);
      const now = Date.now();

      // Clean up expired entries
      const entries = Array.from(rateLimitStore.entries());
      for (const [storeKey, data] of entries) {
        if (data.resetTime < now) {
          rateLimitStore.delete(storeKey);
        }
      }

      // Get or create rate limit entry
      let entry = rateLimitStore.get(key);
      if (!entry || entry.resetTime < now) {
        entry = {
          count: 0,
          resetTime: now + config.windowMs,
        };
        rateLimitStore.set(key, entry);
      }

      // Increment counter
      entry.count++;

      const blocked = entry.count > config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - entry.count);

      return {
        blocked,
        limit: config.maxRequests,
        remaining,
        resetTime: entry.resetTime,
        totalHits: entry.count,
      };
    },
  };
}

/**
 * Default key generator using IP address
 */
export function defaultKeyGenerator(req: HttpRequest): string {
  return req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
}

/**
 * User-based key generator (requires authentication)
 */
export function userKeyGenerator(req: HttpRequest): string {
  const principalSub = (req as HttpRequest & { principal?: { sub?: string } }).principal?.sub;
  if (typeof principalSub === 'string' && principalSub.trim()) {
    return `user:${principalSub.trim()}`;
  }

  const verifiedUserId = (req as HttpRequest & { __verifiedUserId?: string }).__verifiedUserId;
  if (typeof verifiedUserId === 'string' && verifiedUserId.trim()) {
    return `user:${verifiedUserId.trim()}`;
  }

  return defaultKeyGenerator(req);
}

/**
 * Endpoint-specific key generator
 */
export function endpointKeyGenerator(endpoint: string) {
  return (req: HttpRequest): string => {
    const userKey = userKeyGenerator(req);
    return `${endpoint}:${userKey}`;
  };
}
