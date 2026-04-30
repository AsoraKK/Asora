/**
 * Auth hardening: malformed / non-Bearer Authorization header → 401
 *
 * Verifies that `requireAuth` rejects tokens that are present but structurally
 * wrong (wrong scheme, empty credential, gibberish string).
 */
import { requireAuth } from '@auth/requireAuth';
import { httpReqMock } from '../helpers/http';

const contextStub: any = { log: jest.fn(), invocationId: 'test-malformed-token' };

const successHandler = jest.fn(async () => ({ status: 200, jsonBody: { ok: true } }));

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only-min-32chars!';
  process.env.JWT_ISSUER = 'asora-auth';
});

describe('requireAuth – malformed Authorization header', () => {
  it('returns 401 for Basic scheme instead of Bearer', async () => {
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ headers: { authorization: 'Basic dXNlcjpwYXNz' } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(401);
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('returns 401 for a Bearer token that is plain garbage', async () => {
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ headers: { authorization: 'Bearer not.a.jwt' } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(401);
  });

  it('returns 401 for "Bearer " with no token following', async () => {
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ headers: { authorization: 'Bearer ' } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(401);
  });

  it('returns 401 for a token signed with the wrong secret', async () => {
    // JWT signed with a different secret – verifyJwt will reject it
    // This is a hardcoded minimal HS256 JWT with wrong signature
    const wrongSecretToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' + // {"alg":"HS256","typ":"JWT"}
      '.eyJzdWIiOiJ1c2VyLTEiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0' + // {sub,iat,exp}
      '.INVALIDSIGNATURE';

    const handler = requireAuth(successHandler);
    const req = httpReqMock({ headers: { authorization: `Bearer ${wrongSecretToken}` } });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(401);
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('includes a WWW-Authenticate Bearer challenge on every 401', async () => {
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ headers: { authorization: 'Basic abc' } });

    const response = await handler(req, contextStub);

    const wwwAuth = (response.headers as Record<string, string>)?.['WWW-Authenticate'] ?? '';
    expect(wwwAuth).toMatch(/^Bearer /);
  });
});
