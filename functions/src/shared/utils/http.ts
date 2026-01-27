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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Idempotency-Key',
      'Access-Control-Max-Age': '86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Idempotency-Key',
      'Access-Control-Max-Age': '86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Idempotency-Key',
      'Access-Control-Max-Age': '86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      ...additionalHeaders,
    },
    body: JSON.stringify(response),
  };
}

export function createCorsResponse() {
  return {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Idempotency-Key',
      'Access-Control-Max-Age': '86400',
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
