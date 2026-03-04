/**
 * Tests for posts_get_insights route handler
 *
 * Covers:
 * - Author can access their post insights
 * - Admin can access any post insights
 * - Other users get 403
 * - Unauthenticated users get 401
 * - Non-existent post returns 404
 * - Response contains no forbidden fields
 */

import type { HttpRequest, InvocationContext } from '@azure/functions';
import { posts_get_insights } from '@posts/posts_get_insights.function';
import { postsService } from '@posts/service/postsService';
import { jwtService } from '@auth/service/jwtService';
import * as insightsService from '@posts/service/insightsService';
import { httpReqMock } from '../helpers/http';

jest.mock('@posts/service/postsService', () => ({
  postsService: {
    getPostById: jest.fn(),
  },
}));

jest.mock('@auth/service/jwtService', () => ({
  jwtService: {
    verifyToken: jest.fn(),
  },
}));

jest.mock('@posts/service/insightsService', () => ({
  ...jest.requireActual('@posts/service/insightsService'),
  getLatestModerationDecision: jest.fn(),
  getAppealForPost: jest.fn(),
}));

const mockedPostsService = postsService as jest.Mocked<typeof postsService>;
const mockedJwtService = jwtService as jest.Mocked<typeof jwtService>;
const mockedInsights = insightsService as jest.Mocked<typeof insightsService>;

const createContextStub = (): InvocationContext =>
  ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    traceContext: {},
    invocationId: 'test-invocation-id',
    functionName: 'postsGetInsightsTest',
  }) as unknown as InvocationContext;

