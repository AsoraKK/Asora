import { jest } from '@jest/globals';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

import { resetAuthConfigForTesting } from '@auth/config';
import { tryGetPrincipal, verifyAuthorizationHeader } from '@auth/verifyJwt';

jest.mock('@auth/jwks', () => ({
  getSigningKey: jest.fn(),
}));

jest.mock('@auth/b2cOpenIdConfig', () => ({
  getB2COpenIdConfig: jest.fn().mockResolvedValue({
    issuer: 'https://issuer/',
    jwks_uri: 'https://issuer/jwks',
    token_endpoint: 'https://issuer/token',
  }),
}));

const getSigningKeyMock = jest.mocked(require('@auth/jwks').getSigningKey);
const getConfigMock = jest.mocked(require('@auth/b2cOpenIdConfig').getB2COpenIdConfig);

const expectedIssuer = 'https://issuer/';
const expectedAudience = 'api://asora';
const policy = 'B2C_1_POLICY';

let privateKey: CryptoKey;
let publicJwk: any;

async function createToken(
  claims: Record<string, unknown>,
  header: Record<string, unknown> = {},
): Promise<string> {
  const jwt = new SignJWT({ tfp: policy, ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key', ...header })
    .setIssuer(expectedIssuer)
    .setAudience(expectedAudience)
    .setIssuedAt();

  if (!('exp' in claims)) {
    jwt.setExpirationTime('5m');
  }
  if (!('nbf' in claims)) {
    jwt.setNotBefore('0s');
  }

  return jwt.sign(privateKey);
}

function setEnv(overrides: Record<string, string> = {}): void {
  Object.assign(process.env, {
    B2C_TENANT: 'asora',
    B2C_POLICY: policy,
    B2C_EXPECTED_ISSUER: expectedIssuer,
    B2C_EXPECTED_AUDIENCE: expectedAudience,
    AUTH_CACHE_TTL_SECONDS: '3600',
    AUTH_MAX_SKEW_SECONDS: '120',
    ...overrides,
  });
  resetAuthConfigForTesting();
  getSigningKeyMock.mockReset().mockResolvedValue(publicJwk);
  getConfigMock.mockResolvedValue({
    issuer: expectedIssuer,
    jwks_uri: 'https://issuer/jwks',
    token_endpoint: 'https://issuer/token',
  });
}

beforeAll(async () => {
  const { privateKey: priv, publicKey } = await generateKeyPair('RS256');
  privateKey = priv;
  publicJwk = await exportJWK(publicKey);
  publicJwk.kty = 'RSA';
  publicJwk.kid = 'test-key';
});

beforeEach(() => {
  setEnv();
});

afterAll(() => {
  resetAuthConfigForTesting();
});

describe('verifyAuthorizationHeader', () => {
  it('returns principal for a valid token', async () => {
    const token = await createToken({ sub: 'user-123', scp: 'feed.read' });

    const principal = await verifyAuthorizationHeader(`Bearer ${token}`);
    expect(principal.sub).toBe('user-123');
    expect(principal.scopes).toContain('feed.read');
  });

  it('throws invalid_signature when signature does not match', async () => {
    const { publicKey: wrongPublic } = await generateKeyPair('RS256');
    const wrongJwk = await exportJWK(wrongPublic);
    wrongJwk.kty = 'RSA';
    wrongJwk.kid = 'test-key';
    getSigningKeyMock.mockResolvedValueOnce(wrongJwk);

    const token = await createToken({ sub: 'user-123' });

    await expect(verifyAuthorizationHeader(`Bearer ${token}`)).rejects.toMatchObject({
      code: 'invalid_signature',
    });
  });

  it('throws invalid_issuer when issuer mismatches', async () => {
    const token = await new SignJWT({ sub: 'user-123', tfp: policy })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer('https://other/')
      .setAudience(expectedAudience)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    await expect(verifyAuthorizationHeader(`Bearer ${token}`)).rejects.toMatchObject({
      code: 'invalid_issuer',
    });
  });

  it('throws invalid_audience when audience is not accepted', async () => {
    const token = await new SignJWT({ sub: 'user-123', tfp: policy })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(expectedIssuer)
      .setAudience('api://other')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    await expect(verifyAuthorizationHeader(`Bearer ${token}`)).rejects.toMatchObject({
      code: 'invalid_audience',
    });
  });

  it('throws token_expired when exp is in the past', async () => {
    setEnv({ AUTH_MAX_SKEW_SECONDS: '1' });
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ sub: 'user-123', tfp: policy })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(expectedIssuer)
      .setAudience(expectedAudience)
      .setIssuedAt(now - 3600)
      .setExpirationTime(now - 1800)
      .sign(privateKey);

    await expect(verifyAuthorizationHeader(`Bearer ${token}`)).rejects.toMatchObject({
      code: 'token_expired',
    });
  });

  it('throws token_not_yet_valid when nbf is in the future', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ sub: 'user-123', tfp: policy })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(expectedIssuer)
      .setAudience(expectedAudience)
      .setIssuedAt(now)
      .setNotBefore(now + 600)
      .setExpirationTime(now + 3600)
      .sign(privateKey);

    await expect(verifyAuthorizationHeader(`Bearer ${token}`)).rejects.toMatchObject({
      code: 'token_not_yet_valid',
    });
  });

  it('throws invalid_claim when tfp/acr does not match policy', async () => {
    const token = await createToken({ sub: 'user-123', tfp: 'other_policy' });

    await expect(verifyAuthorizationHeader(`Bearer ${token}`)).rejects.toMatchObject({
      code: 'invalid_claim',
    });
  });
});

describe('tryGetPrincipal', () => {
  it('returns null when header missing', async () => {
    const principal = await tryGetPrincipal(null);
    expect(principal).toBeNull();
  });

  it('returns null for invalid tokens without throwing', async () => {
    getSigningKeyMock.mockImplementationOnce(() => {
      throw new Error('no key');
    });

    const token = await createToken({ sub: 'user-123' });
    const principal = await tryGetPrincipal(`Bearer ${token}`);
    expect(principal).toBeNull();
  });
});
