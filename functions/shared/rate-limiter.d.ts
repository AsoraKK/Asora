/**
 * ASORA RATE LIMITING UTILITIES
 *
 * 🎯 Purpose: Prevent API abuse and spam with configurable rate limits
 * 🔐 Security: Redis-based distributed rate limiting
 * 📊 Features: Sliding window, custom key generators, different limits per endpoint
 */
import { HttpRequest } from '@azure/functions';
export interface RateLimiterConfig {
    windowMs: number;
    maxRequests: number;
    keyGenerator: (req: HttpRequest) => string;
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
export declare function createRateLimiter(config: RateLimiterConfig): {
    checkRateLimit(req: HttpRequest): Promise<RateLimitResult>;
};
/**
 * Default key generator using IP address
 */
export declare function defaultKeyGenerator(req: HttpRequest): string;
/**
 * User-based key generator (requires authentication)
 */
export declare function userKeyGenerator(req: HttpRequest): string;
/**
 * Endpoint-specific key generator
 */
export declare function endpointKeyGenerator(endpoint: string): (req: HttpRequest) => string;
//# sourceMappingURL=rate-limiter.d.ts.map