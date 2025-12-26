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
const ALLOWED_ORIGINS = new Set([
  'https://control.asora.co.za',
  // Development origins
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]);

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin);
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