describe('posts_get_insights route handler', () => {
  let context: InvocationContext;

  const mockPost = {
    id: 'post-123',
    postId: 'post-123',
    authorId: 'author-user',
    content: 'Test post content',
    status: 'published',
  };

  const mockDecision = {
    id: 'dec-123',
    itemId: 'post-123',
    createdAt: '2025-12-28T10:00:00.000Z',
    contentType: 'post',
    provider: 'hive_v2' as const,
    signals: { confidence: 0.3, categories: [] },
    thresholdsUsed: { configVersion: 5, flagThreshold: 0.5, removeThreshold: 0.9 },
    decision: 'allow' as const,
    reasonCodes: ['HIVE_SCORE_UNDER_THRESHOLD' as const],
    correlationId: null,
    usedFallback: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    context = createContextStub();
    mockedInsights.getLatestModerationDecision.mockResolvedValue(mockDecision);
    mockedInsights.getAppealForPost.mockResolvedValue({ status: 'NONE' });
  });

  describe('authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'post-123' },
        headers: {}, // No auth header
      });

      mockedJwtService.verifyToken.mockRejectedValue(new Error('No token'));

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(401);
      const body = response.jsonBody as any;
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for invalid token', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'post-123' },
        headers: { authorization: 'Bearer invalid-token' },
      });

      mockedJwtService.verifyToken.mockRejectedValue(new Error('Invalid token'));

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(401);
    });
  });

  describe('authorization', () => {
    it('should allow post author to access insights', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'post-123' },
        headers: { authorization: 'Bearer valid-token' },
      });

      mockedJwtService.verifyToken.mockResolvedValue({
        sub: 'author-user', // Same as post author
        roles: ['user'],
        tier: 'free',
      });
      mockedPostsService.getPostById.mockResolvedValue(mockPost as any);

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body.postId).toBe('post-123');
      expect(body.riskBand).toBe('LOW');
    });

    it('should allow admin to access any post insights', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'post-123' },
        headers: { authorization: 'Bearer admin-token' },
      });

      mockedJwtService.verifyToken.mockResolvedValue({
        sub: 'admin-user', // Different from post author
        roles: ['admin'],
        tier: 'premium',
      });
      mockedPostsService.getPostById.mockResolvedValue(mockPost as any);

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body.postId).toBe('post-123');
    });

    it('should return 403 for non-author, non-admin users', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'post-123' },
        headers: { authorization: 'Bearer other-token' },
      });

      mockedJwtService.verifyToken.mockResolvedValue({
        sub: 'other-user', // Different from post author
        roles: ['user'],
        tier: 'free',
      });
      mockedPostsService.getPostById.mockResolvedValue(mockPost as any);

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(403);
      const body = response.jsonBody as any;
      expect(body.error.code).toBe('ACCESS_DENIED');
    });

    it('should return 403 for moderator who is not the author', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'post-123' },
        headers: { authorization: 'Bearer mod-token' },
      });

      mockedJwtService.verifyToken.mockResolvedValue({
        sub: 'moderator-user',
        roles: ['moderator'], // Moderator but not admin
        tier: 'free',
      });
      mockedPostsService.getPostById.mockResolvedValue(mockPost as any);

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(403);
    });
  });

  describe('post existence', () => {
    it('should return 404 for non-existent post', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'nonexistent-post' },
        headers: { authorization: 'Bearer valid-token' },
      });

      mockedJwtService.verifyToken.mockResolvedValue({
        sub: 'some-user',
        roles: ['user'],
        tier: 'free',
      });
      mockedPostsService.getPostById.mockResolvedValue(null);

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(404);
      const body = response.jsonBody as any;
      expect(body.error.code).toBe('POST_NOT_FOUND');
    });

    it('should return 404 for deleted post', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'post-123' },
        headers: { authorization: 'Bearer valid-token' },
      });

      mockedJwtService.verifyToken.mockResolvedValue({
        sub: 'author-user',
        roles: ['user'],
        tier: 'free',
      });
      mockedPostsService.getPostById.mockResolvedValue({
        ...mockPost,
        status: 'deleted',
      } as any);

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(404);
    });
  });

  describe('response content', () => {
    it('should return correct risk band for blocked post', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'post-123' },
        headers: { authorization: 'Bearer valid-token' },
      });

      mockedJwtService.verifyToken.mockResolvedValue({
        sub: 'author-user',
        roles: ['user'],
        tier: 'free',
      });
      mockedPostsService.getPostById.mockResolvedValue(mockPost as any);
      mockedInsights.getLatestModerationDecision.mockResolvedValue({
        ...mockDecision,
        decision: 'block',
        reasonCodes: ['HIVE_SCORE_OVER_THRESHOLD'],
      });

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body.riskBand).toBe('HIGH');
      expect(body.decision).toBe('BLOCK');
    });

    it('should collapse QUEUE to BLOCK in response (binary model)', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'post-123' },
        headers: { authorization: 'Bearer valid-token' },
      });

      mockedJwtService.verifyToken.mockResolvedValue({
        sub: 'author-user',
        roles: ['user'],
        tier: 'free',
      });
      mockedPostsService.getPostById.mockResolvedValue(mockPost as any);
      mockedInsights.getLatestModerationDecision.mockResolvedValue({
        ...mockDecision,
        decision: 'queue',
      });
      // No pending appeal
      mockedInsights.getAppealForPost.mockResolvedValue({ status: 'NONE' });

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      // QUEUE is collapsed to BLOCK, and without pending appeal = HIGH
      expect(body.decision).toBe('BLOCK');
      expect(body.riskBand).toBe('HIGH');
    });

    it('should return MEDIUM band when blocked with pending appeal', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'post-123' },
        headers: { authorization: 'Bearer valid-token' },
      });

      mockedJwtService.verifyToken.mockResolvedValue({
        sub: 'author-user',
        roles: ['user'],
        tier: 'free',
      });
      mockedPostsService.getPostById.mockResolvedValue(mockPost as any);
      mockedInsights.getLatestModerationDecision.mockResolvedValue({
        ...mockDecision,
        decision: 'block',
        reasonCodes: ['HIVE_SCORE_OVER_THRESHOLD'],
      });
      // PENDING appeal
      mockedInsights.getAppealForPost.mockResolvedValue({
        status: 'PENDING',
        updatedAt: '2025-12-28T11:00:00.000Z',
      });

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body.decision).toBe('BLOCK');
      expect(body.riskBand).toBe('MEDIUM'); // Under review
      expect(body.appeal.status).toBe('PENDING');
    });

    it('should include config version from decision', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'post-123' },
        headers: { authorization: 'Bearer valid-token' },
      });

      mockedJwtService.verifyToken.mockResolvedValue({
        sub: 'author-user',
        roles: ['user'],
        tier: 'free',
      });
      mockedPostsService.getPostById.mockResolvedValue(mockPost as any);
      mockedInsights.getLatestModerationDecision.mockResolvedValue({
        ...mockDecision,
        thresholdsUsed: { ...mockDecision.thresholdsUsed, configVersion: 42 },
      });

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body.configVersion).toBe(42);
    });

    it('should include appeal status', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'post-123' },
        headers: { authorization: 'Bearer valid-token' },
      });

      mockedJwtService.verifyToken.mockResolvedValue({
        sub: 'author-user',
        roles: ['user'],
        tier: 'free',
      });
      mockedPostsService.getPostById.mockResolvedValue(mockPost as any);
      mockedInsights.getAppealForPost.mockResolvedValue({
        status: 'PENDING',
        updatedAt: '2025-12-28T11:00:00.000Z',
      });

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body.appeal.status).toBe('PENDING');
      expect(body.appeal.updatedAt).toBe('2025-12-28T11:00:00.000Z');
    });

    it('should NOT contain forbidden fields (sanitization test)', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'post-123' },
        headers: { authorization: 'Bearer valid-token' },
      });

      mockedJwtService.verifyToken.mockResolvedValue({
        sub: 'author-user',
        roles: ['user'],
        tier: 'free',
      });
      mockedPostsService.getPostById.mockResolvedValue(mockPost as any);

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;

      // Use the real containsForbiddenFields function
      const { containsForbiddenFields } = jest.requireActual('@posts/service/insightsService');
      const forbidden = containsForbiddenFields(body);
      expect(forbidden).toEqual([]);

      // Explicit checks for known forbidden fields
      expect(body.score).toBeUndefined();
      expect(body.scores).toBeUndefined();
      expect(body.probability).toBeUndefined();
      expect(body.threshold).toBeUndefined();
      expect(body.confidence).toBeUndefined();
      expect(body.categoryScores).toBeUndefined();
      expect(body.severity).toBeUndefined();
    });

    it('should return defaults when no moderation decision exists', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { id: 'post-123' },
        headers: { authorization: 'Bearer valid-token' },
      });

      mockedJwtService.verifyToken.mockResolvedValue({
        sub: 'author-user',
        roles: ['user'],
        tier: 'free',
      });
      mockedPostsService.getPostById.mockResolvedValue(mockPost as any);
      mockedInsights.getLatestModerationDecision.mockResolvedValue(null);

      const response = await posts_get_insights(req as unknown as HttpRequest, context);

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body.riskBand).toBe('LOW');
      expect(body.decision).toBe('ALLOW');
      expect(body.configVersion).toBe(0);
    });
  });
});
