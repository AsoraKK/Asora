/**
 * HTTP Handler Wrapper for OpenAPI-Generated Stubs
 * 
 * Provides a standardized wrapper for Azure Functions HTTP handlers that:
 * - Injects correlation IDs for tracing
 * - Formats error responses using ErrorResponse schema
 * - Handles JSON serialization
 * - Provides type-safe request/response handling
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import type { ErrorResponse } from '@shared/types/openapi';
import { getCorsHeaders } from '@shared/utils/http';

/**
 * HTTP Handler Context
 * 
 * Passed to handler functions with utilities for response generation.
 */
export interface HttpHandlerContext<TRequest = unknown> {
  request: HttpRequest;
  context: InvocationContext;
  correlationId: string;
  body?: TRequest;
  params: Record<string, string>;
  query: Record<string, string>;

  // Response helpers
  ok<T>(data: T, status?: number): HttpResponseInit;
  created<T>(data: T): HttpResponseInit;
  accepted(): HttpResponseInit;
  noContent(): HttpResponseInit;
  badRequest(message: string, code?: string, details?: Record<string, unknown>): HttpResponseInit;
  unauthorized(message: string, code?: string): HttpResponseInit;
  forbidden(message: string, code?: string): HttpResponseInit;
  notFound(message: string, code?: string): HttpResponseInit;
  tooManyRequests(message: string, code?: string, details?: Record<string, unknown>): HttpResponseInit;
  notImplemented(operationId: string): HttpResponseInit;
  internalError(error: Error | string): HttpResponseInit;
}

/**
 * HTTP Handler Function Type
 */
export type HttpHandlerFunction<TRequest = unknown, TResponse = unknown> = (
  ctx: HttpHandlerContext<TRequest>
) => Promise<HttpResponseInit>;

/**
 * Create Error Response Body
 */
function createErrorResponse(
  code: string,
  message: string,
  correlationId: string,
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    error: {
      code,
      message,
      correlationId,
      ...(details ? { details } : {}),
    },
  };
}

function appendVaryHeader(current: string | undefined, value: string): string {
  const values = (current || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!values.includes(value)) {
    values.push(value);
  }

  return values.join(', ');
}

function applyStandardResponseHeaders(
  response: HttpResponseInit,
  requestOrigin: string | undefined,
  hasAuthHeader: boolean,
  correlationId: string
): HttpResponseInit {
  if (!response.headers) {
    response.headers = {};
  }

  const headers = response.headers as Record<string, string>;

  if (!headers['X-Correlation-ID']) {
    headers['X-Correlation-ID'] = correlationId;
  }

  const corsHeaders = getCorsHeaders(requestOrigin);
  for (const [key, value] of Object.entries(corsHeaders)) {
    if (!headers[key]) {
      headers[key] = value;
    }
  }

  if (corsHeaders['Access-Control-Allow-Origin'] !== '*') {
    headers.Vary = appendVaryHeader(headers.Vary, 'Origin');
  }

  const varyHeader = headers.Vary;
  if (hasAuthHeader && !headers['Cache-Control']) {
    headers['Cache-Control'] = 'private, no-store';
  }
  if (hasAuthHeader && !varyHeader) {
    headers.Vary = 'Authorization';
  } else if (hasAuthHeader && !varyHeader.split(',').map((entry) => entry.trim()).includes('Authorization')) {
    headers.Vary = appendVaryHeader(varyHeader, 'Authorization');
  }

  return response;
}

/**
 * Create HTTP Handler Context
 */
