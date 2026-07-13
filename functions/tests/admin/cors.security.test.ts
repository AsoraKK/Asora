/**
 * CORS security tests – unsafe-credentials and origin allowlist enforcement
 *
 * Security invariants verified:
 * 1. No wildcard origin (`*`) is ever returned
 * 2. `Access-Control-Allow-Credentials: 'true'` MUST only appear when the
 *    requesting origin is in the allowlist (wildcard + credentials is a CORS
 *    misconfiguration that allows cross-origin credential theft)
 * 3. A disallowed origin gets the production fallback domain, not its own origin
 * 4. OPTIONS preflight from a disallowed origin → 403 (no credentials header)
 * 5. OPTIONS preflight from an allowed origin → 204 with full CORS headers
 */

import {
  ALLOWED_ORIGINS,
  isOriginAllowed,
  getAdminCorsHeaders,
  handleCors,
  withCorsHeaders,
  createCorsPreflightResponse,
} from '@admin/cors';

// ─────────────────────────────────────────────────────────────
// Allowlist shape tests
// ─────────────────────────────────────────────────────────────

describe('CORS allowlist – no wildcard', () => {
  it('ALLOWED_ORIGINS does not contain "*"', () => {
    expect(ALLOWED_ORIGINS).not.toContain('*');
  });

  it('isOriginAllowed returns false for wildcard string "*"', () => {
    expect(isOriginAllowed('*')).toBe(false);
  });

  it('isOriginAllowed returns false for null', () => {
    expect(isOriginAllowed(null)).toBe(false);
  });

  it('isOriginAllowed returns false for undefined', () => {
    expect(isOriginAllowed(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// getAdminCorsHeaders – allowed origin
// ─────────────────────────────────────────────────────────────

describe('getAdminCorsHeaders – allowed origin', () => {
  const ALLOWED = 'https://admin.lythaus.co';

  it('echoes the allowed origin in Access-Control-Allow-Origin', () => {
    const headers = getAdminCorsHeaders(ALLOWED);
    expect(headers['Access-Control-Allow-Origin']).toBe(ALLOWED);
  });

  it('sets Access-Control-Allow-Credentials: "true" for an allowed origin', () => {
    const headers = getAdminCorsHeaders(ALLOWED);
    expect(headers['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('does NOT set wildcard in Access-Control-Allow-Origin', () => {
    const headers = getAdminCorsHeaders(ALLOWED);
    expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
  });
});

// ─────────────────────────────────────────────────────────────
// getAdminCorsHeaders – disallowed origin
// ─────────────────────────────────────────────────────────────

describe('getAdminCorsHeaders – disallowed origin', () => {
  const ATTACKER = 'https://evil.example.com';
  it('omits the allow-origin header', () => {
    const headers = getAdminCorsHeaders(ATTACKER);
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('does NOT reflect the disallowed origin back to the client', () => {
    const origins = [
      'https://evil.example.com',
      'https://phishing.io',
      'http://malicious.local',
      'null', // serialised null origin
    ];
    for (const origin of origins) {
      const headers = getAdminCorsHeaders(origin);
      expect(headers['Access-Control-Allow-Origin']).not.toBe(origin);
    }
  });

  it('omits credentials for a disallowed origin', () => {
    const headers = getAdminCorsHeaders(ATTACKER);
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// handleCors – OPTIONS preflight
// ─────────────────────────────────────────────────────────────

describe('handleCors – OPTIONS preflight from disallowed origin', () => {
  it('returns 403 for an unrecognised origin', () => {
    const response = handleCors('OPTIONS', 'https://attacker.example.com');
    expect(response?.status).toBe(403);
  });

  it('the 403 response does not include Access-Control-Allow-Credentials', () => {
    const response = handleCors('OPTIONS', 'https://attacker.example.com');
    const headers = response?.headers as Record<string, string> | undefined;
    expect(headers?.['Access-Control-Allow-Credentials']).toBeUndefined();
  });

  it('returns 403 when origin is null', () => {
    const response = handleCors('OPTIONS', null);
    expect(response?.status).toBe(403);
  });

  it('returns 403 when origin is undefined', () => {
    const response = handleCors('OPTIONS', undefined);
    expect(response?.status).toBe(403);
  });
});

describe('handleCors – OPTIONS preflight from allowed origin', () => {
  const ALLOWED = 'https://admin.lythaus.co';

  it('returns 204 (preflight success)', () => {
    const response = handleCors('OPTIONS', ALLOWED);
    expect(response?.status).toBe(204);
  });

  it('includes Access-Control-Allow-Credentials in the 204', () => {
    const response = handleCors('OPTIONS', ALLOWED);
    const headers = response?.headers as Record<string, string> | undefined;
    expect(headers?.['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('reflects the allowed origin, not a wildcard', () => {
    const response = handleCors('OPTIONS', ALLOWED);
    const headers = response?.headers as Record<string, string> | undefined;
    expect(headers?.['Access-Control-Allow-Origin']).toBe(ALLOWED);
    expect(headers?.['Access-Control-Allow-Origin']).not.toBe('*');
  });
});

describe('handleCors – non-OPTIONS methods', () => {
  it('returns null for GET (caller handles normally)', () => {
    expect(handleCors('GET', 'https://admin.lythaus.co')).toBeNull();
  });

  it('returns null for POST', () => {
    expect(handleCors('POST', 'https://admin.lythaus.co')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// withCorsHeaders – response decoration
// ─────────────────────────────────────────────────────────────

describe('withCorsHeaders – response decoration', () => {
  it('adds CORS headers to an existing response without losing existing headers', () => {
    const base = { status: 200, body: 'ok', headers: { 'X-Custom': 'value' } };
    const decorated = withCorsHeaders(base, 'https://admin.lythaus.co');
    const h = decorated.headers as Record<string, string>;
    expect(h['X-Custom']).toBe('value');
    expect(h['Access-Control-Allow-Origin']).toBe('https://admin.lythaus.co');
  });

  it('does not set wildcard origin even when composing with a 200 response', () => {
    const decorated = withCorsHeaders({ status: 200 }, 'https://unknown.domain.com');
    const h = decorated.headers as Record<string, string>;
    expect(h['Access-Control-Allow-Origin']).not.toBe('*');
  });
});

// ─────────────────────────────────────────────────────────────
// createCorsPreflightResponse – standalone
// ─────────────────────────────────────────────────────────────

describe('createCorsPreflightResponse', () => {
  it('returns 204 with correct CORS headers for an allowed origin', () => {
    const resp = createCorsPreflightResponse('https://admin.lythaus.co');
    expect(resp.status).toBe(204);
    const h = resp.headers as Record<string, string>;
    expect(h['Access-Control-Allow-Origin']).toBe('https://admin.lythaus.co');
    expect(h['Access-Control-Allow-Credentials']).toBe('true');
    expect(h['Access-Control-Max-Age']).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// Development localhost origins
// ─────────────────────────────────────────────────────────────

describe('CORS – localhost dev origins', () => {
  const DEV_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  for (const devOrigin of DEV_ORIGINS) {
    it(`allows ${devOrigin}`, () => {
      expect(isOriginAllowed(devOrigin)).toBe(true);
    });

    it(`echoes ${devOrigin} in Allow-Origin (no fallback)`, () => {
      const headers = getAdminCorsHeaders(devOrigin);
      expect(headers['Access-Control-Allow-Origin']).toBe(devOrigin);
    });
  }
});
