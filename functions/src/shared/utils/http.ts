import { AsyncLocalStorage } from 'node:async_hooks';

export type JsonResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

const jsonResponse = (status: number, body: unknown): JsonResponse => ({
  status,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

export const json = jsonResponse;
export const ok = (body: unknown) => jsonResponse(200, body);
export const created = (body: unknown) => jsonResponse(201, body);
export const badRequest = (msg: string) => jsonResponse(400, { error: msg });
export const unauthorized = () => jsonResponse(401, { error: 'unauthorized' });
export const forbidden = () => jsonResponse(403, { error: 'forbidden' });
export const notFound = () => jsonResponse(404, { error: 'not found' });
export const serverError = (msg = 'internal') => jsonResponse(500, { error: msg });

interface ErrorResponse {
  success: false;
  code?: string;
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

interface RequestOriginContext {
  origin?: string;
}

const requestOriginStorage = new AsyncLocalStorage<RequestOriginContext>();

export function runWithRequestOrigin<T>(requestOrigin: string | undefined, fn: () => T): T {
  const origin = requestOrigin?.trim() || undefined;
  return requestOriginStorage.run({ origin }, fn);
}

function getRequestOriginFromContext(): string | undefined {
  return requestOriginStorage.getStore()?.origin;
}

function resolveRequestOrigin(requestOrigin?: string): string | undefined {
  return requestOrigin?.trim() || getRequestOriginFromContext();
}

/**
 * Allowed CORS origins. In production, restrict to known front-end origins.
 */
function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) {
    return ['*'];
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return ['*'];
  }

  if (trimmed === '*') {
    return ['*'];
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const values = parsed.map((entry) => String(entry).trim()).filter(Boolean);
        return values.length > 0 ? values : ['*'];
      }
    } catch {
      // Fall through to comma-separated parsing.
    }
  }

  const values = trimmed
    .split(',')
    .map((entry) => entry.replace(/^[\s"'[\]]+|[\s"'[\]]+$/g, '').trim())
    .filter(Boolean);

  return values.length > 0 ? values : ['*'];
}

const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);

export function getAllowedOrigin(requestOrigin?: string): string {
  if (ALLOWED_ORIGINS.includes('*')) return '*';
  const resolvedOrigin = resolveRequestOrigin(requestOrigin);
  if (resolvedOrigin && ALLOWED_ORIGINS.includes(resolvedOrigin)) return resolvedOrigin;
  return ALLOWED_ORIGINS[0] ?? '*';
}

export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(requestOrigin),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Idempotency-Key',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Standard security headers applied to every response.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // Prevent caching of authenticated API responses by default.
  // Callers may override with additionalHeaders (e.g. health/ready can pass Cache-Control: public, max-age=30).
  'Cache-Control': 'no-store, no-cache, private',
};

export function createSuccessResponse<T>(
  data: T,
  additionalHeaders: Record<string, string> = {},
  statusCode = 200
) {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  return {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(),
      ...SECURITY_HEADERS,
      ...additionalHeaders,
    },
    body: JSON.stringify(response),
  };
}

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
    timestamp: new Date().toISOString(),
  };

  return {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(),
      ...SECURITY_HEADERS,
      ...additionalHeaders,
    },
    body: JSON.stringify(response),
  };
}

export function createErrorResponseWithCode(
  statusCode: number,
  code: string,
  message: string,
  additionalHeaders: Record<string, string> = {}
) {
  const response: ErrorResponse = {
    success: false,
    code,
    message,
    timestamp: new Date().toISOString(),
  };

  return {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(),
      ...SECURITY_HEADERS,
      ...additionalHeaders,
    },
    body: JSON.stringify(response),
  };
}

export function createCorsResponse() {
  return {
    status: 200,
    headers: {
      ...getCorsHeaders(),
      'Content-Length': '0',
    },
    body: '',
  };
}

export function handleCorsAndMethod(
  method: string,
  allowedMethods: string[]
): { shouldReturn: boolean; response?: any } {
  if (method === 'OPTIONS') {
    return {
      shouldReturn: true,
      response: createCorsResponse(),
    };
  }

  if (!allowedMethods.includes(method)) {
    return {
      shouldReturn: true,
      response: createErrorResponse(405, `Method ${method} not allowed`),
    };
  }

  return { shouldReturn: false };
}

export function extractAuthToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests = 100,
  windowMs = 60 * 1000
): { allowed: boolean; remainingRequests: number; resetTime: number } {
  const now = Date.now();
  const window = rateLimitStore.get(identifier);

  if (!window || now > window.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return {
      allowed: true,
      remainingRequests: maxRequests - 1,
      resetTime,
    };
  }

  if (window.count >= maxRequests) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: window.resetTime,
    };
  }

  window.count++;
  return {
    allowed: true,
    remainingRequests: maxRequests - window.count,
    resetTime: window.resetTime,
  };
}

export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupRateLimitStore, 5 * 60 * 1000).unref();
