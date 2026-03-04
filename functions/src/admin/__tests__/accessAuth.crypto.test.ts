/**
 * Cloudflare Access Auth Cryptographic Tests
 * 
 * Tests JWT verification with real RSA keypairs to prove:
 * - Invalid signatures are rejected
 * - Wrong issuer is rejected
 * - Wrong audience is rejected
 * - Expired tokens are rejected
 * - Wrong owner email is rejected (403)
 * - Valid tokens pass
 * - Presence-only (unsigned) tokens are rejected
 * 
 * Uses real RSA key generation and a mock JWKS server.
 */

import * as http from 'http';
import * as jose from 'jose';
import { 
  verifyCloudflareAccess, 
  requireCloudflareAccess,
  clearJWKSCache,
  VerifyOptions 
} from '../accessAuth';

// Test constants
const TEST_ISSUER = 'https://test-team.cloudflareaccess.com';
const TEST_AUDIENCE = 'test-aud-12345';
const TEST_OWNER_EMAIL = 'owner@asora.co.za';
const TEST_OTHER_EMAIL = 'other@example.com';

// RSA key pair (generated once per test suite)
let privateKey: jose.KeyLike;
let publicKey: jose.KeyLike;
let publicJwk: jose.JWK;
const KID = 'test-key-1';

// Mock JWKS server
let jwksServer: http.Server;
let jwksPort: number;

/**
 * Helper to create headers object
 */
function createHeaders(token: string | null): { get(name: string): string | null } {
  return {
    get: (name: string) => {
      if (name === 'Cf-Access-Jwt-Assertion') return token;
      return null;
    },
  };
}

/**
 * Generate a valid JWT with the test private key
 */
async function generateToken(claims: Partial<jose.JWTPayload> & Record<string, unknown> = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const defaultClaims: jose.JWTPayload = {
    iss: TEST_ISSUER,
    aud: TEST_AUDIENCE,
    sub: 'user-123',
    email: TEST_OWNER_EMAIL,
    iat: now,
    exp: now + 3600, // 1 hour from now
  };

  return new jose.SignJWT({ ...defaultClaims, ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .sign(privateKey);
}

/**
 * Generate an expired token
 */
async function generateExpiredToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return generateToken({
    iat: now - 7200, // 2 hours ago
    exp: now - 3600, // 1 hour ago (expired)
  });
}

/**
 * Generate a token with wrong issuer
 */
async function generateWrongIssuerToken(): Promise<string> {
  return generateToken({ iss: 'https://wrong-issuer.com' });
}

/**
 * Generate a token with wrong audience
 */
async function generateWrongAudienceToken(): Promise<string> {
  return generateToken({ aud: 'wrong-audience' });
}

/**
 * Generate a token with different email
 */
async function generateWrongEmailToken(): Promise<string> {
  return generateToken({ email: TEST_OTHER_EMAIL });
}

/**
 * Generate a token without email claim
 */
async function generateNoEmailToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new jose.SignJWT({
    iss: TEST_ISSUER,
    aud: TEST_AUDIENCE,
    sub: 'service-account-123',
    iat: now,
    exp: now + 3600,
    // No email claim
  })
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .sign(privateKey);
}

/**
 * Generate a "presence-only" fake token (looks like JWT but invalid signature)
 */
function generatePresenceOnlyToken(): string {
  // Create a JWT-like structure but with garbage signature
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: KID })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: TEST_ISSUER,
    aud: TEST_AUDIENCE,
    sub: 'attacker',
    email: TEST_OWNER_EMAIL,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  const fakeSignature = Buffer.from('invalid-signature-data').toString('base64url');
  
  return `${header}.${payload}.${fakeSignature}`;
}

/**
 * Generate a token signed with a different (wrong) key
 */
async function generateWrongKeyToken(): Promise<string> {
  // Generate a different key pair
  const { privateKey: wrongKey } = await jose.generateKeyPair('RS256');
  
  const now = Math.floor(Date.now() / 1000);
  return new jose.SignJWT({
    iss: TEST_ISSUER,
    aud: TEST_AUDIENCE,
    sub: 'attacker',
    email: TEST_OWNER_EMAIL,
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'wrong-key-id' })
    .sign(wrongKey);
}

/**
 * Generate an alg:none token (should be rejected)
 */
function generateAlgNoneToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: TEST_ISSUER,
    aud: TEST_AUDIENCE,
    sub: 'attacker',
    email: TEST_OWNER_EMAIL,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  
  return `${header}.${payload}.`;
}

