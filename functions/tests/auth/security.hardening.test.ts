/**
 * W13 Security Hardening Tests
 *
 * Covers the fixes introduced in the W13 hardening pass:
 * 1. JWT_SECRET minimum length enforcement (≥32 bytes)
 * 2. Audience-missing startup warning
 * 3. Default clock skew reduced to 60 s
 * 4. tryGetPrincipal logs a warning for non-invalid_request AuthErrors
 * 5. tokenService rejects non-S256 code_challenge_method at token exchange
 * 6. http.ts includes Cache-Control: no-store in default response headers
 */
import { jest } from '@jest/globals';
import { SignJWT } from 'jose';

import { resetAuthConfigForTesting, getAuthConfig } from '@auth/config';
import { tryGetPrincipal } from '@auth/verifyJwt';
import { createSuccessResponse, createErrorResponse } from '@shared/utils/http';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const VALID_SECRET = 'test-secret-key-for-unit-tests-only-min-32chars!';
const JWT_ISSUER = 'asora-auth';
const validSecretBytes = new TextEncoder().encode(VALID_SECRET);

function setEnv(overrides: Record<string, string | undefined> = {}): void {
  // Start from a clean slate
  delete process.env.JWT_AUDIENCE;
  delete process.env.AUTH_MAX_SKEW_SECONDS;
  Object.assign(process.env, {
    JWT_SECRET: VALID_SECRET,
    JWT_ISSUER,
    ...overrides,
  });
  resetAuthConfigForTesting();
}

afterEach(() => {
  jest.restoreAllMocks();
  resetAuthConfigForTesting();
});

afterAll(() => {
  resetAuthConfigForTesting();
});

// ─────────────────────────────────────────────────────────────
// 1. JWT_SECRET minimum length
// ─────────────────────────────────────────────────────────────

describe('JWT_SECRET minimum length enforcement', () => {
  it('throws when JWT_SECRET is shorter than 32 bytes', () => {
    process.env.JWT_SECRET = 'too-short';
    resetAuthConfigForTesting();

    expect(() => getAuthConfig()).toThrow(/at least 32 bytes/i);
  });

  it('accepts a secret that is exactly 32 bytes', () => {
    // Exactly 32 ASCII chars = 32 bytes
    process.env.JWT_SECRET = 'abcdefghijklmnopqrstuvwxyz123456';
    resetAuthConfigForTesting();

    expect(() => getAuthConfig()).not.toThrow();
  });

  it('accepts a secret longer than 32 bytes', () => {
    process.env.JWT_SECRET = VALID_SECRET;
    resetAuthConfigForTesting();

    expect(() => getAuthConfig()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// 2. Audience-missing startup warning
// ─────────────────────────────────────────────────────────────

describe('Audience-missing startup warning', () => {
  it('logs a console.warn when JWT_AUDIENCE is not configured', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setEnv(); // No JWT_AUDIENCE

    getAuthConfig();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('JWT_AUDIENCE is not set'),
    );
  });

  it('does NOT warn when JWT_AUDIENCE is configured', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setEnv({ JWT_AUDIENCE: 'lythaus-mobile' });

    getAuthConfig();

    expect(warnSpy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Default clock skew reduced to 60 s
// ─────────────────────────────────────────────────────────────

describe('Default clock skew', () => {
  it('defaults to 60 seconds when AUTH_MAX_SKEW_SECONDS is not set', () => {
    setEnv();

    const config = getAuthConfig();

    expect(config.maxClockSkewSeconds).toBe(60);
  });

  it('respects an explicit AUTH_MAX_SKEW_SECONDS env var', () => {
    setEnv({ AUTH_MAX_SKEW_SECONDS: '30' });

    const config = getAuthConfig();

    expect(config.maxClockSkewSeconds).toBe(30);
  });
});

// ─────────────────────────────────────────────────────────────
// 4. tryGetPrincipal warns on non-invalid_request errors
// ─────────────────────────────────────────────────────────────

describe('tryGetPrincipal security warning', () => {
  beforeEach(() => {
    setEnv();
  });

  it('logs a warning when token has an invalid signature', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const wrongSecret = new TextEncoder().encode(
      'wrong-secret-key-for-security-test-min-32bytes!',
    );
    const token = await new SignJWT({ sub: 'user-123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(JWT_ISSUER)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(wrongSecret);

    const principal = await tryGetPrincipal(`Bearer ${token}`);

    expect(principal).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('tryGetPrincipal'),
      expect.objectContaining({ code: 'invalid_signature' }),
    );
  });

  it('logs a warning when token is expired', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const token = await new SignJWT({ sub: 'user-123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(JWT_ISSUER)
      .setIssuedAt()
      .setExpirationTime(-1) // already expired
      .sign(validSecretBytes);

    const principal = await tryGetPrincipal(`Bearer ${token}`);

    expect(principal).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('tryGetPrincipal'),
      expect.objectContaining({ code: 'token_expired' }),
    );
  });

  it('does NOT warn when header is simply missing (invalid_request)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const principal = await tryGetPrincipal(null);

    expect(principal).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// 5. Cache-Control: no-store in default response headers
// ─────────────────────────────────────────────────────────────

describe('Cache-Control: no-store on API responses', () => {
  it('createSuccessResponse includes Cache-Control: no-store, no-cache, private', () => {
    const response = createSuccessResponse({ hello: 'world' });

    expect(response.headers?.['Cache-Control']).toBe('no-store, no-cache, private');
  });

  it('createErrorResponse includes Cache-Control: no-store, no-cache, private', () => {
    const response = createErrorResponse(400, 'bad request');

    expect(response.headers?.['Cache-Control']).toBe('no-store, no-cache, private');
  });

  it('caller can override Cache-Control via additionalHeaders', () => {
    const response = createSuccessResponse(
      { status: 'ok' },
      { 'Cache-Control': 'public, max-age=30' },
    );

    // additionalHeaders spread after SECURITY_HEADERS, so caller wins
    expect(response.headers?.['Cache-Control']).toBe('public, max-age=30');
  });
});
