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

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(() => ({
    posts: {
      items: {
        create: jest.fn().mockResolvedValue({
          resource: {
            id: 'test-post-id',
            postId: 'test-post-id',
            text: 'hello world',
            mediaUrl: null,
            authorId: 'user-123',
            visibility: 'public',
            status: 'published',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            stats: { likes: 0, comments: 0, replies: 0 },
          },
          requestCharge: 5.5,
        }),
      },
    },
  })),
}));

jest.mock('@shared/appInsights', () => ({
  trackAppEvent: jest.fn(),
  trackAppMetric: jest.fn(),
}));

const { AuthError } = jest.requireActual('@auth/verifyJwt');
const verifyMock = jest.mocked(require('@auth/verifyJwt').verifyAuthorizationHeader);
const { getTargetDatabase } = require('@shared/clients/cosmos');
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

  it('returns 201 with post data for authenticated user', async () => {
    const response = await createPostRoute(userRequest({ text: 'hello world' }), contextStub);
    expect(response.status).toBe(201);
    const body = JSON.parse(response.body as string);
    expect(body.status).toBe('success');
    expect(body.post).toBeDefined();
    expect(body.post.text).toBe('hello world');
    expect(contextStub.log).toHaveBeenCalledWith('posts.create.success', expect.any(Object));
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

  it('returns 400 when text is empty', async () => {
    const response = await createPostRoute(userRequest({ text: '' }), contextStub);
    expect(response.status).toBe(400);
    expect(response.body).toBe(JSON.stringify({ error: 'Post text is required' }));
  });

  it('returns 400 when text is whitespace only', async () => {
    const response = await createPostRoute(userRequest({ text: '   ' }), contextStub);
    expect(response.status).toBe(400);
    expect(response.body).toBe(JSON.stringify({ error: 'Post text is required' }));
  });

  it('returns 400 when text exceeds max length', async () => {
    const longText = 'a'.repeat(5001);
    const response = await createPostRoute(userRequest({ text: longText }), contextStub);
    expect(response.status).toBe(400);
    expect(response.body).toContain('exceeds maximum length');
  });

  it('returns 400 for invalid media URL', async () => {
    const response = await createPostRoute(
      userRequest({ text: 'hello', mediaUrl: 'http://malicious.com/evil.jpg' }),
      contextStub
    );
    expect(response.status).toBe(400);
    expect(response.body).toBe(JSON.stringify({ error: 'Invalid media URL format' }));
  });

  it('accepts valid Azure Blob Storage media URL', async () => {
    const response = await createPostRoute(
      userRequest({ text: 'hello', mediaUrl: 'https://asora.blob.core.windows.net/media/image.jpg' }),
      contextStub
    );
    expect(response.status).toBe(201);
  });

  it('handles Cosmos create error gracefully', async () => {
    getTargetDatabase.mockReturnValueOnce({
      posts: {
        items: {
          create: jest.fn().mockRejectedValue(new Error('Cosmos connection failed')),
        },
      },
    });

    const response = await createPostRoute(userRequest({ text: 'hello world' }), contextStub);
    expect(response.status).toBe(500);
    expect(contextStub.log).toHaveBeenCalledWith('posts.create.error', expect.any(Object));
  });
});
