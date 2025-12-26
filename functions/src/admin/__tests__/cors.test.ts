/**
 * CORS Middleware Tests
 * 
 * Tests for cross-origin request handling.
 */

import { handleCors, ALLOWED_ORIGINS, corsHeaders } from '../cors';

describe('ALLOWED_ORIGINS', () => {
  it('includes production control panel domain', () => {
    expect(ALLOWED_ORIGINS).toContain('https://control.asora.co.za');
  });

  it('includes localhost for development', () => {
    const hasLocalhost = ALLOWED_ORIGINS.some(
      (origin) => origin.includes('localhost') || origin.includes('127.0.0.1')
    );
    expect(hasLocalhost).toBe(true);
  });
});

describe('corsHeaders', () => {
  it('generates correct headers for allowed origin', () => {
    const headers = corsHeaders('https://control.asora.co.za');

    expect(headers['Access-Control-Allow-Origin']).toBe('https://control.asora.co.za');
    expect(headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(headers['Access-Control-Allow-Methods']).toContain('PUT');
    expect(headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
    expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
    expect(headers['Access-Control-Allow-Credentials']).toBe('true');
  });
});

describe('handleCors', () => {
  it('returns 204 for OPTIONS preflight from allowed origin', () => {
    const result = handleCors('OPTIONS', 'https://control.asora.co.za');

    expect(result.status).toBe(204);
    expect(result.headers).toBeDefined();
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('https://control.asora.co.za');
  });

  it('returns null for non-OPTIONS requests (let handler proceed)', () => {
    const result = handleCors('GET', 'https://control.asora.co.za');

    expect(result).toBeNull();
  });

  it('returns 403 for OPTIONS from disallowed origin', () => {
    const result = handleCors('OPTIONS', 'https://evil-site.com');

    expect(result?.status).toBe(403);
  });

  it('returns 403 for OPTIONS with no origin header', () => {
    const result = handleCors('OPTIONS', undefined);

    expect(result?.status).toBe(403);
  });

  it('allows localhost origins for development', () => {
    const result = handleCors('OPTIONS', 'http://localhost:3000');

    expect(result?.status).toBe(204);
  });
});
