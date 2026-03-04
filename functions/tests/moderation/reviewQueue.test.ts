import type { InvocationContext } from '@azure/functions';

import { reviewQueueRoute } from '@moderation/routes/reviewQueue';
import { getReviewQueueHandler } from '@moderation/service/reviewQueueService';
import { httpReqMock } from '../helpers/http';

// Mock the auth module
jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    verifyAuthorizationHeader: jest.fn(),
  };
});

// Mock the service
jest.mock('@moderation/service/reviewQueueService', () => ({
  getReviewQueueHandler: jest.fn(),
}));

const { AuthError } = jest.requireActual('@auth/verifyJwt');
const verifyMock = jest.mocked(require('@auth/verifyJwt').verifyAuthorizationHeader);
const handlerMock = jest.mocked(getReviewQueueHandler);

const contextStub = { log: jest.fn() } as unknown as InvocationContext;

function authorizedRequest(query: Record<string, string> = {}, roles: string[] = ['moderator']) {
  verifyMock.mockResolvedValueOnce({
    sub: 'mod-user-1',
    roles,
    raw: { roles },
  } as any);

  return httpReqMock({
    method: 'GET',
    headers: { authorization: 'Bearer valid-token' },
    query,
  });
}

describe('reviewQueue route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (contextStub.log as jest.Mock).mockClear();
  });

  describe('CORS and method handling', () => {
    it('returns CORS response for OPTIONS', async () => {
      const response = await reviewQueueRoute(httpReqMock({ method: 'OPTIONS' }), contextStub);
      expect(response.status).toBe(200);
      expect(response.body).toBe('');
    });

    it('rejects POST method with 405', async () => {
      const response = await reviewQueueRoute(httpReqMock({ method: 'POST' }), contextStub);
      expect(response.status).toBe(405);
      expect(JSON.parse(response.body as string)).toMatchObject({
        success: false,
        message: 'Method POST not allowed',
      });
    });
  });

  describe('authentication', () => {
    it('returns 401 when no authorization header present', async () => {
      verifyMock.mockRejectedValueOnce(new AuthError('invalid_request', 'Authorization header missing'));

      const response = await reviewQueueRoute(httpReqMock({ method: 'GET' }), contextStub);
      expect(response.status).toBe(401);
      expect(JSON.parse(response.body as string)).toMatchObject({ error: 'invalid_request' });
    });

    it('returns 401 for invalid token', async () => {
      verifyMock.mockRejectedValueOnce(new AuthError('invalid_token', 'Unable to validate token'));

      const req = httpReqMock({
        method: 'GET',
        headers: { authorization: 'Bearer invalid-token' },
      });
      const response = await reviewQueueRoute(req, contextStub);
      expect(response.status).toBe(401);
      expect(JSON.parse(response.body as string)).toMatchObject({ error: 'invalid_token' });
    });
  });

  describe('authorization', () => {
    it('returns 403 when user lacks moderator role', async () => {
      // User with only 'user' role
      verifyMock.mockResolvedValueOnce({
        sub: 'regular-user',
        roles: ['user'],
        raw: { roles: ['user'] },
      } as any);

      const req = httpReqMock({
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' },
      });
      const response = await reviewQueueRoute(req, contextStub);
      expect(response.status).toBe(403);
      expect(JSON.parse(response.body as string)).toMatchObject({
        error: 'forbidden',
        message: expect.stringContaining('moderator'),
      });
    });

    it('allows access with moderator role', async () => {
      handlerMock.mockResolvedValueOnce({
        status: 200,
        jsonBody: { items: [], continuationToken: null, totalCount: 0, hasMore: false },
      });

      const req = authorizedRequest({}, ['moderator']);
      const response = await reviewQueueRoute(req, contextStub);
      expect(response.status).toBe(200);
      expect(handlerMock).toHaveBeenCalled();
    });

    it('allows access with admin role', async () => {
      handlerMock.mockResolvedValueOnce({
        status: 200,
        jsonBody: { items: [], continuationToken: null, totalCount: 0, hasMore: false },
      });

      const req = authorizedRequest({}, ['admin']);
      const response = await reviewQueueRoute(req, contextStub);
      expect(response.status).toBe(200);
      expect(handlerMock).toHaveBeenCalled();
    });
  });

  describe('query parameters', () => {
    it('passes limit parameter to handler', async () => {
      handlerMock.mockResolvedValueOnce({
        status: 200,
        jsonBody: { items: [], continuationToken: null, totalCount: 0, hasMore: false },
      });

      const req = authorizedRequest({ limit: '50' });
      await reviewQueueRoute(req, contextStub);

      expect(handlerMock).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 })
      );
    });

    it('passes continuationToken parameter to handler', async () => {
      handlerMock.mockResolvedValueOnce({
        status: 200,
        jsonBody: { items: [], continuationToken: null, totalCount: 0, hasMore: false },
      });

      const token = 'eyJmIjoiYWJjIn0=';
      const req = authorizedRequest({ continuationToken: token });
      await reviewQueueRoute(req, contextStub);

      expect(handlerMock).toHaveBeenCalledWith(
        expect.objectContaining({ continuationToken: token })
      );
    });

    it('passes type filter parameter to handler', async () => {
      handlerMock.mockResolvedValueOnce({
        status: 200,
        jsonBody: { items: [], continuationToken: null, totalCount: 0, hasMore: false },
      });

      const req = authorizedRequest({ type: 'appeal' });
      await reviewQueueRoute(req, contextStub);

      expect(handlerMock).toHaveBeenCalledWith(
        expect.objectContaining({ filterType: 'appeal' })
      );
    });

    it('defaults filterType to all when not provided', async () => {
      handlerMock.mockResolvedValueOnce({
        status: 200,
        jsonBody: { items: [], continuationToken: null, totalCount: 0, hasMore: false },
      });

      const req = authorizedRequest({});
      await reviewQueueRoute(req, contextStub);

      expect(handlerMock).toHaveBeenCalledWith(
        expect.objectContaining({ filterType: 'all' })
      );
    });
  });

  describe('response format', () => {
    it('returns correct response shape', async () => {
      const mockItems = [
        {
          id: 'flag-content-1',
          contentId: 'content-1',
          contentType: 'post',
          type: 'flag',
          flagCount: 3,
          latestReasons: ['spam', 'harassment'],
          appealStatus: null,
          urgencyScore: 8,
          createdAt: '2025-11-29T10:00:00.000Z',
        },
        {
          id: 'appeal-1',
          contentId: 'content-2',
          contentType: 'comment',
          type: 'appeal',
          flagCount: 1,
          latestReasons: ['false_positive'],
          appealStatus: 'pending',
          urgencyScore: 7,
          createdAt: '2025-11-29T09:00:00.000Z',
          preview: 'This is a preview...',
        },
      ];

      handlerMock.mockResolvedValueOnce({
        status: 200,
        jsonBody: {
          items: mockItems,
          continuationToken: 'next-page-token',
          totalCount: 2,
          hasMore: true,
        },
      });

      const req = authorizedRequest({});
      const response = await reviewQueueRoute(req, contextStub);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        items: mockItems,
        continuationToken: 'next-page-token',
        totalCount: 2,
        hasMore: true,
      });
    });
  });
});
