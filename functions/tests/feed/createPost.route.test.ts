import type { HttpRequest, InvocationContext } from '@azure/functions';

import { createPost as createPostRoute } from '@feed/routes/createPost';
import { httpReqMock } from '../helpers/http';

jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    verifyAuthorizationHeader: jest.fn(),
  };
});

const { AuthError } = jest.requireActual('@auth/verifyJwt');
const verifyMock = jest.mocked(require('@auth/verifyJwt').verifyAuthorizationHeader);
const contextStub = { log: jest.fn() } as unknown as InvocationContext;

function guestRequest(): HttpRequest {
  return httpReqMock({ method: 'POST' });
}

function userRequest(body?: unknown): HttpRequest {
  return httpReqMock({
    method: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    body,
  });
}

describe('createPost route', () => {
  beforeEach(() => {
    contextStub.log = jest.fn();
    jest.clearAllMocks();
    verifyMock.mockImplementation(async header => {
      if (!header) {
        throw new AuthError('invalid_request', 'Authorization header missing');
      }
      if (header.includes('invalid')) {
        throw new AuthError('invalid_token', 'Unable to validate token');
      }
      return { sub: 'user-123', raw: {} } as any;
    });
  });

  it('returns 401 for guest principal', async () => {
    const response = await createPostRoute(guestRequest(), contextStub);
    expect(response.status).toBe(401);
    expect(response.body).toBe(JSON.stringify({ error: 'invalid_request' }));
  });

  it('returns 501 Not Implemented for authenticated user', async () => {
    const response = await createPostRoute(userRequest({ text: 'hello world' }), contextStub);
    expect(response.status).toBe(501);
    expect(response.body).toBe(JSON.stringify({ error: 'Post creation not yet implemented' }));
    expect(contextStub.log).toHaveBeenCalledWith('posts.create.not_implemented');
  });

  it('returns 400 when JSON body is invalid', async () => {
    const request = userRequest();
    Object.assign(request, {
      json: jest.fn().mockRejectedValue(new Error('bad json')),
    });

    const response = await createPostRoute(request, contextStub);
    expect(contextStub.log).toHaveBeenCalledWith('posts.create.invalid_json');
    expect(response.status).toBe(400);
    expect(response.body).toBe(JSON.stringify({ error: 'Invalid JSON payload' }));
  });
});
