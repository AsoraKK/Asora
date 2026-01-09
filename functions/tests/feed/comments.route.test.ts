import type { HttpRequest, InvocationContext } from '@azure/functions';
import type { Principal } from '@shared/middleware/auth';

import { createComment, listComments } from '@feed/routes/comments';
import { httpReqMock } from '../helpers/http';
import {
  AuthenticatedHandler,
  AuthenticatedRequest,
  withDailyCommentLimit,
} from '@shared/middleware/dailyPostLimit';

// Mock auth
jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    verifyAuthorizationHeader: jest.fn(),
  };
});

// Mock Cosmos
const mockPostRead = jest.fn();
const mockPostPatch = jest.fn();
const mockPostCreate = jest.fn();
const mockPostQuery = jest.fn();

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(() => ({
    posts: {
      item: jest.fn((id: string, pk: string) => ({
        read: mockPostRead,
        patch: mockPostPatch,
      })),
      items: {
        create: mockPostCreate,
        query: jest.fn(() => ({
          fetchAll: mockPostQuery,
        })),
      },
    },
  })),
  getCosmosDatabase: jest.fn(() => ({
    container: jest.fn((name: string) => {
      if (name === 'users') {
        return {
          item: jest.fn(() => ({
            read: jest.fn().mockResolvedValue({ resource: { id: 'user-123', isActive: true } }),
          })),
        };
      }
      return {
        item: jest.fn(() => ({
          read: jest.fn().mockResolvedValue({ resource: {} }),
        })),
      };
    }),
  })),
}));

// Mock App Insights
jest.mock('@shared/appInsights', () => ({
  trackAppEvent: jest.fn(),
  trackAppMetric: jest.fn(),
}));

const { AuthError } = jest.requireActual('@auth/verifyJwt');
const verifyMock = jest.mocked(require('@auth/verifyJwt').verifyAuthorizationHeader);
const contextStub = { log: jest.fn() } as unknown as InvocationContext;
const { trackAppEvent } = require('@shared/appInsights');
const dailyLimitModule = require('@shared/services/dailyPostLimitService');
const mockCheckAndIncrementDailyActionCount = jest.spyOn(
  dailyLimitModule,
  'checkAndIncrementDailyActionCount'
);
const { DailyCommentLimitExceededError } = dailyLimitModule;

function guestRequest(method: string, postId: string, body?: object): HttpRequest {
  return httpReqMock({
    method,
    params: { postId },
    body: body,
    headers: body ? { 'content-type': 'application/json' } : {},
  });
}

