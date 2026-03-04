/**
 * Service-layer tests for Content Flagging (B1)
 *
 * Tests: single flag, duplicate flag, non-existent content, unauthorized user
 */
import type { InvocationContext } from '@azure/functions';
import type { Container } from '@azure/cosmos';

// Mock getTargetDatabase from cosmos client
const mockRead = jest.fn();
const mockPatch = jest.fn();
const mockCreate = jest.fn();
const mockQuery = jest.fn();

const createMockContainer = () =>
  ({
    item: jest.fn().mockReturnValue({
      read: mockRead,
      patch: mockPatch,
    }),
    items: {
      query: jest.fn().mockReturnValue({
        fetchAll: mockQuery,
      }),
      create: mockCreate,
    },
  }) as unknown as Container;

const mockDb = {
  posts: createMockContainer(),
  comments: createMockContainer(),
  flags: createMockContainer(),
  users: createMockContainer(),
  messages: createMockContainer(),
  reactions: createMockContainer(),
  appeals: createMockContainer(),
  notifications: createMockContainer(),
};

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(() => mockDb),
  initializeCosmosClient: jest.fn(),
}));

// Mock Hive AI client
jest.mock('@shared/clients/hive', () => ({
  createHiveClient: jest.fn().mockReturnValue({
    moderateText: jest.fn().mockResolvedValue({ safe: true, scores: {} }),
  }),
  HiveAIClient: jest.fn(),
}));

// Mock rate limiter - allow requests by default
jest.mock('@shared/utils/rateLimiter', () => ({
  createRateLimiter: jest.fn().mockReturnValue({
    checkRateLimit: jest.fn().mockResolvedValue({
      blocked: false,
      limit: 5,
      remaining: 4,
      resetTime: Date.now() + 3600000,
    }),
  }),
  endpointKeyGenerator: jest.fn(),
  defaultKeyGenerator: jest.fn(),
}));

// Mock chaos injectors to pass through
jest.mock('@shared/chaos/chaosConfig', () => ({
  getChaosContext: jest.fn().mockReturnValue({ enabled: false }),
}));

jest.mock('@shared/chaos/chaosInjectors', () => ({
  withCosmosChaos: jest.fn((_ctx, fn) => fn()),
  withHiveChaos: jest.fn((_ctx, fn) => fn()),
  ChaosError: class extends Error {},
}));

// Mock app insights
jest.mock('@shared/appInsights', () => ({
  trackAppEvent: jest.fn(),
  trackAppMetric: jest.fn(),
}));

import { flagContentHandler } from '../../src/moderation/service/flagService';
import { httpReqMock } from '../helpers/http';

const contextStub = {
  log: jest.fn(),
  invocationId: 'test-flag-invocation',
} as unknown as InvocationContext;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.COSMOS_CONNECTION_STRING = 'mock-connection';

  // Reset all mock container methods
  Object.values(mockDb).forEach((container) => {
    const c = container as unknown as ReturnType<typeof createMockContainer>;
    (c.item as jest.Mock).mockReturnValue({
      read: mockRead,
      patch: mockPatch,
    });
    (c.items.query as jest.Mock).mockReturnValue({ fetchAll: mockQuery });
  });
});

describe('flagService - validation', () => {
  it('returns 401 when userId is missing (unauthorized)', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { contentId: 'post-123', contentType: 'post', reason: 'spam' },
    });
    const response = await flagContentHandler({
      request: req,
      context: contextStub,
      userId: '',
    });
    expect(response.status).toBe(401);
    expect(response.jsonBody).toMatchObject({ error: 'Missing authorization header' });
  });

  it('returns 400 for missing required fields', async () => {
    const req = httpReqMock({ method: 'POST', body: {} });
    const response = await flagContentHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(400);
    expect(response.jsonBody).toMatchObject({ error: 'Invalid request data' });
  });

  it('returns 400 for invalid content type', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-123',
        contentType: 'invalid_type',
        reason: 'spam',
      },
    });
    const response = await flagContentHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(400);
    expect(response.jsonBody).toMatchObject({ error: 'Invalid request data' });
  });

  it('returns 400 for invalid reason', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-123',
        contentType: 'post',
        reason: 'not_a_valid_reason',
      },
    });
    const response = await flagContentHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(400);
  });

  it('returns 400 when additionalDetails exceeds max length', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-123',
        contentType: 'post',
        reason: 'spam',
        additionalDetails: 'x'.repeat(2001), // Max is 2000
      },
    });
    const response = await flagContentHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(400);
  });
});

describe('flagService - content verification', () => {
  it('returns 404 when content does not exist', async () => {
    // Content read returns undefined
    mockRead.mockResolvedValueOnce({ resource: undefined, requestCharge: 1 });

    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'non-existent-post',
        contentType: 'post',
        reason: 'spam',
      },
    });

    const response = await flagContentHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(404);
    expect(response.jsonBody).toMatchObject({ error: 'Content not found' });
  });
});

