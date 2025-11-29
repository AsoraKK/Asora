import type { HttpRequest, InvocationContext } from '@azure/functions';

import { likePost, unlikePost, getLikeStatus } from '@feed/routes/likePost';
import { httpReqMock } from '../helpers/http';

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
const mockReactionRead = jest.fn();
const mockReactionCreate = jest.fn();
const mockReactionDelete = jest.fn();

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(() => ({
    posts: {
      item: jest.fn((id: string, pk: string) => ({
        read: mockPostRead,
        patch: mockPostPatch,
      })),
    },
    reactions: {
      item: jest.fn((id: string, pk: string) => ({
        read: mockReactionRead,
        delete: mockReactionDelete,
      })),
      items: {
        create: mockReactionCreate,
      },
    },
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

function guestRequest(postId: string): HttpRequest {
  return httpReqMock({ method: 'POST', params: { postId } });
}

function userRequest(method: string, postId: string): HttpRequest {
  return httpReqMock({
    method,
    headers: { authorization: 'Bearer valid-token' },
    params: { postId },
  });
}

const testPost = {
  id: 'post-123',
  postId: 'post-123',
  authorId: 'author-456',
  stats: { likes: 5, comments: 0, replies: 0 },
};

describe('likePost route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contextStub.log = jest.fn();
    
    verifyMock.mockImplementation(async (header: string | undefined) => {
      if (!header) {
        throw new AuthError('invalid_request', 'Authorization header missing');
      }
      if (header.includes('invalid')) {
        throw new AuthError('invalid_token', 'Unable to validate token');
      }
      return { sub: 'user-123', raw: {} } as any;
    });

    // Default mock responses
    mockPostRead.mockResolvedValue({
      resource: { ...testPost },
      requestCharge: 1,
    });
    mockPostPatch.mockResolvedValue({
      resource: { ...testPost, stats: { ...testPost.stats, likes: 6 } },
      requestCharge: 2,
    });
    mockReactionRead.mockRejectedValue({ code: 404 }); // Not liked by default
    mockReactionCreate.mockResolvedValue({
      resource: { id: 'post-123:user-123', postId: 'post-123', userId: 'user-123' },
      requestCharge: 2,
    });
    mockReactionDelete.mockResolvedValue({ requestCharge: 2 });
  });

  describe('POST /posts/{postId}/like (like)', () => {
    it('returns 401 for unauthenticated request', async () => {
      const response = await likePost(guestRequest('post-123'), contextStub);
      expect(response.status).toBe(401);
    });

    it('returns 400 for missing postId', async () => {
      const response = await likePost(userRequest('POST', ''), contextStub);
      expect(response.status).toBe(400);
      expect(response.body).toContain('Post ID is required');
    });

    it('returns 404 for non-existent post', async () => {
      mockPostRead.mockResolvedValueOnce({ resource: null });
      
      const response = await likePost(userRequest('POST', 'nonexistent'), contextStub);
      expect(response.status).toBe(404);
      expect(contextStub.log).toHaveBeenCalledWith('posts.like.not_found', { postId: 'nonexistent' });
    });

    it('returns 200 with updated likeCount on first like', async () => {
      const response = await likePost(userRequest('POST', 'post-123'), contextStub);
      
      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.status).toBe('success');
      expect(body.liked).toBe(true);
      expect(body.likeCount).toBe(6);
      expect(mockReactionCreate).toHaveBeenCalled();
      expect(mockPostPatch).toHaveBeenCalledWith([
        { op: 'incr', path: '/stats/likes', value: 1 },
      ]);
      expect(contextStub.log).toHaveBeenCalledWith('posts.like.success', expect.any(Object));
    });

    it('returns 200 idempotently when already liked (no duplicate)', async () => {
      // Simulate already liked
      mockReactionRead.mockResolvedValueOnce({
        resource: { id: 'post-123:user-123', postId: 'post-123', userId: 'user-123' },
      });

      const response = await likePost(userRequest('POST', 'post-123'), contextStub);
      
      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.status).toBe('success');
      expect(body.liked).toBe(true);
      expect(body.message).toBe('Already liked');
      // Should NOT create a new like or update the post
      expect(mockReactionCreate).not.toHaveBeenCalled();
      expect(mockPostPatch).not.toHaveBeenCalled();
      expect(contextStub.log).toHaveBeenCalledWith('posts.like.already_liked', expect.any(Object));
    });

    it('returns 500 on Cosmos failure', async () => {
      mockReactionCreate.mockRejectedValueOnce(new Error('Cosmos error'));
      
      const response = await likePost(userRequest('POST', 'post-123'), contextStub);
      expect(response.status).toBe(500);
      expect(contextStub.log).toHaveBeenCalledWith('posts.like.error', expect.any(Object));
    });
  });

  describe('DELETE /posts/{postId}/like (unlike)', () => {
    it('returns 401 for unauthenticated request', async () => {
      const response = await unlikePost(guestRequest('post-123'), contextStub);
      expect(response.status).toBe(401);
    });

    it('returns 400 for missing postId', async () => {
      const response = await unlikePost(userRequest('DELETE', ''), contextStub);
      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent post', async () => {
      mockPostRead.mockResolvedValueOnce({ resource: null });
      
      const response = await unlikePost(userRequest('DELETE', 'nonexistent'), contextStub);
      expect(response.status).toBe(404);
    });

    it('returns 200 with updated likeCount on successful unlike', async () => {
      // Simulate existing like
      mockReactionRead.mockResolvedValueOnce({
        resource: { id: 'post-123:user-123', postId: 'post-123', userId: 'user-123' },
      });
      mockPostPatch.mockResolvedValueOnce({
        resource: { ...testPost, stats: { ...testPost.stats, likes: 4 } },
        requestCharge: 2,
      });

      const response = await unlikePost(userRequest('DELETE', 'post-123'), contextStub);
      
      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.status).toBe('success');
      expect(body.liked).toBe(false);
      expect(body.likeCount).toBe(4);
      expect(mockReactionDelete).toHaveBeenCalled();
      expect(contextStub.log).toHaveBeenCalledWith('posts.unlike.success', expect.any(Object));
    });

    it('returns 200 idempotently when not liked', async () => {
      // Default mock already returns 404 for reaction read
      
      const response = await unlikePost(userRequest('DELETE', 'post-123'), contextStub);
      
      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.status).toBe('success');
      expect(body.liked).toBe(false);
      expect(body.message).toBe('Not liked');
      // Should NOT delete anything
      expect(mockReactionDelete).not.toHaveBeenCalled();
      expect(contextStub.log).toHaveBeenCalledWith('posts.unlike.not_liked', expect.any(Object));
    });

    it('does not go below 0 likes', async () => {
      // Post with 0 likes
      mockPostRead.mockResolvedValueOnce({
        resource: { ...testPost, stats: { likes: 0, comments: 0, replies: 0 } },
        requestCharge: 1,
      });
      mockReactionRead.mockResolvedValueOnce({
        resource: { id: 'post-123:user-123', postId: 'post-123', userId: 'user-123' },
      });
      mockPostPatch.mockResolvedValueOnce({
        resource: { ...testPost, stats: { likes: 0, comments: 0, replies: 0 } },
        requestCharge: 2,
      });

      const response = await unlikePost(userRequest('DELETE', 'post-123'), contextStub);
      
      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.likeCount).toBe(0);
      expect(mockPostPatch).toHaveBeenCalledWith([
        { op: 'set', path: '/stats/likes', value: 0 },
      ]);
    });

    it('returns 500 on Cosmos failure', async () => {
      mockReactionRead.mockResolvedValueOnce({
        resource: { id: 'post-123:user-123' },
      });
      mockReactionDelete.mockRejectedValueOnce(new Error('Cosmos error'));
      
      const response = await unlikePost(userRequest('DELETE', 'post-123'), contextStub);
      expect(response.status).toBe(500);
    });
  });

  describe('GET /posts/{postId}/like (status)', () => {
    it('returns 401 for unauthenticated request', async () => {
      const response = await getLikeStatus(guestRequest('post-123'), contextStub);
      expect(response.status).toBe(401);
    });

    it('returns 404 for non-existent post', async () => {
      mockPostRead.mockResolvedValueOnce({ resource: null });
      
      const response = await getLikeStatus(userRequest('GET', 'nonexistent'), contextStub);
      expect(response.status).toBe(404);
    });

    it('returns liked: true when user has liked', async () => {
      mockReactionRead.mockResolvedValueOnce({
        resource: { id: 'post-123:user-123' },
      });

      const response = await getLikeStatus(userRequest('GET', 'post-123'), contextStub);
      
      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.liked).toBe(true);
      expect(body.likeCount).toBe(5);
    });

    it('returns liked: false when user has not liked', async () => {
      // Default mock returns 404 for reaction

      const response = await getLikeStatus(userRequest('GET', 'post-123'), contextStub);
      
      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.liked).toBe(false);
      expect(body.likeCount).toBe(5);
    });
  });
});
