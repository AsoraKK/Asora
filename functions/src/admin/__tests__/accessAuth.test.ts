/**
 * Cloudflare Access Auth Tests
 * 
 * Tests for JWT verification and actor extraction.
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

// Mock jose module
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
  errors: {
    JWTExpired: mockErrors.MockJWTExpired,
    JWTClaimValidationFailed: mockErrors.MockJWTClaimValidationFailed,
    JWSSignatureVerificationFailed: mockErrors.MockJWSSignatureVerificationFailed,
  },
}));

import { verifyCloudflareAccess, AccessAuthOutcome } from '../accessAuth';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;
const mockCreateRemoteJWKSet = createRemoteJWKSet as jest.MockedFunction<typeof createRemoteJWKSet>;

describe('verifyCloudflareAccess', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      CF_ACCESS_TEAM_DOMAIN: 'asorateam',
      CF_ACCESS_AUD: 'test-audience-id',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('missing token', () => {
    it('returns error when Cf-Access-Jwt-Assertion header is missing', async () => {
      const headers = {
        get: jest.fn().mockReturnValue(null),
      };

      const result = await verifyCloudflareAccess(headers);

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('MISSING_TOKEN');
        expect(result.error).toContain('Missing Cf-Access-Jwt-Assertion');
      }
    });

    it('returns error when header is empty string', async () => {
      const headers = {
        get: jest.fn().mockReturnValue(''),
      };

      const result = await verifyCloudflareAccess(headers);

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('MISSING_TOKEN');
      }
    });
  });

  describe('configuration errors', () => {
    it('returns error when CF_ACCESS_TEAM_DOMAIN is not set', async () => {
      delete process.env.CF_ACCESS_TEAM_DOMAIN;

      const headers = {
        get: jest.fn().mockReturnValue('valid-token'),
      };

      const result = await verifyCloudflareAccess(headers);

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('CONFIG_ERROR');
        expect(result.error).toContain('CF_ACCESS_TEAM_DOMAIN');
      }
    });

    it('returns error when CF_ACCESS_AUD is not set', async () => {
      delete process.env.CF_ACCESS_AUD;

      const headers = {
        get: jest.fn().mockReturnValue('valid-token'),
      };

      const result = await verifyCloudflareAccess(headers);

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('CONFIG_ERROR');
        expect(result.error).toContain('CF_ACCESS_AUDIENCE');
      }
    });
  });

  describe('valid token', () => {
    it('returns authenticated result with email as actor', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'admin@asora.co.za',
        iss: 'https://asorateam.cloudflareaccess.com',
        aud: ['test-audience-id'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwtVerify.mockResolvedValueOnce({
        payload: mockPayload,
        protectedHeader: { alg: 'RS256' },
      } as any);

      const headers = {
        get: jest.fn().mockReturnValue('valid-jwt-token'),
      };

      const result = await verifyCloudflareAccess(headers);

      expect(result.authenticated).toBe(true);
      if (result.authenticated) {
        expect(result.actor).toBe('admin@asora.co.za');
        expect(result.claims.email).toBe('admin@asora.co.za');
      }
    });

    it('uses sub claim when email is not present', async () => {
      const mockPayload = {
        sub: 'service-account-123',
        iss: 'https://asorateam.cloudflareaccess.com',
        aud: ['test-audience-id'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwtVerify.mockResolvedValueOnce({
        payload: mockPayload,
        protectedHeader: { alg: 'RS256' },
      } as any);

      const headers = {
        get: jest.fn().mockReturnValue('valid-jwt-token'),
      };

      const result = await verifyCloudflareAccess(headers);

      expect(result.authenticated).toBe(true);
      if (result.authenticated) {
        expect(result.actor).toBe('service-account-123');
      }
    });

    it('verifies JWT with correct issuer and audience', async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: {
          sub: 'user-123',
          email: 'test@example.com',
          iss: 'https://asorateam.cloudflareaccess.com',
          aud: ['test-audience-id'],
        },
        protectedHeader: { alg: 'RS256' },
      } as any);

      const headers = {
        get: jest.fn().mockReturnValue('valid-jwt-token'),
      };

      await verifyCloudflareAccess(headers);

      // Verify jwtVerify was called with expected options
      expect(mockJwtVerify).toHaveBeenCalledWith(
        'valid-jwt-token',
        expect.anything(), // JWKS function
        expect.objectContaining({
          issuer: 'https://asorateam.cloudflareaccess.com',
          audience: 'test-audience-id',
        })
      );
    });
  });

  describe('invalid token', () => {
    it('returns EXPIRED_TOKEN for expired JWT', async () => {
      mockJwtVerify.mockRejectedValueOnce(new mockErrors.MockJWTExpired('JWT expired'));

      const headers = {
        get: jest.fn().mockReturnValue('expired-jwt-token'),
      };

      const result = await verifyCloudflareAccess(headers);

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('EXPIRED_TOKEN');
      }
    });

    it('returns INVALID_TOKEN for signature verification failure', async () => {
      mockJwtVerify.mockRejectedValueOnce(new mockErrors.MockJWSSignatureVerificationFailed('signature verification failed'));

      const headers = {
        get: jest.fn().mockReturnValue('tampered-jwt-token'),
      };

      const result = await verifyCloudflareAccess(headers);

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('INVALID_TOKEN');
      }
    });

    it('returns INVALID_TOKEN for malformed token', async () => {
      mockJwtVerify.mockRejectedValueOnce(new Error('Invalid Compact JWS'));

      const headers = {
        get: jest.fn().mockReturnValue('not-a-valid-jwt'),
      };

      const result = await verifyCloudflareAccess(headers);

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('INVALID_TOKEN');
      }
    });
  });
});
