import {
  badRequest,
  checkRateLimit,
  cleanupRateLimitStore,
  createErrorResponse,
  createSuccessResponse,
  created,
  extractAuthToken,
  handleCorsAndMethod,
  json,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@shared/utils/http';

describe('http utility responses', () => {
  it('wraps payloads with JSON helpers', () => {
    expect(ok({ foo: 'bar' })).toMatchObject({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' }),
    });
    expect(created({ id: 1 }).status).toBe(201);
    expect(badRequest('nope').body).toBe(JSON.stringify({ error: 'nope' }));
    expect(unauthorized().status).toBe(401);
    expect(notFound().status).toBe(404);
    expect(serverError().status).toBe(500);
    expect(json(418, { ok: true }).status).toBe(418);
  });

  it('creates success envelope with CORS headers', () => {
    const response = createSuccessResponse({ id: '123' }, { 'X-Custom': 'yes' }, 202);
    expect(response.status).toBe(202);
    expect(response.headers).toMatchObject({
      'X-Custom': 'yes',
    });
    expect(response.headers['Access-Control-Allow-Origin']).toBeUndefined();
    const parsed = JSON.parse(response.body);
    expect(parsed).toMatchObject({ success: true, data: { id: '123' } });
    expect(typeof parsed.timestamp).toBe('string');
  });

  it('reflects the active request origin inside async-local response helpers', async () => {
    const originalOrigins = process.env.CORS_ALLOWED_ORIGINS;
    process.env.CORS_ALLOWED_ORIGINS =
      '["https://admin.lythaus.co","https://preview.example.pages.dev"]';
    jest.resetModules();

    try {
      const {
        createErrorResponse: createErrorResponseWithContext,
        createSuccessResponse: createSuccessResponseWithContext,
        runWithRequestOrigin,
      } = require('@shared/utils/http') as typeof import('@shared/utils/http');

      const requestOrigin = 'https://preview.example.pages.dev';

      const success = await runWithRequestOrigin(requestOrigin, async () => {
        await Promise.resolve();
        return createSuccessResponseWithContext({ id: '123' }, {}, 200, requestOrigin);
      });
      expect(success.headers).toMatchObject({
        'Access-Control-Allow-Origin': requestOrigin,
      });

      const error = await runWithRequestOrigin(requestOrigin, async () => {
        await Promise.resolve();
        return createErrorResponseWithContext(500, 'fail', undefined, {}, requestOrigin);
      });
      expect(error.headers).toMatchObject({
        'Access-Control-Allow-Origin': requestOrigin,
      });
    } finally {
      if (originalOrigins === undefined) {
        delete process.env.CORS_ALLOWED_ORIGINS;
      } else {
        process.env.CORS_ALLOWED_ORIGINS = originalOrigins;
      }
      jest.resetModules();
    }
  });

  it('creates error envelope and hides stack traces outside development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const devResponse = createErrorResponse(500, 'fail', 'trace');
    expect(JSON.parse(devResponse.body)).toMatchObject({
      success: false,
      message: 'fail',
      error: 'trace',
    });

    process.env.NODE_ENV = 'production';
    const prodResponse = createErrorResponse(500, 'fail', 'trace');
    expect(JSON.parse(prodResponse.body)).toMatchObject({
      success: false,
      message: 'fail',
    });
    expect(JSON.parse(prodResponse.body).error).toBeUndefined();
    process.env.NODE_ENV = originalEnv;
  });

  it('handles OPTIONS and method validation correctly', () => {
    const options = handleCorsAndMethod('OPTIONS', ['GET']);
    expect(options.shouldReturn).toBe(true);
    expect(options.response?.status).toBe(200);

    const invalid = handleCorsAndMethod('POST', ['GET']);
    expect(invalid.shouldReturn).toBe(true);
    expect(invalid.response?.status).toBe(405);

    const allowed = handleCorsAndMethod('GET', ['GET']);
    expect(allowed.shouldReturn).toBe(false);
  });

  it('extracts bearer tokens safely', () => {
    expect(extractAuthToken(undefined)).toBeNull();
    expect(extractAuthToken('Basic abc')).toBeNull();
    expect(extractAuthToken('Bearer token-123')).toBe('token-123');
  });

  it('enforces rate limits and cleans up stale windows', () => {
    cleanupRateLimitStore();
    let current = 1_000_000;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => current);

    const first = checkRateLimit('user', 2, 1000);
    expect(first).toMatchObject({ allowed: true, remainingRequests: 1 });

    current += 100;
    const second = checkRateLimit('user', 2, 1000);
    expect(second.allowed).toBe(true);
    expect(second.remainingRequests).toBe(0);

    current += 100;
    const third = checkRateLimit('user', 2, 1000);
    expect(third.allowed).toBe(false);
    expect(third.remainingRequests).toBe(0);

    // Advance beyond reset time and ensure cleanup clears the window
    current += 2000;
    cleanupRateLimitStore();
    const fourth = checkRateLimit('user', 2, 1000);
    expect(fourth.allowed).toBe(true);
    expect(fourth.remainingRequests).toBe(1);

    nowSpy.mockRestore();
  });
});
