/**
 * Admin CORS Tests
 */

import {
  isOriginAllowed,
  getAdminCorsHeaders,
  createCorsPreflightResponse,
  withCorsHeaders,
} from '../../src/admin/cors';

describe('isOriginAllowed', () => {
  it('allows the production admin origin', () => {
    expect(isOriginAllowed('https://admin.lythaus.co')).toBe(true);
  });

  it('allows localhost development origins', () => {
    expect(isOriginAllowed('http://localhost:3000')).toBe(true);
    expect(isOriginAllowed('http://localhost:5173')).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:3000')).toBe(true);
  });

  it('rejects unknown origins', () => {
    expect(isOriginAllowed('https://evil.com')).toBe(false);
    expect(isOriginAllowed('https://asora.co.za')).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isOriginAllowed(null)).toBe(false);
    expect(isOriginAllowed(undefined)).toBe(false);
  });
});

describe('getAdminCorsHeaders', () => {
  it('returns correct headers for allowed origin', () => {
    const headers = getAdminCorsHeaders('https://admin.lythaus.co');

    expect(headers['Access-Control-Allow-Origin']).toBe('https://admin.lythaus.co');
    expect(headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(headers['Access-Control-Allow-Methods']).toContain('PUT');
    expect(headers['Access-Control-Allow-Headers']).toContain('Cf-Access-Jwt-Assertion');
    expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Content-Security-Policy']).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(headers['Cache-Control']).toBe('no-store, no-cache, private');
  });

  it('does not reflect unknown origins', () => {
    const headers = getAdminCorsHeaders('https://evil.com');

    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });
});

describe('createCorsPreflightResponse', () => {
  it('returns 204 with CORS headers', () => {
    const response = createCorsPreflightResponse('https://admin.lythaus.co');

    expect(response.status).toBe(204);
    expect(response.headers).toBeDefined();
    const headers = response.headers as Record<string, string>;
    expect(headers['Access-Control-Allow-Origin']).toBe('https://admin.lythaus.co');
    expect(headers['Content-Length']).toBe('0');
  });
});

describe('withCorsHeaders', () => {
  it('adds CORS headers to existing response', () => {
    const original = {
      status: 200,
      jsonBody: { ok: true },
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': 'test-123',
      },
    };

    const result = withCorsHeaders(original, 'https://admin.lythaus.co');

    expect(result.status).toBe(200);
    expect(result.jsonBody).toEqual({ ok: true });
    const headers = result.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Correlation-ID']).toBe('test-123');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://admin.lythaus.co');
  });

  it('handles response without headers', () => {
    const original = { status: 204 };

    const result = withCorsHeaders(original, 'http://localhost:3000');

    const headers = result.headers as Record<string, string>;
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
  });
});
