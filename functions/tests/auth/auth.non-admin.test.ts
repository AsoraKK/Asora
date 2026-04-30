/**
 * Auth hardening: authenticated user without the required role → 403
 *
 * Tests `requireAdmin` and `requireModerator` role guards to confirm that
 * a valid JWT holder who lacks the necessary role receives 403, not 401.
 */
import { SignJWT } from 'jose';
import { resetAuthConfigForTesting } from '@auth/config';
import { requireAdmin, requireModerator } from '@auth/requireRoles';
import { httpReqMock } from '../helpers/http';

const JWT_SECRET = 'test-secret-key-for-unit-tests-only-min-32chars!';
const JWT_ISSUER = 'asora-auth';
const secretBytes = new TextEncoder().encode(JWT_SECRET);

async function createToken(sub: string, roles: string[] = []): Promise<string> {
  return new SignJWT({ sub, roles })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secretBytes);
}

const contextStub: any = { log: jest.fn(), invocationId: 'test-non-admin' };
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

describe('requireAdmin – non-admin user', () => {
  it('returns 403 for a user with no roles', async () => {
    const token = await createToken('user-no-roles', []);
    const handler = requireAdmin(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(403);
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('returns 403 for a user with moderator role but not admin', async () => {
    const token = await createToken('user-mod-only', ['moderator']);
    const handler = requireAdmin(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(403);
  });

  it('returns structured error body with error="forbidden" and code="insufficient_permissions"', async () => {
    const token = await createToken('user-no-roles', []);
    const handler = requireAdmin(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);
    const body = JSON.parse(response.body as string);

    expect(body.error).toBe('forbidden');
    expect(body.code).toBe('insufficient_permissions');
    expect(Array.isArray(body.requiredRoles)).toBe(true);
    expect(body.requiredRoles).toContain('admin');
  });

  it('allows a user with the admin role through', async () => {
    const token = await createToken('user-admin', ['admin']);
    const handler = requireAdmin(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(200);
    expect(successHandler).toHaveBeenCalledTimes(1);
  });
});

describe('requireModerator – non-moderator user', () => {
  it('returns 403 for a plain user trying to access moderator endpoint', async () => {
    const token = await createToken('user-plain', ['user']);
    const handler = requireModerator(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(403);
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('returns 401 when there is no token at all', async () => {
    const handler = requireModerator(successHandler);
    const req = httpReqMock({ method: 'GET' });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(401);
  });

  it('allows a user with the moderator role through', async () => {
    const token = await createToken('user-mod', ['moderator']);
    const handler = requireModerator(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(200);
  });
});
