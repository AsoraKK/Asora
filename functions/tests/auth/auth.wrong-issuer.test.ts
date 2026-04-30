/**
 * Auth hardening: JWT signed with the wrong issuer → 401
 *
 * The middleware must reject tokens whose `iss` claim does not match the
 * configured JWT_ISSUER, even when the signature itself is valid.
 */
import { SignJWT } from 'jose';
import { resetAuthConfigForTesting } from '@auth/config';
import { requireAuth } from '@auth/requireAuth';
import { httpReqMock } from '../helpers/http';

const JWT_SECRET = 'test-secret-key-for-unit-tests-only-min-32chars!';
const secretBytes = new TextEncoder().encode(JWT_SECRET);

async function createToken(issuer: string): Promise<string> {
  return new SignJWT({ sub: 'user-123' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secretBytes);
}

const contextStub: any = { log: jest.fn(), invocationId: 'test-wrong-issuer' };
const successHandler = jest.fn(async () => ({ status: 200, jsonBody: { ok: true } }));

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_ISSUER = 'asora-auth';
  resetAuthConfigForTesting();
});

afterAll(() => {
  resetAuthConfigForTesting();
});

describe('requireAuth – wrong issuer', () => {
  it('returns 401 when token issuer does not match JWT_ISSUER', async () => {
    const token = await createToken('https://evil-auth.example.com');
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(401);
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('includes an error body with the rejection reason', async () => {
    const token = await createToken('https://attacker.example.com');
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);
    const body = JSON.parse(response.body as string);

    expect(body).toHaveProperty('error');
    // message is in WWW-Authenticate header, not the body
    expect(typeof body.error).toBe('string');
  });

  it('accepts the token when issuer matches JWT_ISSUER', async () => {
    const token = await createToken('asora-auth');
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(200);
    expect(successHandler).toHaveBeenCalledTimes(1);
  });
});
