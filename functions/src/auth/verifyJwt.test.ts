import { SignJWT } from 'jose';

import { resetAuthConfigForTesting, verifyAuthorizationHeader } from './verifyJwt';

const JWT_SECRET = '0123456789abcdef0123456789abcdef';
const JWT_ISSUER = 'asora-auth';
const JWT_AUDIENCE = 'lythaus-mobile';
const USER_ID = '01944c1d-5672-7000-8000-0c91f95a72a1';
const OTHER_USER_ID = '01944c1d-5672-7001-8000-0c91f95a72a1';

async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT({ type: 'access', ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(JWT_SECRET));
}

describe('verifyAuthorizationHeader', () => {
  beforeEach(() => {
    resetAuthConfigForTesting();
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.JWT_ISSUER = JWT_ISSUER;
    process.env.JWT_AUDIENCE = JWT_AUDIENCE;
  });

  afterEach(() => {
    resetAuthConfigForTesting();
    delete process.env.JWT_SECRET;
    delete process.env.JWT_ISSUER;
    delete process.env.JWT_AUDIENCE;
  });

  it('normalizes a legacy singular role claim into roles', async () => {
    const token = await signToken({
      sub: USER_ID,
      role: 'moderator',
      tier: 'premium',
    });

    const principal = await verifyAuthorizationHeader(`Bearer ${token}`);

    expect(principal.sub).toBe(USER_ID);
    expect(principal.roles).toEqual(['moderator']);
    expect(principal.tier).toBe('premium');
  });

  it('preserves canonical roles claims and deduplicates mixed inputs', async () => {
    const token = await signToken({
      sub: OTHER_USER_ID,
      role: 'admin',
      roles: ['moderator', 'admin'],
      tier: 'gold',
    });

    const principal = await verifyAuthorizationHeader(`Bearer ${token}`);

    expect(principal.roles).toEqual(['moderator', 'admin']);
  });
});
