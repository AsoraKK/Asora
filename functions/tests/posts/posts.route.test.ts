import type { HttpRequest, InvocationContext } from '@azure/functions';

import { posts_create } from '@posts/posts_create.function';
import { posts_get_by_id } from '@posts/posts_get_by_id.function';
import { posts_delete } from '@posts/posts_delete.function';
import { posts_list_by_user } from '@posts/posts_list_by_user.function';
import { postsService } from '@posts/service/postsService';
import { jwtService } from '@auth/service/jwtService';
import { httpReqMock } from '../helpers/http';
import { moderatePostContent, buildModerationMeta } from '@posts/service/moderationUtil';

jest.mock('@posts/service/postsService', () => ({
  postsService: {
    createPost: jest.fn(),
    getPostById: jest.fn(),
    deletePost: jest.fn(),
    listPostsByUser: jest.fn(),
    enrichPost: jest.fn(),
  },
}));

jest.mock('@posts/service/moderationUtil', () => ({
  moderatePostContent: jest.fn(),
  buildModerationMeta: jest.fn(),
}));

jest.mock('@auth/service/jwtService', () => ({
  jwtService: {
    verifyToken: jest.fn(),
  },
}));

const mockedPostsService = postsService as jest.Mocked<typeof postsService>;
const mockedJwtService = jwtService as jest.Mocked<typeof jwtService>;
const mockedModeration = {
  moderatePostContent: moderatePostContent as jest.MockedFunction<typeof moderatePostContent>,
  buildModerationMeta: buildModerationMeta as jest.MockedFunction<typeof buildModerationMeta>,
};

const createContextStub = (): InvocationContext =>
  ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    traceContext: {},
    invocationId: 'test-invocation-id',
    functionName: 'postsRouteTest',
  }) as unknown as InvocationContext;

describe('posts route handlers', () => {
  let context: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    context = createContextStub();
    mockedJwtService.verifyToken.mockResolvedValue({
      sub: 'user-abc',
      roles: ['user'],
      tier: 'free',
    });
    mockedModeration.moderatePostContent.mockResolvedValue({
      result: { action: 'ALLOW', confidence: 0.9, categories: [], reasons: [] } as any,
    });
    mockedModeration.buildModerationMeta.mockReturnValue({
      status: 'clean',
      checkedAt: Date.now(),
    });
    mockedPostsService.listPostsByUser.mockResolvedValue({ posts: [], nextCursor: undefined });
    mockedPostsService.enrichPost.mockResolvedValue({
      id: 'post-abc',
      authorId: 'user-abc',
      content: 'hello',
      contentType: 'text',
      visibility: 'public',
      isNews: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: 'user-abc',
        displayName: 'User ABC',
        tier: 'free',
      },
      authorRole: 'user',
      likeCount: 0,
      commentCount: 0,
    } as any);
  });

  function authRequest(body?: Record<string, unknown>): HttpRequest {
    return httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body,
    });
  }

  it('returns 400 when create request lacks content', async () => {
    const response = await posts_create(authRequest({ contentType: 'text' }), context);

    expect(response.status).toBe(400);
    expect(response.jsonBody?.error.code).toBe('INVALID_CONTENT');
    expect(mockedPostsService.createPost).not.toHaveBeenCalled();
  });

  it('returns 404 when post is missing', async () => {
    mockedPostsService.getPostById.mockResolvedValue(null);
    const request = httpReqMock({ method: 'GET', params: { id: 'missing-post' } });
    const response = await posts_get_by_id(request, context);

    expect(response.status).toBe(404);
    expect(response.jsonBody?.error.code).toBe('POST_NOT_FOUND');
    expect(mockedPostsService.enrichPost).not.toHaveBeenCalled();
  });

  it('returns 403 on delete when user is not the owner', async () => {
    mockedPostsService.getPostById.mockResolvedValue({
      postId: 'post-123',
      authorId: 'owner',
    } as any);
    const response = await posts_delete(
      httpReqMock({
        method: 'DELETE',
        headers: { authorization: 'Bearer token' },
        params: { id: 'post-123' },
      }),
      context
    );

    expect(response.status).toBe(403);
    expect(response.jsonBody?.error.code).toBe('FORBIDDEN');
    expect(mockedPostsService.deletePost).not.toHaveBeenCalled();
  });

  it('clamps list limit and returns cursor metadata', async () => {
    const postDoc = {
      postId: 'post-123',
      authorId: 'owner',
      content: 'hi',
      contentType: 'text',
      visibility: 'public',
      isNews: false,
      status: 'published',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { likes: 0, comments: 0, replies: 0 },
      moderation: { status: 'clean', checkedAt: Date.now() },
    };
    mockedPostsService.listPostsByUser.mockResolvedValue({
      posts: [postDoc],
      nextCursor: 'cursor-xyz',
    });
    const postView = {
      id: 'post-123',
      authorId: 'owner',
    };
    mockedPostsService.enrichPost.mockResolvedValue(postView as any);

    const response = await posts_list_by_user(
      httpReqMock({
        method: 'GET',
        params: { userId: 'owner' },
        query: { cursor: 'cursor-prev', limit: '100' },
      }),
      context
    );

    expect(mockedPostsService.listPostsByUser).toHaveBeenCalledWith('owner', 'cursor-prev', 50);
    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({
      items: [postView],
      nextCursor: 'cursor-xyz',
    });
  });
});
