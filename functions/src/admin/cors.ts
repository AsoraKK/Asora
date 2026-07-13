/**
 * Admin API CORS Configuration
 * 
 * Handles CORS for exact Lythaus administration origins.
 */

import { HttpResponseInit } from '@azure/functions';

/**
 * Allowed origins for admin API
 * Control panel on different subdomain requires CORS
 */
export const ALLOWED_ORIGINS = [
  'https://admin.lythaus.co',
  'https://admin.staging.lythaus.co',
  // Development origins
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

const ALLOWED_ORIGINS_SET = new Set(ALLOWED_ORIGINS);

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cache-Control': 'no-store, no-cache, private',
};

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS_SET.has(origin);
}

/**
 * Get CORS headers for admin API responses
 */
export function getAdminCorsHeaders(origin: string | null | undefined): Record<string, string> {
  return {
    ...(isOriginAllowed(origin)
      ? {
          'Access-Control-Allow-Origin': origin!,
          'Access-Control-Allow-Credentials': 'true',
        }
      : {}),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cf-Access-Jwt-Assertion, X-Correlation-ID',
    'Access-Control-Max-Age': '86400',
    ...SECURITY_HEADERS,
  };
}

/**
 * Create CORS preflight response for OPTIONS requests
 */
export function createCorsPreflightResponse(origin: string | null | undefined): HttpResponseInit {
  return {
    status: 204,
    headers: {
      ...getAdminCorsHeaders(origin),
      'Content-Length': '0',
    },
  };
}

/**
 * Add CORS headers to an existing response
 */
export function withCorsHeaders(
  response: HttpResponseInit,
  origin: string | null | undefined
): HttpResponseInit {
  const corsHeaders = getAdminCorsHeaders(origin);

  return {
    ...response,
    headers: {
      ...(response.headers as Record<string, string> | undefined),
      ...corsHeaders,
    },
  };
}

/**
 * Generate CORS headers for a given origin
 * Exported for testing
 */
export function corsHeaders(origin: string): Record<string, string> {
  return getAdminCorsHeaders(origin);
}

/**
 * Handle CORS preflight or return null to proceed with normal handling
 * 
 * @param method - HTTP method
 * @param origin - Origin header value
 * @returns Response for OPTIONS, null for other methods to proceed, or 403 for disallowed origins
 */
export function handleCors(
  method: string,
  origin: string | null | undefined
): HttpResponseInit | null {
  // Only handle OPTIONS preflight
  if (method !== 'OPTIONS') {
    return null;
  }

  // Check if origin is allowed
  if (!isOriginAllowed(origin)) {
    return {
      status: 403,
      body: 'CORS origin not allowed',
    };
  }

  // Return preflight response
  return createCorsPreflightResponse(origin);
}