describe('Cloudflare Access JWT Cryptographic Verification', () => {
  beforeAll(async () => {
    // Generate RSA key pair
    const keyPair = await jose.generateKeyPair('RS256');
    privateKey = keyPair.privateKey;
    publicKey = keyPair.publicKey;
    
    // Export public key as JWK
    publicJwk = await jose.exportJWK(publicKey);
    publicJwk.kid = KID;
    publicJwk.use = 'sig';
    publicJwk.alg = 'RS256';

    // Start mock JWKS server
    jwksServer = http.createServer((req, res) => {
      if (req.url === '/cdn-cgi/access/certs') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          keys: [publicJwk],
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => {
      jwksServer.listen(0, '127.0.0.1', () => {
        const addr = jwksServer.address();
        if (addr && typeof addr === 'object') {
          jwksPort = addr.port;
        }
        resolve();
      });
    });

    // Configure environment to use mock JWKS server
    process.env.CF_ACCESS_ISSUER = TEST_ISSUER;
    process.env.CF_ACCESS_AUDIENCE = TEST_AUDIENCE;
    process.env.CF_ACCESS_JWKS_URL = `http://127.0.0.1:${jwksPort}/cdn-cgi/access/certs`;
    process.env.CF_ACCESS_OWNER_EMAIL = TEST_OWNER_EMAIL;
  });

  afterAll(async () => {
    // Clean up
    if (jwksServer) {
      await new Promise<void>((resolve) => jwksServer.close(() => resolve()));
    }
    delete process.env.CF_ACCESS_ISSUER;
    delete process.env.CF_ACCESS_AUDIENCE;
    delete process.env.CF_ACCESS_JWKS_URL;
    delete process.env.CF_ACCESS_OWNER_EMAIL;
  });

  beforeEach(() => {
    // Clear JWKS cache before each test
    clearJWKSCache();
  });

  describe('A) Missing token', () => {
    it('returns 401 MISSING_TOKEN when header is absent', async () => {
      const result = await verifyCloudflareAccess(createHeaders(null));
      
      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('MISSING_TOKEN');
        expect(result.error).toContain('Missing Cf-Access-Jwt-Assertion');
      }
    });

    it('returns 401 via requireCloudflareAccess', async () => {
      const result = await requireCloudflareAccess(createHeaders(null));
      
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.status).toBe(401);
      }
    });
  });

  describe('B) Invalid signature', () => {
    it('rejects presence-only token (fake JWT structure)', async () => {
      const token = generatePresenceOnlyToken();
      const result = await verifyCloudflareAccess(createHeaders(token));
      
      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('INVALID_TOKEN');
      }
    });

    it('rejects token signed with wrong key', async () => {
      const token = await generateWrongKeyToken();
      const result = await verifyCloudflareAccess(createHeaders(token));
      
      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('INVALID_TOKEN');
      }
    });

    it('rejects alg:none token', async () => {
      const token = generateAlgNoneToken();
      const result = await verifyCloudflareAccess(createHeaders(token));
      
      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('INVALID_TOKEN');
      }
    });
  });

  describe('C) Wrong issuer', () => {
    it('rejects token with wrong issuer', async () => {
      const token = await generateWrongIssuerToken();
      const result = await verifyCloudflareAccess(createHeaders(token));
      
      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('INVALID_TOKEN');
      }
    });
  });

  describe('D) Wrong audience', () => {
    it('rejects token with wrong audience', async () => {
      const token = await generateWrongAudienceToken();
      const result = await verifyCloudflareAccess(createHeaders(token));
      
      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('INVALID_TOKEN');
      }
    });
  });

  describe('E) Expired token', () => {
    it('rejects expired token', async () => {
      const token = await generateExpiredToken();
      const result = await verifyCloudflareAccess(createHeaders(token));
      
      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('EXPIRED_TOKEN');
      }
    });
  });

  describe('F) Owner email enforcement', () => {
    it('rejects valid token with wrong email when requireOwner is true', async () => {
      const token = await generateWrongEmailToken();
      const result = await verifyCloudflareAccess(createHeaders(token), { requireOwner: true });
      
      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('FORBIDDEN');
        expect(result.error).toContain('Access restricted to owner');
      }
    });

    it('rejects token without email claim when requireOwner is true', async () => {
      const token = await generateNoEmailToken();
      const result = await verifyCloudflareAccess(createHeaders(token), { requireOwner: true });
      
      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.code).toBe('FORBIDDEN');
        expect(result.error).toContain('email claim');
      }
    });

    it('returns 403 via requireCloudflareAccess when email mismatch', async () => {
      const token = await generateWrongEmailToken();
      const result = await requireCloudflareAccess(createHeaders(token), { requireOwner: true });
      
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.status).toBe(403);
        expect(result.code).toBe('FORBIDDEN');
      }
    });

    it('allows valid token with wrong email when requireOwner is false', async () => {
      const token = await generateWrongEmailToken();
      const result = await verifyCloudflareAccess(createHeaders(token), { requireOwner: false });
      
      expect(result.authenticated).toBe(true);
      if (result.authenticated) {
        expect(result.claims.email).toBe(TEST_OTHER_EMAIL);
      }
    });
  });

  describe('G) Valid token with correct email', () => {
    it('accepts valid token without owner requirement', async () => {
      const token = await generateToken();
      const result = await verifyCloudflareAccess(createHeaders(token));
      
      expect(result.authenticated).toBe(true);
      if (result.authenticated) {
        expect(result.actor).toBe(TEST_OWNER_EMAIL);
        expect(result.claims.email).toBe(TEST_OWNER_EMAIL);
        expect(result.claims.iss).toBe(TEST_ISSUER);
      }
    });

    it('accepts valid token with owner requirement and matching email', async () => {
      const token = await generateToken();
      const result = await verifyCloudflareAccess(createHeaders(token), { requireOwner: true });
      
      expect(result.authenticated).toBe(true);
      if (result.authenticated) {
        expect(result.actor).toBe(TEST_OWNER_EMAIL);
      }
    });

    it('returns claims via requireCloudflareAccess', async () => {
      const token = await generateToken();
      const result = await requireCloudflareAccess(createHeaders(token), { requireOwner: true });
      
      expect('actor' in result).toBe(true);
      if ('actor' in result) {
        expect(result.actor).toBe(TEST_OWNER_EMAIL);
        expect(result.claims.email).toBe(TEST_OWNER_EMAIL);
      }
    });
  });

  describe('Configuration errors', () => {
    it('returns CONFIG_ERROR when issuer not set', async () => {
      const originalIssuer = process.env.CF_ACCESS_ISSUER;
      const originalTeamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
      delete process.env.CF_ACCESS_ISSUER;
      delete process.env.CF_ACCESS_TEAM_DOMAIN;
      
      try {
        const token = await generateToken();
        const result = await verifyCloudflareAccess(createHeaders(token));
        
        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.code).toBe('CONFIG_ERROR');
        }
      } finally {
        process.env.CF_ACCESS_ISSUER = originalIssuer;
        if (originalTeamDomain) process.env.CF_ACCESS_TEAM_DOMAIN = originalTeamDomain;
      }
    });

    it('returns CONFIG_ERROR when audience not set', async () => {
      const originalAud = process.env.CF_ACCESS_AUDIENCE;
      const originalAudLegacy = process.env.CF_ACCESS_AUD;
      delete process.env.CF_ACCESS_AUDIENCE;
      delete process.env.CF_ACCESS_AUD;
      
      try {
        const token = await generateToken();
        const result = await verifyCloudflareAccess(createHeaders(token));
        
        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.code).toBe('CONFIG_ERROR');
        }
      } finally {
        process.env.CF_ACCESS_AUDIENCE = originalAud;
        if (originalAudLegacy) process.env.CF_ACCESS_AUD = originalAudLegacy;
      }
    });

    it('returns CONFIG_ERROR when owner required but not configured', async () => {
      const originalOwner = process.env.CF_ACCESS_OWNER_EMAIL;
      delete process.env.CF_ACCESS_OWNER_EMAIL;
      
      try {
        const token = await generateToken();
        const result = await verifyCloudflareAccess(createHeaders(token), { requireOwner: true });
        
        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.code).toBe('CONFIG_ERROR');
          expect(result.error).toContain('CF_ACCESS_OWNER_EMAIL');
        }
      } finally {
        process.env.CF_ACCESS_OWNER_EMAIL = originalOwner;
      }
    });

    it('returns 500 via requireCloudflareAccess for config errors', async () => {
      const originalAud = process.env.CF_ACCESS_AUDIENCE;
      delete process.env.CF_ACCESS_AUDIENCE;
      delete process.env.CF_ACCESS_AUD;
      
      try {
        const token = await generateToken();
        const result = await requireCloudflareAccess(createHeaders(token));
        
        expect('error' in result).toBe(true);
        if ('error' in result) {
          expect(result.status).toBe(500);
          expect(result.code).toBe('CONFIG_ERROR');
        }
      } finally {
        process.env.CF_ACCESS_AUDIENCE = originalAud;
      }
    });
  });

  describe('Edge cases', () => {
    it('handles audience as array in token', async () => {
      // Cloudflare Access can return aud as array
      const token = await generateToken({ aud: [TEST_AUDIENCE, 'other-aud'] });
      const result = await verifyCloudflareAccess(createHeaders(token));
      
      expect(result.authenticated).toBe(true);
    });

    it('is case-insensitive for email comparison', async () => {
      const token = await generateToken({ email: TEST_OWNER_EMAIL.toUpperCase() });
      const result = await verifyCloudflareAccess(createHeaders(token), { requireOwner: true });
      
      expect(result.authenticated).toBe(true);
    });

    it('falls back to sub claim when email is missing (no owner check)', async () => {
      const token = await generateNoEmailToken();
      const result = await verifyCloudflareAccess(createHeaders(token));
      
      expect(result.authenticated).toBe(true);
      if (result.authenticated) {
        expect(result.actor).toBe('service-account-123');
      }
    });
  });
});