function createHandlerContext<TRequest>(
  request: HttpRequest,
  context: InvocationContext,
  correlationId: string
): HttpHandlerContext<TRequest> {
  // Parse request body if present
  let body: TRequest | undefined;
  try {
    const rawBody = request.body;
    if (rawBody) {
      body = (typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody) as TRequest;
    }
  } catch (err) {
    context.warn(`[HTTP Handler] Failed to parse request body: ${err instanceof Error ? err.message : err}`);
  }

  // Extract path parameters (Azure Functions provides these in request.params)
  const params: Record<string, string> = {};
  if (request.params) {
    for (const [key, value] of Object.entries(request.params)) {
      params[key] = String(value);
    }
  }

  // Extract query parameters
  const query: Record<string, string> = {};
  if (request.query) {
    for (const [key, value] of request.query.entries()) {
      query[key] = value;
    }
  }

  // Response helper functions
  const ok = <T>(data: T, status = 200): HttpResponseInit => ({
    status,
    jsonBody: data,
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    },
  });

  const created = <T>(data: T): HttpResponseInit => ok(data, 201);

  const accepted = (): HttpResponseInit => ({
    status: 202,
    jsonBody: { message: 'Accepted' },
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    },
  });

  const noContent = (): HttpResponseInit => ({
    status: 204,
    headers: {
      'X-Correlation-ID': correlationId,
    },
  });

  const badRequest = (
    message: string,
    code = 'BAD_REQUEST',
    details?: Record<string, unknown>
  ): HttpResponseInit => ({
    status: 400,
    jsonBody: createErrorResponse(code, message, correlationId, details),
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    },
  });

  const unauthorized = (message: string, code = 'UNAUTHORIZED'): HttpResponseInit => ({
    status: 401,
    jsonBody: createErrorResponse(code, message, correlationId),
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    },
  });

  const forbidden = (message: string, code = 'FORBIDDEN'): HttpResponseInit => ({
    status: 403,
    jsonBody: createErrorResponse(code, message, correlationId),
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    },
  });

  const notFound = (message: string, code = 'NOT_FOUND'): HttpResponseInit => ({
    status: 404,
    jsonBody: createErrorResponse(code, message, correlationId),
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    },
  });

  const tooManyRequests = (
    message: string,
    code = 'RATE_LIMIT_EXCEEDED',
    details?: Record<string, unknown>
  ): HttpResponseInit => ({
    status: 429,
    jsonBody: createErrorResponse(code, message, correlationId, details),
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    },
  });

  const notImplemented = (operationId: string): HttpResponseInit => ({
    status: 501,
    jsonBody: createErrorResponse(
      'NOT_IMPLEMENTED',
      `Operation '${operationId}' is not implemented yet`,
      correlationId
    ),
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    },
  });

  const internalError = (error: Error | string): HttpResponseInit => {
    const message = error instanceof Error ? error.message : error;
    context.error(`[HTTP Handler] Internal error: ${message}`);

    return {
      status: 500,
      jsonBody: createErrorResponse('INTERNAL_ERROR', 'An internal error occurred', correlationId),
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
    };
  };

  return {
    request,
    context,
    correlationId,
    body,
    params,
    query,
    ok,
    created,
    accepted,
    noContent,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    tooManyRequests,
    notImplemented,
    internalError,
  };
}

/**
 * HTTP Handler Wrapper
 * 
 * Wraps a handler function with correlation ID injection and error handling.
 * 
 * @example
 * export const myHandler = httpHandler<MyRequest, MyResponse>(async (ctx) => {
 *   return ctx.notImplemented('my_operation');
 * });
 */
export function httpHandler<TRequest = unknown, TResponse = unknown>(
  handler: HttpHandlerFunction<TRequest, TResponse>
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    // Generate correlation ID
    const correlationId = request.headers.get('X-Correlation-ID') || uuidv4();
    const requestOrigin = request.headers.get('Origin') || request.headers.get('origin') || undefined;

    context.log(`[HTTP Handler] Request: ${request.method} ${request.url} [${correlationId}]`);

    try {
      const ctx = createHandlerContext<TRequest>(request, context, correlationId);
      const response = await handler(ctx);

      applyStandardResponseHeaders(
        response,
        requestOrigin,
        Boolean(request.headers.get('authorization')),
        correlationId
      );

      context.log(
        `[HTTP Handler] Response: ${response.status ?? 200} [${correlationId}]`
      );

      return response;
    } catch (error) {
      context.error(
        `[HTTP Handler] Unhandled error [${correlationId}]:`,
        error instanceof Error ? error.message : error
      );

      return {
        status: 500,
        jsonBody: createErrorResponse(
          'INTERNAL_ERROR',
          'An unexpected error occurred',
          correlationId
        ),
        headers: applyStandardResponseHeaders(
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
          requestOrigin,
          Boolean(request.headers.get('authorization')),
          correlationId
        ).headers,
      };
    }
  };
}
