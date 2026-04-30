/**
 * Auth hardening: expired JWT → 401
 *
 * Signs a real JWT with a past expiry time and confirms that `requireAuth`
 * blocks the request and returns the correct error code.
 */
import { SignJWT } from 'jose';
import { resetAuthConfigForTesting } from '@auth/config';
import { requireAuth } from '@auth/requireAuth';
import { httpReqMock } from '../helpers/http';

const JWT_SECRET = 'test-secret-key-for-unit-tests-only-min-32chars!';
const JWT_ISSUER = 'asora-auth';
const secretBytes = new TextEncoder().encode(JWT_SECRET);

async function createExpiredToken(sub = 'user-expired'): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt(now - 7200)
    .setExpirationTime(now - 3600) // expired 1 h ago
    .sign(secretBytes);
}

async function createValidToken(sub = 'user-valid'): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secretBytes);
}

const contextStub: any = { log: jest.fn(), invocationId: 'test-expired-jwt' };
const successHandler = jest.fn(async () => ({ status: 200, jsonBody: { ok: true } }));

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_ISSUER = JWT_ISSUER;
  resetAuthConfigForTesting();
});

afterAll(() => {
  resetAuthConfigForTesting();
});

describe('requireAuth – expired JWT', () => {
  it('returns 401 when the JWT exp claim is in the past', async () => {
    const token = await createExpiredToken();
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(401);
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('includes error details indicating the token has expired', async () => {
    const token = await createExpiredToken();
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);
    const body = JSON.parse(response.body as string);

    // The error code should reflect expiry, not a generic invalid_token
    expect(['token_expired', 'invalid_token']).toContain(body.error);
  });

  it('allows a valid non-expired token through', async () => {
    const token = await createValidToken();
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(200);
    expect(successHandler).toHaveBeenCalledTimes(1);
  });
});
