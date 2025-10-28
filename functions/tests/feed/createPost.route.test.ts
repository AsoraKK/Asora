import type { HttpRequest, InvocationContext } from '@azure/functions';

import { HttpError } from '@shared/utils/errors';
import { createPost as createPostRoute } from '@feed/routes/createPost';
import { createPost as createPostService } from '@feed/service/feedService';
import { httpReqMock } from '../helpers/http';

jest.mock('@feed/service/feedService', () => ({
  createPost: jest.fn(),
}));

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
      return { kind: 'user', sub: 'user-123', claims: {} } as any;
    });
  });

  it('returns 401 for guest principal', async () => {
    const response = await createPostRoute(guestRequest(), contextStub);
    expect(response.status).toBe(401);
    expect(response.body).toBe(JSON.stringify({ error: 'invalid_request' }));
  });

  it('returns 400 when JSON body is invalid', async () => {
    const request = guestRequest();
    Object.assign(request, {
      headers: new Map([['authorization', 'Bearer valid-token']]),
      json: jest.fn().mockRejectedValue(new Error('bad json')),
    });

    const response = await createPostRoute(request, contextStub);
    expect(contextStub.log).toHaveBeenCalledWith('posts.create.invalid_json');
    expect(response.status).toBe(400);
    expect(response.body).toBe(JSON.stringify({ error: 'Invalid JSON payload' }));
  });

  it('maps HttpError from service into response', async () => {
    const service = createPostService as jest.MockedFunction<typeof createPostService>;
    service.mockRejectedValueOnce(new HttpError(409, 'duplicate', { 'Retry-After': '10' }));

    const response = await createPostRoute(userRequest({ text: 'hello world' }), contextStub);
    expect(service).toHaveBeenCalled();
    expect(response.status).toBe(409);
    expect(response.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Retry-After': '10',
    });
    expect(response.body).toBe(JSON.stringify({ error: 'duplicate' }));
  });

  it('returns 500 for unexpected service failure', async () => {
    const service = createPostService as jest.MockedFunction<typeof createPostService>;
    service.mockRejectedValueOnce(new Error('boom'));

    const response = await createPostRoute(userRequest({ text: 'hello world' }), contextStub);
    expect(contextStub.log).toHaveBeenCalledWith(
      'posts.create.error',
      expect.objectContaining({ message: 'boom' })
    );
    expect(response.status).toBe(500);
    expect(response.body).toBe(JSON.stringify({ error: 'internal' }));
  });

  it('returns created response on success and merges headers', async () => {
    const service = createPostService as jest.MockedFunction<typeof createPostService>;
    service.mockResolvedValueOnce({
      body: { id: 'post-1' },
      headers: { 'x-request-id': 'req-123' },
    });

    const response = await createPostRoute(userRequest({ text: 'hello world' }), contextStub);
    expect(service).toHaveBeenCalledWith({
      principal: expect.objectContaining({ kind: 'user', sub: 'user-123' }),
      payload: { text: 'hello world' },
      context: contextStub,
    });
    expect(response.status).toBe(201);
    expect(response.headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-request-id': 'req-123',
    });
    expect(response.body).toBe(JSON.stringify({ id: 'post-1' }));
  });
});
