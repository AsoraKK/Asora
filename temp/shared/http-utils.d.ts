/**
 * Create a successful HTTP response with proper headers
 */
export declare function createSuccessResponse<T>(data: T, additionalHeaders?: Record<string, string>, statusCode?: number): {
    status: number;
    headers: {
        'Content-Type': string;
        'Access-Control-Allow-Origin': string;
        'Access-Control-Allow-Methods': string;
        'Access-Control-Allow-Headers': string;
        'Access-Control-Max-Age': string;
        'X-Content-Type-Options': string;
        'X-Frame-Options': string;
        'X-XSS-Protection': string;
    };
    body: string;
};
/**
 * Create an error HTTP response with proper headers and sanitization
 */
export declare function createErrorResponse(statusCode: number, message: string, error?: string, additionalHeaders?: Record<string, string>): {
    status: number;
    headers: {
        'Content-Type': string;
        'Access-Control-Allow-Origin': string;
        'Access-Control-Allow-Methods': string;
        'Access-Control-Allow-Headers': string;
        'Access-Control-Max-Age': string;
        'X-Content-Type-Options': string;
        'X-Frame-Options': string;
        'X-XSS-Protection': string;
    };
    body: string;
};
/**
 * Handle CORS preflight requests
 */
export declare function createCorsResponse(): {
    status: number;
    headers: {
        'Access-Control-Allow-Origin': string;
        'Access-Control-Allow-Methods': string;
        'Access-Control-Allow-Headers': string;
        'Access-Control-Max-Age': string;
        'Content-Length': string;
    };
    body: string;
};
/**
 * Validate request method and handle OPTIONS
 */
export declare function handleCorsAndMethod(method: string, allowedMethods: string[]): {
    shouldReturn: boolean;
    response?: any;
};
/**
 * Extract and validate authorization token
 */
export declare function extractAuthToken(authHeader?: string): string | null;
export declare function checkRateLimit(identifier: string, maxRequests?: number, windowMs?: number): {
    allowed: boolean;
    remainingRequests: number;
    resetTime: number;
};
/**
 * Clean up expired rate limit entries (call periodically)
 */
export declare function cleanupRateLimitStore(): void;
//# sourceMappingURL=http-utils.d.ts.map