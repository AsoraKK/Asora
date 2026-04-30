/**
 * Soft-deleted / blocked post visibility tests.
 *
 * The posts_get_by_id handler returns 404 for posts with status='deleted'
 * or status='blocked' — not just for missing (null) documents. These code
 * paths are separate from the null check and were not covered by the existing
 * posts.route.test.ts which only tested the null case.
 */

import type { InvocationContext } from '@azure/functions';

import { posts_get_by_id } from '@posts/posts_get_by_id.function';
import { postsService } from '@posts/service/postsService';
import { httpReqMock } from '../helpers/http';

jest.mock('@posts/service/postsService', () => ({
  postsService: {
    getPostById: jest.fn(),
    enrichPost: jest.fn(),
  },
}));

// jwtService mock so extractAuthContext doesn't throw during auth extraction
jest.mock('@auth/service/jwtService', () => ({
  jwtService: {
    verifyToken: jest.fn().mockResolvedValue(null),
  },
}));

const mockedPostsService = postsService as jest.Mocked<typeof postsService>;

const createContext = (): InvocationContext =>
  ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    traceContext: {},
    invocationId: 'soft-delete-test',
    functionName: 'posts_get_by_id',
  }) as unknown as InvocationContext;

describe('posts_get_by_id — soft-deleted / blocked content', () => {
  let context: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    context = createContext();
  });

  it('returns 404 with POST_NOT_FOUND when post status is "deleted"', async () => {
    mockedPostsService.getPostById.mockResolvedValue({
      id: 'post-1',
      postId: 'post-1',
      authorId: 'user-a',
      status: 'deleted',
      content: 'removed',
    } as any);

    const req = httpReqMock({ method: 'GET', params: { id: 'post-1' } });
    const response = await posts_get_by_id(req, context);

    expect(response.status).toBe(404);
    expect(response.jsonBody?.error?.code).toBe('POST_NOT_FOUND');
    // Enrichment must NOT be called for hidden posts
    expect(mockedPostsService.enrichPost).not.toHaveBeenCalled();
  });

  it('returns 404 with POST_NOT_FOUND when post status is "blocked"', async () => {
    mockedPostsService.getPostById.mockResolvedValue({
      id: 'post-2',
      postId: 'post-2',
      authorId: 'user-b',
      status: 'blocked',
      content: 'violating content',
    } as any);

    const req = httpReqMock({ method: 'GET', params: { id: 'post-2' } });
    const response = await posts_get_by_id(req, context);

    expect(response.status).toBe(404);
    expect(response.jsonBody?.error?.code).toBe('POST_NOT_FOUND');
    expect(mockedPostsService.enrichPost).not.toHaveBeenCalled();
  });

  it('returns 200 for a post with status "clean" (live content is accessible)', async () => {
    const enriched = {
      id: 'post-3',
      authorId: 'user-c',
      content: 'great post',
      contentType: 'text',
      visibility: 'public',
      isNews: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { id: 'user-c', displayName: 'User C', tier: 'free' },
      authorRole: 'user',
      likeCount: 0,
      commentCount: 0,
    };
    mockedPostsService.getPostById.mockResolvedValue({
      id: 'post-3',
      postId: 'post-3',
      authorId: 'user-c',
      status: 'clean',
    } as any);
    mockedPostsService.enrichPost.mockResolvedValue(enriched as any);

    const req = httpReqMock({ method: 'GET', params: { id: 'post-3' } });
    const response = await posts_get_by_id(req, context);

    expect(response.status).toBe(200);
    expect(mockedPostsService.enrichPost).toHaveBeenCalledTimes(1);
  });

  it('returns 200 for a post with status "warned" (visible with moderation flag)', async () => {
    const enriched = {
      id: 'post-4',
      authorId: 'user-d',
      content: 'borderline post',
      contentType: 'text',
      visibility: 'public',
      isNews: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { id: 'user-d', displayName: 'User D', tier: 'free' },
      authorRole: 'user',
      likeCount: 0,
      commentCount: 0,
    };
    mockedPostsService.getPostById.mockResolvedValue({
      id: 'post-4',
      postId: 'post-4',
      authorId: 'user-d',
      status: 'warned',
    } as any);
    mockedPostsService.enrichPost.mockResolvedValue(enriched as any);

    const req = httpReqMock({ method: 'GET', params: { id: 'post-4' } });
    const response = await posts_get_by_id(req, context);

    expect(response.status).toBe(200);
    expect(mockedPostsService.enrichPost).toHaveBeenCalledTimes(1);
  });
});
