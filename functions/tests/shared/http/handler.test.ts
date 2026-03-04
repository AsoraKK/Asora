/**
 * Tests for shared/http/handler.ts
 * 
 * Tests the HTTP handler wrapper utility functions and context creation.
 */

import { HttpRequest, InvocationContext } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';

// Mock HttpRequest
function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: unknown;
  params?: Record<string, string>;
  query?: Map<string, string>;
  headers?: Record<string, string>;
} = {}): HttpRequest {
  const queryMap = options.query || new Map();
  const headersMap = new Map<string, string>(Object.entries(options.headers || {}));
  
  return {
    method: options.method || 'GET',
    url: options.url || 'http://localhost:7071/api/test',
    headers: {
      get: (key: string) => headersMap.get(key),
      has: (key: string) => headersMap.has(key),
      entries: () => headersMap.entries(),
    },
    body: options.body,
    params: options.params || {},
    query: queryMap,
  } as HttpRequest;
}

// Mock InvocationContext
function createMockContext(): InvocationContext {
  return {
    invocationId: 'test-invocation-id',
    functionName: 'test-function',
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  } as unknown as InvocationContext;
}

describe('httpHandler', () => {
  describe('correlation ID injection', () => {
    it('should generate a correlation ID if not provided', async () => {
      const handler = httpHandler(async (ctx) => {
        expect(ctx.correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        return ctx.ok({ message: 'success' });
      });

      const request = createMockRequest();
      const context = createMockContext();

      await handler(request, context);
    });

    it('should use X-Correlation-ID header if provided', async () => {
      const correlationId = 'test-correlation-id';
      const handler = httpHandler(async (ctx) => {
        expect(ctx.correlationId).toBe(correlationId);
        return ctx.ok({ message: 'success' });
      });

      const request = createMockRequest({
        headers: { 'X-Correlation-ID': correlationId },
      });
      const context = createMockContext();

      await handler(request, context);
    });

    it('should include correlation ID in response headers', async () => {
      const handler = httpHandler(async (ctx) => {
        return ctx.ok({ message: 'success' });
      });

      const request = createMockRequest();
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.headers).toHaveProperty('X-Correlation-ID');
    });
  });

  describe('request parsing', () => {
    it('should parse JSON body', async () => {
      const requestBody = { name: 'test', value: 123 };
      const handler = httpHandler<typeof requestBody>(async (ctx) => {
        expect(ctx.body).toEqual(requestBody);
        return ctx.ok({ message: 'success' });
      });

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      const context = createMockContext();

      await handler(request, context);
    });

    it('should handle object body without parsing', async () => {
      const requestBody = { name: 'test', value: 123 };
      const handler = httpHandler<typeof requestBody>(async (ctx) => {
        expect(ctx.body).toEqual(requestBody);
        return ctx.ok({ message: 'success' });
      });

      const request = createMockRequest({
        method: 'POST',
        body: requestBody,
      });
      const context = createMockContext();

      await handler(request, context);
    });

    it('should handle empty body gracefully', async () => {
      const handler = httpHandler(async (ctx) => {
        expect(ctx.body).toBeUndefined();
        return ctx.ok({ message: 'success' });
      });

      const request = createMockRequest({ method: 'GET' });
      const context = createMockContext();

      await handler(request, context);
    });

    it('should extract path parameters', async () => {
      const handler = httpHandler(async (ctx) => {
        expect(ctx.params).toEqual({ id: '123', userId: '456' });
        return ctx.ok({ message: 'success' });
      });

      const request = createMockRequest({
        params: { id: '123', userId: '456' },
      });
      const context = createMockContext();

      await handler(request, context);
    });

    it('should extract query parameters', async () => {
      const queryMap = new Map<string, string>();
      queryMap.set('limit', '10');
      queryMap.set('cursor', 'abc123');

      const handler = httpHandler(async (ctx) => {
        expect(ctx.query).toEqual({ limit: '10', cursor: 'abc123' });
        return ctx.ok({ message: 'success' });
      });

      const request = createMockRequest({ query: queryMap });
      const context = createMockContext();

      await handler(request, context);
    });
  });

  describe('response helpers', () => {
    it('should create 200 OK response', async () => {
      const data = { message: 'success', count: 5 };
      const handler = httpHandler(async (ctx) => {
        return ctx.ok(data);
      });

      const request = createMockRequest();
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual(data);
      expect(response.headers?.['Content-Type']).toBe('application/json');
    });

    it('should create 201 Created response', async () => {
      const data = { id: '123', name: 'resource' };
      const handler = httpHandler(async (ctx) => {
        return ctx.created(data);
      });

      const request = createMockRequest();
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.status).toBe(201);
      expect(response.jsonBody).toEqual(data);
    });

    it('should create 202 Accepted response', async () => {
      const handler = httpHandler(async (ctx) => {
        return ctx.accepted();
      });

      const request = createMockRequest();
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.status).toBe(202);
      expect(response.jsonBody).toEqual({ message: 'Accepted' });
    });

    it('should create 204 No Content response', async () => {
      const handler = httpHandler(async (ctx) => {
        return ctx.noContent();
      });

      const request = createMockRequest();
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.status).toBe(204);
      expect(response.body).toBeUndefined();
    });

    it('should create 400 Bad Request response', async () => {
      const handler = httpHandler(async (ctx) => {
        return ctx.badRequest('Invalid input', 'VALIDATION_ERROR', { field: 'email' });
      });

      const request = createMockRequest();
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.status).toBe(400);
      expect(response.jsonBody).toHaveProperty('error');
      expect(response.jsonBody?.error.code).toBe('VALIDATION_ERROR');
      expect(response.jsonBody?.error.message).toBe('Invalid input');
      expect(response.jsonBody?.error.details).toEqual({ field: 'email' });
    });

    it('should create 401 Unauthorized response', async () => {
      const handler = httpHandler(async (ctx) => {
        return ctx.unauthorized('Missing authentication token');
      });

      const request = createMockRequest();
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.status).toBe(401);
      expect(response.jsonBody?.error.code).toBe('UNAUTHORIZED');
    });

    it('should create 403 Forbidden response', async () => {
      const handler = httpHandler(async (ctx) => {
        return ctx.forbidden('Insufficient permissions');
      });

      const request = createMockRequest();
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.status).toBe(403);
      expect(response.jsonBody?.error.code).toBe('FORBIDDEN');
    });

    it('should create 404 Not Found response', async () => {
      const handler = httpHandler(async (ctx) => {
        return ctx.notFound('Resource not found');
      });

      const request = createMockRequest();
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.status).toBe(404);
      expect(response.jsonBody?.error.code).toBe('NOT_FOUND');
    });

    it('should create 501 Not Implemented response', async () => {
      const handler = httpHandler(async (ctx) => {
        return ctx.notImplemented('users_me_get');
      });

      const request = createMockRequest();
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.status).toBe(501);
      expect(response.jsonBody?.error.code).toBe('NOT_IMPLEMENTED');
      expect(response.jsonBody?.error.message).toContain('users_me_get');
    });

    it('should create 500 Internal Server Error response from Error object', async () => {
      const handler = httpHandler(async (ctx) => {
        return ctx.internalError(new Error('Database connection failed'));
      });

      const request = createMockRequest();
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.status).toBe(500);
      expect(response.jsonBody?.error.code).toBe('INTERNAL_ERROR');
      expect(response.jsonBody?.error.message).toBe('An internal error occurred');
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('Database connection failed'));
    });

    it('should create 500 Internal Server Error response from string', async () => {
      const handler = httpHandler(async (ctx) => {
        return ctx.internalError('Something went wrong');
      });

      const request = createMockRequest();
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.status).toBe(500);
      expect(response.jsonBody?.error.code).toBe('INTERNAL_ERROR');
      expect(response.jsonBody?.error.message).toBe('An internal error occurred');
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
    });
  });

  describe('error handling', () => {
    it('should catch and format unhandled errors', async () => {
      const handler = httpHandler(async () => {
        throw new Error('Unhandled exception');
      });

      const request = createMockRequest();
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.status).toBe(500);
      expect(response.jsonBody?.error.code).toBe('INTERNAL_ERROR');
      expect(response.jsonBody?.error.message).toBe('An unexpected error occurred');
      expect(context.error).toHaveBeenCalled();
      const errorCall = (context.error as jest.Mock).mock.calls[0];
      expect(errorCall.join(' ')).toContain('Unhandled exception');
    });

    it('should handle invalid JSON body gracefully', async () => {
      const handler = httpHandler(async (ctx) => {
        // Body parsing failed, but handler should still execute
        expect(ctx.body).toBeUndefined();
        return ctx.ok({ message: 'success' });
      });

      const request = createMockRequest({
        method: 'POST',
        body: '{invalid json',
      });
      const context = createMockContext();

      await handler(request, context);
      expect(context.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to parse request body'));
    });
  });

  describe('custom status codes', () => {
    it('should allow custom status code with ok() helper', async () => {
      const handler = httpHandler(async (ctx) => {
        return ctx.ok({ message: 'partial content' }, 206);
      });

      const request = createMockRequest();
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.status).toBe(206);
    });
  });

  describe('cache control defaults', () => {
    it('sets private no-store for authenticated responses when not explicitly set', async () => {
      const handler = httpHandler(async (ctx) => ctx.ok({ message: 'authed' }));

      const request = createMockRequest({
        headers: { authorization: 'Bearer token-123' },
      });
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.headers?.['Cache-Control']).toBe('private, no-store');
      expect(response.headers?.Vary).toBe('Authorization');
    });

    it('preserves explicit cache headers from endpoint handlers', async () => {
      const handler = httpHandler(async (ctx) => ({
        status: 200,
        jsonBody: { message: 'explicit' },
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      }));

      const request = createMockRequest({
        headers: { authorization: 'Bearer token-123' },
      });
      const context = createMockContext();

      const response = await handler(request, context);
      expect(response.headers?.['Cache-Control']).toBe('public, max-age=60');
    });
  });
});
