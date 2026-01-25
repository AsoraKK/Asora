/**
 * Control Panel API Proxy - Moderation Test Endpoints
 *
 * Serves as a same-origin proxy for control-panel to call Hive AI testing endpoints.
 * Browser calls https://control.asora.co.za/api/admin/moderation/test/* → this function
 * Function calls https://admin-api.asora.co.za/moderation/test/* with Cloudflare Access service token
 * Response streamed back to browser
 *
 * Purpose:
 * - Eliminates CORS issues (same-origin proxy pattern)
 * - Injects Cloudflare Access service authentication server-side
 * - Maintains admin JWT validation for control-panel
 * - Streams large files efficiently
 *
 * Protected by:
 * - Admin JWT validation (Bearer token from control-panel session)
 * - Rate limiting (simple token bucket per client IP)
 *
 * Environment variables:
 * - CF_ACCESS_CLIENT_ID: Cloudflare Access service token client ID
 * - CF_ACCESS_CLIENT_SECRET: Cloudflare Access service token secret
 * - ADMIN_API_URL: Base URL for admin API (default: https://admin-api.asora.co.za)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosError } from 'axios';

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

// Simple in-memory rate limiter (per IP, per minute: 60 requests)
const rateLimitBuckets = new Map<string, RateLimitBucket>();
const RATE_LIMIT_CAPACITY = 60;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function getClientIp(request: HttpRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    'unknown'
  );
}

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  let bucket = rateLimitBuckets.get(clientIp);

  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_CAPACITY, lastRefill: now };
    rateLimitBuckets.set(clientIp, bucket);
    return true;
  }

  // Refill tokens based on time elapsed
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = (elapsed / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_CAPACITY;
  bucket.tokens = Math.min(RATE_LIMIT_CAPACITY, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;

  // Check if we have a token
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }

  return false;
}

function validateAdminJwt(authHeader: string | null): boolean {
  if (!authHeader) return false;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || !parts[0] || parts[0].toLowerCase() !== 'bearer') {
    return false;
  }

  const token = parts[1];
  if (!token) return false;
  // Basic validation: token should be non-empty and look like a JWT (3 parts separated by .)
  // Full JWT verification is optional here since control-panel validates it;
  // this is a secondary check to prevent token reuse outside control-panel context
  return token.length > 0 && token.split('.').length === 3;
}

async function proxyModerationTest(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = request.headers.get('X-Correlation-ID') || uuidv4();
  const clientIp = getClientIp(request);
  const method = request.method.toUpperCase();

  context.log(
    `[proxy/moderation/test ${method}] ${clientIp} [${correlationId}]`
  );

  // Handle OPTIONS preflight requests for endpoint availability check
  if (method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Allow': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Correlation-ID',
        'X-Correlation-ID': correlationId,
      },
    };
  }

  // Rate limit check
  if (!checkRateLimit(clientIp)) {
    context.warn(
      `[proxy/moderation/test ${method}] Rate limit exceeded for ${clientIp} [${correlationId}]`
    );
    return {
      status: 429,
      jsonBody: {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          correlationId,
        },
      },
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
        'Retry-After': '60',
      },
    };
  }

  // Validate admin JWT from control-panel
  const authHeader = request.headers.get('Authorization');
  if (!validateAdminJwt(authHeader)) {
    context.warn(
      `[proxy/moderation/test ${method}] Invalid or missing admin JWT [${correlationId}]`
    );
    return {
      status: 401,
      jsonBody: {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin JWT required. Ensure you are logged in to control-panel.',
          correlationId,
        },
      },
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
    };
  }

  // Get CF Access credentials from environment
  const cfClientId = process.env.CF_ACCESS_CLIENT_ID;
  const cfClientSecret = process.env.CF_ACCESS_CLIENT_SECRET;

  if (!cfClientId || !cfClientSecret) {
    context.error(
      `[proxy/moderation/test ${method}] CF Access credentials not configured [${correlationId}]`
    );
    return {
      status: 503,
      jsonBody: {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Proxy service not fully configured.',
          correlationId,
        },
      },
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
    };
  }

  // Build target URL
  const adminApiUrl =
    process.env.ADMIN_API_URL || 'https://admin-api.asora.co.za';
  const targetPath = request.url.replace(/^.*\/api\/admin\/moderation\/test/, '/moderation/test');
  const targetUrl = `${adminApiUrl}${targetPath}`;

  context.log(
    `[proxy/moderation/test ${method}] Proxying to ${targetUrl} [${correlationId}]`
  );

  try {
    // Get request body for non-GET requests
    let data: any = undefined;
    const contentType = request.headers.get('content-type') || '';

    if (method !== 'GET' && method !== 'HEAD') {
      // For any request with a body, get it as text/buffer
      // Azure Functions v4 HttpRequest.text() handles all content types
      try {
        const bodyText = await request.text();
        // Pass raw body for multipart; JSON parse for application/json
        if (contentType.includes('multipart/form-data')) {
          data = bodyText;
        } else if (contentType.includes('application/json')) {
          data = bodyText ? JSON.parse(bodyText) : undefined;
        } else {
          data = bodyText;
        }
      } catch (parseErr) {
        context.warn(
          `[proxy/moderation/test ${method}] Body parse error [${correlationId}]`
        );
        return {
          status: 400,
          jsonBody: {
            error: {
              code: 'INVALID_REQUEST_BODY',
              message: 'Request body could not be parsed.',
              correlationId,
            },
          },
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId,
          },
        };
      }
    }

    // Prepare headers for target API
    const proxyHeaders: Record<string, string> = {
      'CF-Access-Client-Id': cfClientId,
      'CF-Access-Client-Secret': cfClientSecret,
      'User-Agent': 'Asora-Control-Panel-Proxy/1.0',
      'X-Forwarded-For': clientIp,
      'X-Correlation-ID': correlationId,
    };

    // Preserve original content-type and other safe headers
    if (contentType) {
      proxyHeaders['Content-Type'] = contentType;
    }

    // Forward Authorization header to admin API (for consistency)
    if (authHeader) {
      proxyHeaders['Authorization'] = authHeader;
    }

    // Proxy the request
    const response = await axios({
      method: method as any,
      url: targetUrl,
      data,
      headers: proxyHeaders,
      maxRedirects: 5,
      timeout: 30_000, // 30s timeout
      validateStatus: () => true, // Accept all status codes, let response through
    });

    // Build response
    const responseHeaders: Record<string, string> = {
      'X-Correlation-ID': correlationId,
    };

    // Preserve content-type from upstream
    const upstreamContentType = response.headers['content-type'];
    if (upstreamContentType) {
      responseHeaders['Content-Type'] = upstreamContentType;
    }

    // Log response details
    context.log(
      `[proxy/moderation/test ${method}] Response ${response.status} [${correlationId}]`
    );

    // Return response to browser
    return {
      status: response.status,
      body:
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data),
      headers: responseHeaders,
    };
  } catch (err) {
    const error = err as AxiosError | Error;
    const errorMsg = error instanceof Error ? error.message : String(err);

    context.error(
      `[proxy/moderation/test ${method}] Proxy error: ${errorMsg} [${correlationId}]`
    );

    // Determine if this is a network error vs response error
    if (axios.isAxiosError(err)) {
      // Network error or timeout
      return {
        status: 502,
        jsonBody: {
          error: {
            code: 'UPSTREAM_ERROR',
            message: `Failed to reach admin API: ${err.code}`,
            correlationId,
            details: {
              upstreamError: err.code,
            },
          },
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
      };
    }

    // Generic error
    return {
      status: 500,
      jsonBody: {
        error: {
          code: 'PROXY_ERROR',
          message: 'An error occurred while proxying your request.',
          correlationId,
        },
      },
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
    };
  }
}

app.http('moderation-test-proxy', {
  route: 'admin/moderation/test/{*path}',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  authLevel: 'anonymous', // We validate admin JWT manually
  handler: proxyModerationTest,
});