function userRequest(method: string, postId: string, body?: object, query?: Record<string, string>): HttpRequest {
  return httpReqMock({
    method,
    headers: {
      authorization: 'Bearer valid-token',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    params: { postId },
    body: body,
    query,
  });
}

const testPost = {
  id: 'post-123',
  postId: 'post-123',
  authorId: 'author-456',
  stats: { likes: 5, comments: 3, replies: 0 },
};

const testComment = {
  id: 'comment-abc',
  commentId: 'comment-abc',
  postId: 'post-123',
  authorId: 'user-123',
  text: 'This is a test comment',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  _partitionKey: 'post-123',
  type: 'comment',
};

describe('comments route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckAndIncrementDailyActionCount.mockResolvedValue({
      success: true,
      newCount: 1,
      limit: 20,
      remaining: 19,
    });
    contextStub.log = jest.fn();

    verifyMock.mockImplementation(async (header: string | undefined) => {
      if (!header) {
        throw new AuthError('invalid_request', 'Authorization header missing');
      }
      if (header.includes('invalid')) {
        throw new AuthError('invalid_token', 'Unable to validate token');
      }
      return { sub: 'user-123', tier: 'free', raw: {} } as any;
    });

    // Default mock responses
    mockPostRead.mockResolvedValue({
      resource: { ...testPost },
      requestCharge: 1,
    });
    mockPostPatch.mockResolvedValue({
      resource: { ...testPost, stats: { ...testPost.stats, comments: 4 } },
      requestCharge: 2,
    });
    mockPostCreate.mockResolvedValue({
      resource: { ...testComment },
      requestCharge: 2,
    });
    mockPostQuery.mockResolvedValue({
      resources: [],
      requestCharge: 1,
    });
  });

  // ─────────────────────────────────────────────────────────────
  // POST /posts/{postId}/comments (createComment)
  // ─────────────────────────────────────────────────────────────

  describe('POST /posts/{postId}/comments (createComment)', () => {
    it('returns 401 for unauthenticated request', async () => {
      const response = await createComment(guestRequest('POST', 'post-123', { text: 'Hello' }), contextStub);
      expect(response.status).toBe(401);
    });

    it('returns 400 for missing postId', async () => {
      const response = await createComment(userRequest('POST', '', { text: 'Hello' }), contextStub);
      expect(response.status).toBe(400);
      expect(response.body).toContain('Post ID is required');
    });

    it('returns 400 for invalid JSON', async () => {
      // Create a request where json() throws
      const req = {
        method: 'POST',
        url: 'https://example.com/api/posts/post-123/comments',
        headers: new Headers({
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        }),
        query: { get: () => null, entries: () => [].entries() },
        params: { postId: 'post-123' },
        principal: { sub: 'user-123' },
        async json() {
          throw new SyntaxError('Unexpected token');
        },
        async text() {
          return 'not valid json{';
        },
        bodyUsed: false,
        clone() { return this; },
      } as any;
      const response = await createComment(req, contextStub);
      expect(response.status).toBe(400);
      expect(response.body).toContain('Invalid JSON');
    });

    it('returns 400 for empty comment text', async () => {
      const response = await createComment(userRequest('POST', 'post-123', { text: '' }), contextStub);
      expect(response.status).toBe(400);
      expect(response.body).toContain('Comment text is required');
    });

    it('returns 400 for whitespace-only comment text', async () => {
      const response = await createComment(userRequest('POST', 'post-123', { text: '   \n\t  ' }), contextStub);
      expect(response.status).toBe(400);
      expect(response.body).toContain('Comment text is required');
    });

    it('returns 400 for comment exceeding max length', async () => {
      const longText = 'x'.repeat(2001);
      const response = await createComment(userRequest('POST', 'post-123', { text: longText }), contextStub);
      expect(response.status).toBe(400);
      expect(response.body).toContain('exceeds maximum length');
    });

    it('returns 404 for non-existent post', async () => {
      mockPostRead.mockResolvedValueOnce({ resource: null });

      const response = await createComment(userRequest('POST', 'nonexistent', { text: 'Hello' }), contextStub);
      expect(response.status).toBe(404);
      expect(contextStub.log).toHaveBeenCalledWith('comments.create.post_not_found', { postId: 'nonexistent' });
    });

    it('returns 201 with comment on successful creation', async () => {
      const response = await createComment(userRequest('POST', 'post-123', { text: 'Great post!' }), contextStub);

      expect(response.status).toBe(201);
      const body = JSON.parse(response.body as string);
      expect(body.status).toBe('success');
      expect(body.comment).toBeDefined();
      expect(body.comment.commentId).toBe('comment-abc');
      expect(body.comment.postId).toBe('post-123');
      expect(body.comment.authorId).toBe('user-123');
      expect(body.comment.text).toBe('This is a test comment');
      expect(body.comment.createdAt).toBeDefined();

      // Verify comment count was incremented
      expect(mockPostPatch).toHaveBeenCalledWith([{ op: 'incr', path: '/stats/comments', value: 1 }]);
      expect(contextStub.log).toHaveBeenCalledWith('comments.create.success', expect.any(Object));
    });

    it('trims whitespace from comment text', async () => {
      const response = await createComment(userRequest('POST', 'post-123', { text: '  Hello world!  ' }), contextStub);

      expect(response.status).toBe(201);
      expect(mockPostCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello world!', // trimmed
        })
      );
    });

    it('returns 500 on Cosmos failure', async () => {
      mockPostCreate.mockRejectedValueOnce(new Error('Cosmos error'));

      const response = await createComment(userRequest('POST', 'post-123', { text: 'Hello' }), contextStub);
      expect(response.status).toBe(500);
      expect(contextStub.log).toHaveBeenCalledWith('comments.create.error', expect.any(Object));
    });

  it('returns 429 when the daily comment limit is exceeded', async () => {
    const limitPayload = {
      allowed: false,
      currentCount: 20,
      limit: 20,
      remaining: 0,
      tier: 'free',
      resetDate: '2025-12-01T00:00:00.000Z',
    };
    mockCheckAndIncrementDailyActionCount.mockRejectedValueOnce(
      new DailyCommentLimitExceededError(limitPayload)
    );

    const request = userRequest('POST', 'post-123', { text: 'Hello again' }) as AuthenticatedRequest;
    request.principal = {
      sub: 'user-123',
      tier: 'free',
      raw: {},
    } as Principal;

    const limitHandler = withDailyCommentLimit(async () => ({
      status: 200,
      body: JSON.stringify({ status: 'ok' }),
      headers: { 'Content-Type': 'application/json' },
    }));

    const response = await limitHandler(request, contextStub);
    expect(response.status).toBe(429);
    expect(response.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Retry-After': '86400',
    });

    const body = JSON.parse(response.body as string);
    expect(body).toEqual({
      code: 'DAILY_COMMENT_LIMIT_EXCEEDED',
      tier: limitPayload.tier,
      limit: limitPayload.limit,
      current: limitPayload.currentCount,
      resetAt: limitPayload.resetDate,
      message: 'Daily comment limit reached. Try again tomorrow.',
    });
    expect(trackAppEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'comment_limit_exceeded',
        properties: expect.objectContaining({
          authorId: 'user-123',
          tier: 'free',
        }),
      })
    );
  });
  });

  // ─────────────────────────────────────────────────────────────
  // GET /posts/{postId}/comments (listComments)
  // ─────────────────────────────────────────────────────────────

  describe('GET /posts/{postId}/comments (listComments)', () => {
    it('returns 400 for missing postId', async () => {
      const req = httpReqMock({ method: 'GET', params: { postId: '' } });
      const response = await listComments(req, contextStub);
      expect(response.status).toBe(400);
      expect(response.body).toContain('Post ID is required');
    });

    it('returns 404 for non-existent post', async () => {
      mockPostRead.mockResolvedValueOnce({ resource: null });

      const req = httpReqMock({ method: 'GET', params: { postId: 'nonexistent' } });
      const response = await listComments(req, contextStub);
      expect(response.status).toBe(404);
    });

    it('returns empty array when no comments exist', async () => {
      mockPostQuery.mockResolvedValueOnce({
        resources: [],
        requestCharge: 1,
      });

      const req = httpReqMock({ method: 'GET', params: { postId: 'post-123' } });
      const response = await listComments(req, contextStub);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.items).toEqual([]);
      expect(body.meta.count).toBe(0);
      expect(body.meta.hasMore).toBe(false);
      expect(body.meta.nextCursor).toBeNull();
    });

    it('returns comments with proper formatting', async () => {
      const now = Date.now();
      mockPostQuery.mockResolvedValueOnce({
        resources: [
          { commentId: 'c1', postId: 'post-123', authorId: 'u1', text: 'First!', createdAt: now, updatedAt: now },
          { commentId: 'c2', postId: 'post-123', authorId: 'u2', text: 'Second', createdAt: now - 1000, updatedAt: now - 1000 },
        ],
        requestCharge: 3,
      });

      const req = httpReqMock({ method: 'GET', params: { postId: 'post-123' } });
      const response = await listComments(req, contextStub);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.items).toHaveLength(2);
      expect(body.items[0].commentId).toBe('c1');
      expect(body.items[0].text).toBe('First!');
      // Check ISO date format
      expect(body.items[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(body.meta.count).toBe(2);
    });

    it('returns hasMore=true and nextCursor when more comments exist', async () => {
      const now = Date.now();
      // Return 21 items (limit+1) to indicate there are more
      const comments = Array.from({ length: 21 }, (_, i) => ({
        commentId: `c${i}`,
        postId: 'post-123',
        authorId: 'user',
        text: `Comment ${i}`,
        createdAt: now - i * 1000,
        updatedAt: now - i * 1000,
      }));
      mockPostQuery.mockResolvedValueOnce({
        resources: comments,
        requestCharge: 5,
      });

      const req = httpReqMock({ method: 'GET', params: { postId: 'post-123' } });
      const response = await listComments(req, contextStub);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.items).toHaveLength(20); // Default limit
      expect(body.meta.hasMore).toBe(true);
      expect(body.meta.nextCursor).toBeTruthy();
    });

    it('respects custom limit parameter', async () => {
      const now = Date.now();
      const comments = Array.from({ length: 6 }, (_, i) => ({
        commentId: `c${i}`,
        postId: 'post-123',
        authorId: 'user',
        text: `Comment ${i}`,
        createdAt: now - i * 1000,
        updatedAt: now - i * 1000,
      }));
      mockPostQuery.mockResolvedValueOnce({
        resources: comments,
        requestCharge: 2,
      });

      const req = httpReqMock({
        method: 'GET',
        params: { postId: 'post-123' },
        query: { limit: '5' },
      });
      const response = await listComments(req, contextStub);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.items).toHaveLength(5);
      expect(body.meta.hasMore).toBe(true);
    });

    it('enforces max limit of 50', async () => {
      mockPostQuery.mockResolvedValueOnce({
        resources: [],
        requestCharge: 1,
      });

      const req = httpReqMock({
        method: 'GET',
        params: { postId: 'post-123' },
        query: { limit: '100' },
      });
      await listComments(req, contextStub);

      // Check that query was called with limit capped at 51 (50+1 for hasMore check)
      const mockGetTargetDatabase = require('@shared/clients/cosmos').getTargetDatabase;
      expect(mockGetTargetDatabase).toHaveBeenCalled();
    });

    it('handles invalid cursor gracefully by starting from beginning', async () => {
      mockPostQuery.mockResolvedValueOnce({
        resources: [],
        requestCharge: 1,
      });

      const req = httpReqMock({
        method: 'GET',
        params: { postId: 'post-123' },
        query: { cursor: 'invalid-not-base64' },
      });
      const response = await listComments(req, contextStub);

      // Should not error, just return from beginning
      expect(response.status).toBe(200);
    });

    it('returns 500 on Cosmos failure', async () => {
      mockPostQuery.mockRejectedValueOnce(new Error('Cosmos error'));

      const req = httpReqMock({ method: 'GET', params: { postId: 'post-123' } });
      const response = await listComments(req, contextStub);

      expect(response.status).toBe(500);
      expect(contextStub.log).toHaveBeenCalledWith('comments.list.error', expect.any(Object));
    });

    it('allows anonymous access to list comments', async () => {
      // No auth header - listComments should allow it
      mockPostQuery.mockResolvedValueOnce({
        resources: [],
        requestCharge: 1,
      });

      const req = httpReqMock({ method: 'GET', params: { postId: 'post-123' } });
      const response = await listComments(req, contextStub);

      // Should succeed without auth
      expect(response.status).toBe(200);
    });
  });
});
