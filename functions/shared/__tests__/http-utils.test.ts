import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
  handleCorsAndMethod,
  extractAuthToken,
  checkRateLimit
} from '../../shared/http-utils';

describe('http-utils', () => {
  test('createSuccessResponse includes headers and data', () => {
    const res = createSuccessResponse({ ok: true }, { 'X-Test': '1' }, 201);
    expect(res.status).toBe(201);
    const body = JSON.parse(res.body as string);
    expect(body.success).toBe(true);
    expect(res.headers['Content-Type']).toBe('application/json');
    expect(res.headers['X-Test']).toBe('1');
  });

  test('createErrorResponse hides error unless development', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    let res = createErrorResponse(400, 'Bad', 'detail');
    let body = JSON.parse(res.body as string);
    expect(body.error).toBeUndefined();
    process.env.NODE_ENV = 'development';
    res = createErrorResponse(400, 'Bad', 'detail');
    body = JSON.parse(res.body as string);
    expect(body.error).toBe('detail');
    process.env.NODE_ENV = prev;
  });

  test('createCorsResponse for OPTIONS', () => {
    const res = createCorsResponse();
    expect(res.status).toBe(200);
    expect(res.headers['Access-Control-Allow-Methods']).toMatch('OPTIONS');
  });

  test('handleCorsAndMethod behavior', () => {
    let outcome = handleCorsAndMethod('OPTIONS', ['GET']);
    expect(outcome.shouldReturn).toBe(true);
    expect(outcome.response?.status).toBe(200);

    outcome = handleCorsAndMethod('DELETE', ['GET']);
    expect(outcome.shouldReturn).toBe(true);
    expect(outcome.response?.status).toBe(405);

    outcome = handleCorsAndMethod('GET', ['GET']);
    expect(outcome.shouldReturn).toBe(false);
  });

  test('extractAuthToken parses Bearer tokens', () => {
    expect(extractAuthToken(undefined)).toBeNull();
    expect(extractAuthToken('Token abc')).toBeNull();
    expect(extractAuthToken('Bearer mytoken')).toBe('mytoken');
  });

  test('checkRateLimit counts within window', () => {
    const id = 'client-1';
    const opts = { max: 2, win: 5000 };
    const r1 = checkRateLimit(id, opts.max, opts.win);
    const r2 = checkRateLimit(id, opts.max, opts.win);
    const r3 = checkRateLimit(id, opts.max, opts.win);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r2.remainingRequests).toBe(0);
    expect(r3.allowed).toBe(false);
  });
});
