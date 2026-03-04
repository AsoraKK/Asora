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
      'Access-Control-Allow-Origin': '*',
      'X-Custom': 'yes',
    });
    const parsed = JSON.parse(response.body);
    expect(parsed).toMatchObject({ success: true, data: { id: '123' } });
    expect(typeof parsed.timestamp).toBe('string');
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