describe('flagService - duplicate prevention', () => {
  it('returns 409 when user has already flagged the same content', async () => {
    // Content exists
    mockRead.mockResolvedValueOnce({
      resource: { id: 'post-123', text: 'some content', status: 'active' },
      requestCharge: 1,
    });

    // Existing flag found
    mockQuery.mockResolvedValueOnce({
      resources: [{ id: 'existing-flag', contentId: 'post-123', userId: 'user-1' }],
      requestCharge: 1,
    });

    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-123',
        contentType: 'post',
        reason: 'spam',
      },
    });

    const response = await flagContentHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(409);
    expect(response.jsonBody).toMatchObject({ error: 'You have already flagged this content' });
  });
});

describe('flagService - successful flagging', () => {
  it('creates flag successfully for first-time flag on existing content', async () => {
    const postId = 'post-123';

    // Content exists
    mockRead.mockResolvedValueOnce({
      resource: { id: postId, text: 'some content', status: 'active', flagCount: 0 },
      requestCharge: 1,
    });

    // No existing flag
    mockQuery.mockResolvedValueOnce({
      resources: [],
      requestCharge: 1,
    });

    // Flag create succeeds
    mockCreate.mockResolvedValueOnce({
      resource: { id: 'new-flag-id' },
      requestCharge: 5,
    });

    // Patch succeeds
    mockPatch.mockResolvedValueOnce({ requestCharge: 2 });

    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: postId,
        contentType: 'post',
        reason: 'spam',
        additionalDetails: 'This is promotional spam',
      },
    });

    const response = await flagContentHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });

    expect(response.status).toBe(201);
    expect(response.jsonBody).toMatchObject({
      message: 'Content flagged successfully',
    });
    expect(response.jsonBody.flagId).toBeDefined();
    expect(mockCreate).toHaveBeenCalled();
  });

  it('sets flagged=true and increments flagCount on content', async () => {
    const postId = 'post-456';

    // Content exists with no prior flags
    mockRead.mockResolvedValueOnce({
      resource: { id: postId, text: 'test', status: 'active', flagCount: 0 },
      requestCharge: 1,
    });

    // No existing flag from this user
    mockQuery.mockResolvedValueOnce({ resources: [], requestCharge: 1 });

    // Flag create succeeds
    mockCreate.mockResolvedValueOnce({
      resource: { id: 'flag-new' },
      requestCharge: 5,
    });

    // Patch succeeds
    mockPatch.mockResolvedValueOnce({ requestCharge: 2 });

    const req = httpReqMock({
      method: 'POST',
      body: { contentId: postId, contentType: 'post', reason: 'harassment' },
    });

    await flagContentHandler({
      request: req,
      context: contextStub,
      userId: 'user-2',
    });

    // Verify patch was called to update flag count
    expect(mockPatch).toHaveBeenCalled();
  });

  it('auto-hides content when flag count reaches threshold (5)', async () => {
    const postId = 'post-threshold';

    // Content exists with 4 prior flags (next flag = 5 = threshold)
    mockRead.mockResolvedValueOnce({
      resource: { id: postId, text: 'test', status: 'active', flagCount: 4 },
      requestCharge: 1,
    });

    // No existing flag from this user
    mockQuery.mockResolvedValueOnce({ resources: [], requestCharge: 1 });

    // Flag create succeeds
    mockCreate.mockResolvedValueOnce({
      resource: { id: 'flag-threshold' },
      requestCharge: 5,
    });

    // Patch succeeds
    mockPatch.mockResolvedValueOnce({ requestCharge: 2 });

    const req = httpReqMock({
      method: 'POST',
      body: { contentId: postId, contentType: 'post', reason: 'violence' },
    });

    const response = await flagContentHandler({
      request: req,
      context: contextStub,
      userId: 'user-5',
    });

    expect(response.status).toBe(201);
    // Verify logging was called for auto-hide
    expect(contextStub.log).toHaveBeenCalledWith(
      'moderation.flag.auto_hidden',
      expect.objectContaining({ contentId: postId, flagCount: 5 })
    );
  });
});

describe('flagService - flag different content types', () => {
  it('flags a comment successfully', async () => {
    mockRead.mockResolvedValueOnce({
      resource: { id: 'comment-123', text: 'bad comment', type: 'comment', status: 'active' },
      requestCharge: 1,
    });
    mockQuery.mockResolvedValueOnce({ resources: [], requestCharge: 1 });
    mockCreate.mockResolvedValueOnce({ resource: { id: 'flag-comment' }, requestCharge: 5 });
    mockPatch.mockResolvedValueOnce({ requestCharge: 2 });

    const req = httpReqMock({
      method: 'POST',
      body: { contentId: 'comment-123', contentType: 'comment', reason: 'harassment' },
    });

    const response = await flagContentHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });

    expect(response.status).toBe(201);
  });

  it('flags a user profile successfully', async () => {
    mockRead.mockResolvedValueOnce({
      resource: { id: 'user-bad', displayName: 'BadUser', status: 'active' },
      requestCharge: 1,
    });
    mockQuery.mockResolvedValueOnce({ resources: [], requestCharge: 1 });
    mockCreate.mockResolvedValueOnce({ resource: { id: 'flag-user' }, requestCharge: 5 });
    mockPatch.mockResolvedValueOnce({ requestCharge: 2 });

    const req = httpReqMock({
      method: 'POST',
      body: { contentId: 'user-bad', contentType: 'user', reason: 'hate_speech' },
    });

    const response = await flagContentHandler({
      request: req,
      context: contextStub,
      userId: 'user-reporter',
    });

    expect(response.status).toBe(201);
  });
});
