/**
 * Cloudflare Access Auth Tests
 */

// Mock jose errors for instanceof checks - define before jest.mock
const createMockErrors = () => {
  class MockJWTExpired extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JWTExpired';
    }
  }

  class MockJWTClaimValidationFailed extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JWTClaimValidationFailed';
    }
  }

  class MockJWSSignatureVerificationFailed extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JWSSignatureVerificationFailed';
    }
  }

  return { MockJWTExpired, MockJWTClaimValidationFailed, MockJWSSignatureVerificationFailed };
};

const mockErrors = createMockErrors();

// Mock jose
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
  errors: {
    JWTExpired: mockErrors.MockJWTExpired,
    JWTClaimValidationFailed: mockErrors.MockJWTClaimValidationFailed,
    JWSSignatureVerificationFailed: mockErrors.MockJWSSignatureVerificationFailed,
  },
}));

import { verifyCloudflareAccess, isAccessConfigured } from '../../src/admin/accessAuth';
import { jwtVerify, createRemoteJWKSet, errors as joseErrors } from 'jose';

const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;
const mockCreateRemoteJWKSet = createRemoteJWKSet as jest.MockedFunction<typeof createRemoteJWKSet>;

describe('verifyCloudflareAccess', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      CF_ACCESS_TEAM_DOMAIN: 'asora',
      CF_ACCESS_AUD: 'test-audience-id',
    };
    mockCreateRemoteJWKSet.mockReturnValue(jest.fn() as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createMockHeaders = (token?: string) => ({
    get: (name: string) => {
      if (name === 'Cf-Access-Jwt-Assertion') return token ?? null;
      return null;
    },
  });

  it('returns MISSING_TOKEN when header is absent', async () => {
    const result = await verifyCloudflareAccess(createMockHeaders());

    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.code).toBe('MISSING_TOKEN');
      expect(result.error).toContain('Missing');
    }
  });

  it('returns CONFIG_ERROR when env vars not set', async () => {
    delete process.env.CF_ACCESS_TEAM_DOMAIN;

    const result = await verifyCloudflareAccess(createMockHeaders('some-token'));

    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.code).toBe('CONFIG_ERROR');
    }
  });

  it('returns INVALID_TOKEN on verification failure', async () => {
    mockJwtVerify.mockRejectedValueOnce(new mockErrors.MockJWSSignatureVerificationFailed('signature verification failed'));

    const result = await verifyCloudflareAccess(createMockHeaders('invalid-token'));

    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.code).toBe('INVALID_TOKEN');
    }
  });

  it('returns EXPIRED_TOKEN for expired tokens', async () => {
    mockJwtVerify.mockRejectedValueOnce(new mockErrors.MockJWTExpired('token expired'));

    const result = await verifyCloudflareAccess(createMockHeaders('expired-token'));

    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.code).toBe('EXPIRED_TOKEN');
    }
  });

  it('returns authenticated with email as actor', async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        email: 'kyle.kern@asora.co.za',
        sub: 'user-123',
        aud: ['test-audience-id'],
        iss: 'https://asora.cloudflareaccess.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        type: 'app',
      },
      protectedHeader: { alg: 'RS256' },
    } as any);

    const result = await verifyCloudflareAccess(createMockHeaders('valid-token'));

    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.actor).toBe('kyle.kern@asora.co.za');
      expect(result.claims.email).toBe('kyle.kern@asora.co.za');
    }
  });

  it('uses sub as actor fallback when email missing', async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        sub: 'service-token-123',
        aud: ['test-audience-id'],
        iss: 'https://asora.cloudflareaccess.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        type: 'app',
      },
      protectedHeader: { alg: 'RS256' },
    } as any);

    const result = await verifyCloudflareAccess(createMockHeaders('service-token'));

    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.actor).toBe('service-token-123');
    }
  });
});

describe('isAccessConfigured', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true when both env vars set', () => {
    process.env.CF_ACCESS_TEAM_DOMAIN = 'asora';
    process.env.CF_ACCESS_AUD = 'test-aud';

    expect(isAccessConfigured()).toBe(true);
  });

  it('returns false when team domain missing', () => {
    delete process.env.CF_ACCESS_TEAM_DOMAIN;
    process.env.CF_ACCESS_AUD = 'test-aud';

    expect(isAccessConfigured()).toBe(false);
  });

  it('returns false when audience missing', () => {
    process.env.CF_ACCESS_TEAM_DOMAIN = 'asora';
    delete process.env.CF_ACCESS_AUD;

    expect(isAccessConfigured()).toBe(false);
  });
});
