/// ASORA SHARED HTTP UTILITIES
///
/// 🎯 Purpose: Common HTTP response helpers for Azure Functions
/// 🏗️ Architecture: Shared utilities for consistent API responses
/// 🔐 Security: CORS headers, security headers, error sanitization
/// 📡 Network: Standard HTTP status codes and response formats

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
  requestId?: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  timestamp: string;
  requestId?: string;
}

interface SuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
  requestId?: string;
}

/**
 * Create a successful HTTP response with proper headers
 */
export function createSuccessResponse<T>(
  data: T,
  additionalHeaders: Record<string, string> = {},
  statusCode: number = 200
) {
  const response: SuccessResponse<T> = {
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
export function createErrorResponse(
  statusCode: number,
  message: string,
  error?: string,
  additionalHeaders: Record<string, string> = {}
) {
  const response: ErrorResponse = {
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
export function createCorsResponse() {
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
export function handleCorsAndMethod(
  method: string, 
  allowedMethods: string[]
): { shouldReturn: boolean; response?: any } {
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
export function extractAuthToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Rate limiting helper (simple in-memory store)
 * In production, use Redis or similar distributed cache
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60 * 1000 // 1 minute
): { allowed: boolean; remainingRequests: number; resetTime: number } {
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
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up rate limit store every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
