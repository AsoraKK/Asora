/**
 * Admin API CORS Configuration
 * 
 * Handles CORS for cross-origin requests from control.asora.co.za
 */

import { HttpResponseInit } from '@azure/functions';

/**
 * Allowed origins for admin API
 * Control panel on different subdomain requires CORS
 */
export const ALLOWED_ORIGINS = [
  'https://control.asora.co.za',
  // Development origins
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

const ALLOWED_ORIGINS_SET = new Set(ALLOWED_ORIGINS);

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
  const allowedOrigin = isOriginAllowed(origin) ? origin! : 'https://control.asora.co.za';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cf-Access-Jwt-Assertion, X-Correlation-ID',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
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
