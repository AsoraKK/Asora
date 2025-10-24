import type { HttpRequest, InvocationContext } from '@azure/functions';
import jwt from 'jsonwebtoken';

import { HttpError } from '@shared/utils/errors';
import { createPost as createPostRoute } from '@feed/routes/createPost';
import { createPost as createPostService } from '@feed/service/feedService';
import { httpReqMock } from '../helpers/http';

jest.mock('@feed/service/feedService', () => ({
  createPost: jest.fn(),
}));

const originalSecret = process.env.JWT_SECRET;
const contextStub = { log: jest.fn() } as unknown as InvocationContext;

function guestRequest(): HttpRequest {
  return httpReqMock({ method: 'POST' });
}

function userToken(overrides: Record<string, unknown> = {}) {
  return jwt.sign({ sub: 'user-123', ...overrides }, process.env.JWT_SECRET!, {
    algorithm: 'HS256',
  });
}

function userRequest(body?: unknown): HttpRequest {
  const token = userToken();
  return httpReqMock({
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body,
  });
}

describe('createPost route', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    contextStub.log = jest.fn();
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('returns 401 for guest principal', async () => {
    const response = await createPostRoute(guestRequest(), contextStub);
    expect(response.status).toBe(401);
    expect(response.body).toBe(JSON.stringify({ error: 'unauthorized' }));
  });

  it('returns 400 when JSON body is invalid', async () => {
    const request = guestRequest();
    Object.assign(request, {
      headers: new Map([['authorization', `Bearer ${userToken()}`]]),
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
    expect(contextStub.log).toHaveBeenCalledWith('posts.create.error', expect.any(Error));
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
      principal: expect.objectContaining({ kind: 'user', id: 'user-123' }),
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
