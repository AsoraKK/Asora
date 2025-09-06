"use strict";
/// ASORA SHARED HTTP UTILITIES
///
/// 🎯 Purpose: Common HTTP response helpers for Azure Functions
/// 🏗️ Architecture: Shared utilities for consistent API responses
/// 🔐 Security: CORS headers, security headers, error sanitization
/// 📡 Network: Standard HTTP status codes and response formats
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuccessResponse = createSuccessResponse;
exports.createErrorResponse = createErrorResponse;
exports.createCorsResponse = createCorsResponse;
exports.handleCorsAndMethod = handleCorsAndMethod;
exports.extractAuthToken = extractAuthToken;
exports.checkRateLimit = checkRateLimit;
exports.cleanupRateLimitStore = cleanupRateLimitStore;
/**
 * Create a successful HTTP response with proper headers
 */
function createSuccessResponse(data, additionalHeaders = {}, statusCode = 200) {
    const response = {
        success: true,
        data,
        timestamp: new Date().toISOString()
    };
    return {
        status: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Max-Age': '86400',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            ...additionalHeaders
        },
        body: JSON.stringify(response)
    };
}
/**
 * Create an error HTTP response with proper headers and sanitization
 */
function createErrorResponse(statusCode, message, error, additionalHeaders = {}) {
    const response = {
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? error : undefined,
        timestamp: new Date().toISOString()
    };
    return {
        status: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Max-Age': '86400',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            ...additionalHeaders
        },
        body: JSON.stringify(response)
    };
}
/**
 * Handle CORS preflight requests
 */
function createCorsResponse() {
    return {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Max-Age': '86400',
            'Content-Length': '0'
        },
        body: ''
    };
}
/**
 * Validate request method and handle OPTIONS
 */
function handleCorsAndMethod(method, allowedMethods) {
    // Handle CORS preflight
    if (method === 'OPTIONS') {
        return {
            shouldReturn: true,
            response: createCorsResponse()
        };
    }
    // Check if method is allowed
    if (!allowedMethods.includes(method)) {
        return {
            shouldReturn: true,
            response: createErrorResponse(405, `Method ${method} not allowed`)
        };
    }
    return { shouldReturn: false };
}
/**
 * Extract and validate authorization token
 */
function extractAuthToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
}
/**
 * Rate limiting helper (simple in-memory store)
 * In production, use Redis or similar distributed cache
 */
const rateLimitStore = new Map();
function checkRateLimit(identifier, maxRequests = 100, windowMs = 60 * 1000 // 1 minute
) {
    const now = Date.now();
    const window = rateLimitStore.get(identifier);
    if (!window || now > window.resetTime) {
        // New window or expired window
        const resetTime = now + windowMs;
        rateLimitStore.set(identifier, { count: 1, resetTime });
        return {
            allowed: true,
            remainingRequests: maxRequests - 1,
            resetTime
        };
    }
    if (window.count >= maxRequests) {
        return {
            allowed: false,
            remainingRequests: 0,
            resetTime: window.resetTime
        };
    }
    window.count++;
    return {
        allowed: true,
        remainingRequests: maxRequests - window.count,
        resetTime: window.resetTime
    };
}
/**
 * Clean up expired rate limit entries (call periodically)
 */
function cleanupRateLimitStore() {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
        if (now > value.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}
// Clean up rate limit store every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
//# sourceMappingURL=http-utils.js.map