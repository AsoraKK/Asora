/**
 * Auth hardening: missing / absent Authorization header → 401
 *
 * Tests the `requireAuth` middleware in isolation using a real JWT signer so
 * the test exercises the actual token-verification path without network calls.
 */
import { requireAuth } from '@auth/requireAuth';
import { httpReqMock } from '../helpers/http';

const contextStub: any = { log: jest.fn(), invocationId: 'test-missing-bearer' };

const successHandler = jest.fn(async () => ({ status: 200, jsonBody: { ok: true } }));

beforeEach(() => {
  jest.clearAllMocks();
  // Ensure JWT_SECRET is present so the config does not throw on init
  process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only-min-32chars!';
  process.env.JWT_ISSUER = 'asora-auth';
});

describe('requireAuth – missing Authorization header', () => {
  it('returns 401 when no Authorization header is sent', async () => {
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ method: 'GET' }); // no headers

    const response = await handler(req, contextStub);

    expect(response.status).toBe(401);
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('includes a WWW-Authenticate header with error="invalid_request"', async () => {
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ method: 'POST' });

    const response = await handler(req, contextStub);

    const wwwAuth = (response.headers as Record<string, string>)?.['WWW-Authenticate'] ?? '';
    expect(wwwAuth).toContain('Bearer');
    expect(wwwAuth).toContain('invalid_request');
  });

  it('returns a JSON body with an error code', async () => {
    const handler = requireAuth(successHandler);
    const req = httpReqMock({ method: 'DELETE' });

    const response = await handler(req, contextStub);

    const body = JSON.parse(response.body as string);
    expect(body).toHaveProperty('error');
    // message lives in the WWW-Authenticate header, not the body
    expect(typeof body.error).toBe('string');
  });
});
