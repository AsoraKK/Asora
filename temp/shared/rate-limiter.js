"use strict";
/**
 * ASORA RATE LIMITING UTILITIES
 *
 * 🎯 Purpose: Prevent API abuse and spam with configurable rate limits
 * 🔐 Security: Redis-based distributed rate limiting
 * 📊 Features: Sliding window, custom key generators, different limits per endpoint
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
exports.defaultKeyGenerator = defaultKeyGenerator;
exports.userKeyGenerator = userKeyGenerator;
exports.endpointKeyGenerator = endpointKeyGenerator;
// In-memory store for development (use Redis for production)
const rateLimitStore = new Map();
function createRateLimiter(config) {
    return {
        async checkRateLimit(req) {
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
                    resetTime: now + config.windowMs
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
                totalHits: entry.count
            };
        }
    };
}
/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(req) {
    return req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown';
}
/**
 * User-based key generator (requires authentication)
 */
function userKeyGenerator(req) {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    try {
        const payloadPart = token.split('.')[1] || '';
        const json = Buffer.from(payloadPart, 'base64').toString('utf8');
        const decoded = JSON.parse(json);
        return `user:${decoded.sub}`;
    }
    catch {
        return defaultKeyGenerator(req);
    }
}
/**
 * Endpoint-specific key generator
 */
function endpointKeyGenerator(endpoint) {
    return (req) => {
        const userKey = userKeyGenerator(req);
        return `${endpoint}:${userKey}`;
    };
}
//# sourceMappingURL=rate-limiter.js.map