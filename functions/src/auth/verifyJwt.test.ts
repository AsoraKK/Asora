import { SignJWT } from 'jose';

import { resetAuthConfigForTesting, verifyAuthorizationHeader } from './verifyJwt';

const JWT_SECRET = '0123456789abcdef0123456789abcdef';
const JWT_ISSUER = 'asora-auth';
const JWT_AUDIENCE = 'lythaus-mobile';

async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
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
      sub: 'user-1',
      role: 'moderator',
      tier: 'premium',
    });

    const principal = await verifyAuthorizationHeader(`Bearer ${token}`);

    expect(principal.sub).toBe('user-1');
    expect(principal.roles).toEqual(['moderator']);
    expect(principal.tier).toBe('premium');
  });

  it('preserves canonical roles claims and deduplicates mixed inputs', async () => {
    const token = await signToken({
      sub: 'user-2',
      role: 'admin',
      roles: ['moderator', 'admin'],
      tier: 'gold',
    });

    const principal = await verifyAuthorizationHeader(`Bearer ${token}`);

    expect(principal.roles).toEqual(['moderator', 'admin']);
  });
});
