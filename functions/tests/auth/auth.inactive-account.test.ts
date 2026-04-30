/**
 * Auth hardening: disabled admin account → 403
 *
 * `requireActiveAdmin` wraps `requireAdmin` and performs a Cosmos DB lookup.
 * When `isActive === false` on the user record the middleware returns 403
 * with `error: "account_disabled"` before the downstream handler is called.
 */
import { SignJWT } from 'jose';
import { resetAuthConfigForTesting } from '@auth/config';
import { requireActiveAdmin, requireActiveModerator } from '@admin/adminAuthUtils';
import { httpReqMock } from '../helpers/http';

// ─────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────

const mockUserRead = jest.fn();

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(() => ({
    container: jest.fn(() => ({
      item: jest.fn(() => ({ read: mockUserRead })),
    })),
  })),
}));

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-secret-key-for-unit-tests-only-min-32chars!';
const JWT_ISSUER = 'asora-auth';
const secretBytes = new TextEncoder().encode(JWT_SECRET);

async function createToken(sub: string, roles: string[]): Promise<string> {
  return new SignJWT({ sub, roles })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secretBytes);
}

const contextStub: any = { log: jest.fn(), invocationId: 'test-inactive-account' };
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

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe('requireActiveAdmin – disabled account', () => {
  it('returns 403 with account_disabled when isActive is false', async () => {
    mockUserRead.mockResolvedValue({ resource: { id: 'admin-1', isActive: false } });

    const token = await createToken('admin-1', ['admin']);
    const handler = requireActiveAdmin(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(403);
    const body = JSON.parse(response.body as string);
    expect(body.error).toBe('account_disabled');
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('returns 403 when the Cosmos read returns no resource', async () => {
    mockUserRead.mockResolvedValue({ resource: null });

    const token = await createToken('admin-ghost', ['admin']);
    const handler = requireActiveAdmin(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(403);
  });

  it('returns 403 when the Cosmos lookup throws', async () => {
    mockUserRead.mockRejectedValue(new Error('Cosmos timeout'));

    const token = await createToken('admin-2', ['admin']);
    const handler = requireActiveAdmin(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(403);
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('calls the handler when the admin is active', async () => {
    mockUserRead.mockResolvedValue({ resource: { id: 'admin-3', isActive: true } });

    const token = await createToken('admin-3', ['admin']);
    const handler = requireActiveAdmin(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(200);
    expect(successHandler).toHaveBeenCalledTimes(1);
  });
});

describe('requireActiveModerator – disabled account', () => {
  it('returns 403 when moderator account is disabled', async () => {
    mockUserRead.mockResolvedValue({ resource: { id: 'mod-1', isActive: false } });

    const token = await createToken('mod-1', ['moderator']);
    const handler = requireActiveModerator(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${token}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(403);
    const body = JSON.parse(response.body as string);
    expect(body.error).toBe('account_disabled');
  });

  it('returns 401 when there is no token', async () => {
    const handler = requireActiveModerator(successHandler);
    const req = httpReqMock({ method: 'GET' });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(401);
  });
});
