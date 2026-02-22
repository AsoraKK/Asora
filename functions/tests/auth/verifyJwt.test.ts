import { jest } from '@jest/globals';
import { SignJWT } from 'jose';

import { resetAuthConfigForTesting } from '@auth/config';
import { tryGetPrincipal, verifyAuthorizationHeader } from '@auth/verifyJwt';

const JWT_SECRET = 'test-secret-key-for-unit-tests-only-min-32chars!';
const JWT_ISSUER = 'asora-auth';
const secretBytes = new TextEncoder().encode(JWT_SECRET);

async function createToken(
  claims: Record<string, unknown>,
  options: {
    issuer?: string;
    audience?: string;
    expirationTime?: string | number;
    notBefore?: string | number;
  } = {},
): Promise<string> {
  const jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(options.issuer ?? JWT_ISSUER)
    .setIssuedAt();

  if (options.audience) {
    jwt.setAudience(options.audience);
  }

  if (options.expirationTime !== undefined) {
    jwt.setExpirationTime(options.expirationTime);
  } else {
    jwt.setExpirationTime('5m');
  }

  if (options.notBefore !== undefined) {
    jwt.setNotBefore(options.notBefore);
  } else {
    jwt.setNotBefore('0s');
  }

  return jwt.sign(secretBytes);
}

function setEnv(overrides: Record<string, string> = {}): void {
  Object.assign(process.env, {
    JWT_SECRET,
    JWT_ISSUER,
    AUTH_MAX_SKEW_SECONDS: '120',
    ...overrides,
  });
  resetAuthConfigForTesting();
}

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
    expect(principal.scp).toBe('feed.read');
  });

  it('extracts email, name, tier, and roles', async () => {
    const token = await createToken({
      sub: 'user-456',
      email: 'test@example.com',
      name: 'Test User',
      tier: 'pro',
      roles: ['admin', 'moderator'],
    });

    const principal = await verifyAuthorizationHeader(`Bearer ${token}`);
    expect(principal.sub).toBe('user-456');
    expect(principal.email).toBe('test@example.com');
    expect(principal.name).toBe('Test User');
    expect(principal.tier).toBe('pro');
    expect(principal.roles).toEqual(['admin', 'moderator']);
  });

  it('throws invalid_signature when secret does not match', async () => {
    const wrongSecret = new TextEncoder().encode('wrong-secret-key-for-test-purposes-min-32!');
    const token = await new SignJWT({ sub: 'user-123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(JWT_ISSUER)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(wrongSecret);

    await expect(verifyAuthorizationHeader(`Bearer ${token}`)).rejects.toMatchObject({
      code: 'invalid_signature',
    });
  });

  it('throws invalid_issuer when issuer mismatches', async () => {
    const token = await createToken({ sub: 'user-123' }, { issuer: 'https://other/' });

    await expect(verifyAuthorizationHeader(`Bearer ${token}`)).rejects.toMatchObject({
      code: 'invalid_issuer',
    });
  });

  it('throws invalid_audience when audience is not accepted', async () => {
    setEnv({ JWT_AUDIENCE: 'expected-audience' });
    const token = await createToken({ sub: 'user-123' }, { audience: 'wrong-audience' });

    await expect(verifyAuthorizationHeader(`Bearer ${token}`)).rejects.toMatchObject({
      code: 'invalid_audience',
    });
  });

  it('accepts token when audience matches', async () => {
    setEnv({ JWT_AUDIENCE: 'my-audience' });
    const token = await createToken({ sub: 'user-123' }, { audience: 'my-audience' });

    const principal = await verifyAuthorizationHeader(`Bearer ${token}`);
    expect(principal.sub).toBe('user-123');
  });

  it('skips audience check when JWT_AUDIENCE not set', async () => {
    setEnv();
    delete process.env.JWT_AUDIENCE;
    resetAuthConfigForTesting();
    const token = await createToken({ sub: 'user-123' }, { audience: 'any-audience' });

    const principal = await verifyAuthorizationHeader(`Bearer ${token}`);
    expect(principal.sub).toBe('user-123');
  });

  it('throws token_expired when exp is in the past', async () => {
    setEnv({ AUTH_MAX_SKEW_SECONDS: '1' });
    const now = Math.floor(Date.now() / 1000);
    const token = await createToken(
      { sub: 'user-123' },
      { expirationTime: now - 1800 },
    );

    await expect(verifyAuthorizationHeader(`Bearer ${token}`)).rejects.toMatchObject({
      code: 'token_expired',
    });
  });

  it('throws token_not_yet_valid when nbf is in the future', async () => {
    setEnv({ AUTH_MAX_SKEW_SECONDS: '1' });
    const now = Math.floor(Date.now() / 1000);
    const token = await createToken(
      { sub: 'user-123' },
      { notBefore: now + 600, expirationTime: now + 3600 },
    );

    await expect(verifyAuthorizationHeader(`Bearer ${token}`)).rejects.toMatchObject({
      code: 'token_not_yet_valid',
    });
  });

  it('throws invalid_claim when sub is missing', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(JWT_ISSUER)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(secretBytes);

    await expect(verifyAuthorizationHeader(`Bearer ${token}`)).rejects.toMatchObject({
      code: 'invalid_claim',
    });
  });

  it('throws invalid_request when header is missing', async () => {
    await expect(verifyAuthorizationHeader(null)).rejects.toMatchObject({
      code: 'invalid_request',
    });
  });

  it('throws invalid_request when header is not Bearer', async () => {
    await expect(verifyAuthorizationHeader('Basic abc')).rejects.toMatchObject({
      code: 'invalid_request',
    });
  });
});

describe('tryGetPrincipal', () => {
  it('returns null when header missing', async () => {
    const principal = await tryGetPrincipal(null);
    expect(principal).toBeNull();
  });

  it('returns null for invalid tokens without throwing', async () => {
    const wrongSecret = new TextEncoder().encode('wrong-secret-for-try-principal-test-min-32!');
    const token = await new SignJWT({ sub: 'user-123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(JWT_ISSUER)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(wrongSecret);

    const principal = await tryGetPrincipal(`Bearer ${token}`);
    expect(principal).toBeNull();
  });

  it('returns principal for valid token', async () => {
    const token = await createToken({ sub: 'user-789' });
    const principal = await tryGetPrincipal(`Bearer ${token}`);
    expect(principal?.sub).toBe('user-789');
  });
});
