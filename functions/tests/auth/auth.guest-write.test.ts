/**
 * Auth hardening: unauthenticated guest attempting a write operation → 401
 *
 * Wraps a representative write handler with `requireAuth` and confirms that
 * a request with no Authorization header is blocked before the handler runs.
 */
import { requireAuth } from '@auth/requireAuth';
import { httpReqMock } from '../helpers/http';

const contextStub: any = { log: jest.fn(), invocationId: 'test-guest-write' };

// Simulated write handlers (POST, PATCH, DELETE)
const createPostHandler = jest.fn(async () => ({ status: 201, jsonBody: { id: 'post-1' } }));
const updatePostHandler = jest.fn(async () => ({ status: 200, jsonBody: { ok: true } }));
const deletePostHandler = jest.fn(async () => ({ status: 204 }));

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only-min-32chars!';
  process.env.JWT_ISSUER = 'asora-auth';
});

describe('requireAuth – guest on write endpoints', () => {
  it('blocks guest POST (create) with 401', async () => {
    const handler = requireAuth(createPostHandler);
    const req = httpReqMock({ method: 'POST', url: 'https://api.asora.dev/posts' });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(401);
    expect(createPostHandler).not.toHaveBeenCalled();
  });

  it('blocks guest PATCH (update) with 401', async () => {
    const handler = requireAuth(updatePostHandler);
    const req = httpReqMock({
      method: 'PATCH',
      url: 'https://api.asora.dev/posts/post-1',
    });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(401);
    expect(updatePostHandler).not.toHaveBeenCalled();
  });

  it('blocks guest DELETE with 401', async () => {
    const handler = requireAuth(deletePostHandler);
    const req = httpReqMock({
      method: 'DELETE',
      url: 'https://api.asora.dev/posts/post-1',
    });

    const response = await handler(req, contextStub);

    expect(response.status).toBe(401);
    expect(deletePostHandler).not.toHaveBeenCalled();
  });

  it('provides a WWW-Authenticate Bearer challenge on every 401', async () => {
    const handler = requireAuth(createPostHandler);
    const req = httpReqMock({ method: 'POST' });

    const response = await handler(req, contextStub);

    const wwwAuth = (response.headers as Record<string, string>)?.['WWW-Authenticate'] ?? '';
    expect(wwwAuth).toMatch(/^Bearer /);
  });
});
