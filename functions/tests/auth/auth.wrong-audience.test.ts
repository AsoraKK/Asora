/**
 * Auth hardening: JWT signed with the wrong audience → 401
 *
 * When JWT_AUDIENCE is configured the middleware must reject tokens that were
 * issued for a different audience.
 */
import { SignJWT } from 'jose';
import { resetAuthConfigForTesting } from '@auth/config';
import { requireAuth } from '@auth/requireAuth';
import { httpReqMock } from '../helpers/http';

const JWT_SECRET = 'test-secret-key-for-unit-tests-only-min-32chars!';
const JWT_ISSUER = 'asora-auth';
const secretBytes = new TextEncoder().encode(JWT_SECRET);

async function createToken(audience?: string): Promise<string> {
  const builder = new SignJWT({ sub: 'user-123' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime('5m');

  if (audience) {
    builder.setAudience(audience);
  }

  return builder.sign(secretBytes);
}

const contextStub: any = { log: jest.fn(), invocationId: 'test-wrong-audience' };
const successHandler = jest.fn(async () => ({ status: 200, jsonBody: { ok: true } }));

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_ISSUER = JWT_ISSUER;
  process.env.JWT_AUDIENCE = 'asora-api';
  resetAuthConfigForTesting();
});

afterEach(() => {
  delete process.env.JWT_AUDIENCE;
});

afterAll(() => {
  resetAuthConfigForTesting();
});

describe('requireAuth – wrong audience', () => {
  it('returns 401 when token audience does not match JWT_AUDIENCE', async () => {
    const token = await createToken('wrong-service');
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(401);
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('includes an error body when audience is rejected', async () => {
    const token = await createToken('wrong-service');
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);
    const body = JSON.parse(response.body as string);

    expect(body).toHaveProperty('error');
  });

  it('accepts the token when audience matches JWT_AUDIENCE', async () => {
    const token = await createToken('asora-api');
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(200);
    expect(successHandler).toHaveBeenCalledTimes(1);
  });
});
