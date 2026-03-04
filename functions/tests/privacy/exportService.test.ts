/**
 * Service-layer tests for User Data Export (GDPR Data Portability)
 */
import type { InvocationContext } from '@azure/functions';

// Mock Cosmos DB and rate limiter BEFORE importing the service
jest.mock('@azure/cosmos');
jest.mock('@shared/utils/rateLimiter', () => ({
  createRateLimiter: jest.fn().mockReturnValue({
    checkRateLimit: jest.fn().mockResolvedValue({ blocked: false, limit: 1, remaining: 1, resetTime: Date.now() + 86400000 }),
  }),
  endpointKeyGenerator: jest.fn(),
  userKeyGenerator: jest.fn(),
  defaultKeyGenerator: jest.fn(),
}));
jest.mock('@shared/services/exportCooldownService', () => {
  const actual = jest.requireActual('@shared/services/exportCooldownService');
  return {
    ...actual,
    enforceExportCooldown: jest.fn(),
    recordExportTimestamp: jest.fn(),
  };
});

import { CosmosClient } from '@azure/cosmos';
import { exportUserHandler } from '../../src/privacy/service/exportService';
import { httpReqMock } from '../helpers/http';

const contextStub = { log: jest.fn(), invocationId: 'test-exp' } as unknown as InvocationContext;

const mockQuery = jest.fn();
const mockRead = jest.fn();
const mockCreate = jest.fn();

const mockContainer = (_name: string) => ({
  item: jest.fn().mockReturnValue({ read: mockRead }),
  items: {
    query: jest.fn().mockReturnValue({ fetchAll: mockQuery }),
    create: mockCreate,
  },
});

const exportCooldownModule = require('@shared/services/exportCooldownService');
const mockEnforceExportCooldown = jest.mocked(exportCooldownModule.enforceExportCooldown);
const mockRecordExportTimestamp = jest.mocked(exportCooldownModule.recordExportTimestamp);
const { ExportCooldownActiveError } = exportCooldownModule;

beforeEach(() => {
  jest.clearAllMocks();

  mockEnforceExportCooldown.mockResolvedValue(undefined);
  mockRecordExportTimestamp.mockResolvedValue(undefined);

  (CosmosClient as jest.MockedClass<typeof CosmosClient>).mockImplementation(
    () =>
      ({
        database: () => ({
          container: mockContainer,
        }),
      }) as any
  );

  process.env.COSMOS_CONNECTION_STRING = 'mock-connection';
});

describe('exportService - authentication', () => {
  it('returns 401 when userId is missing', async () => {
    const req = httpReqMock({ method: 'GET' });
    const response = await exportUserHandler({ request: req, context: contextStub, userId: '', tier: 'free' });
    expect(response.status).toBe(401);
  });
});

describe('exportService - user verification', () => {
  it('returns 404 when user does not exist', async () => {
    mockRead.mockRejectedValueOnce({ code: 404 });

    const req = httpReqMock({ method: 'GET' });
    const response = await exportUserHandler({
      request: req,
      context: contextStub,
      userId: 'missing-user',
      tier: 'free',
    });
    expect(response.status).toBe(404);
  });
});

describe('exportService - successful export', () => {
  it('returns complete user data export', async () => {
    mockRead.mockResolvedValueOnce({
      resource: {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        created_at: '2025-01-01T00:00:00Z',
        tier: 'free',
      },
    });

    mockQuery
      .mockResolvedValueOnce({ resources: [{ id: 'post-1', text: 'hello' }] }) // Posts
      .mockResolvedValueOnce({ resources: [{ id: 'comment-1', text: 'nice' }] }) // Comments
      .mockResolvedValueOnce({ resources: [{ id: 'like-1', contentId: 'post-2' }] }) // Likes
      .mockResolvedValueOnce({ resources: [] }) // Flags
      .mockResolvedValueOnce({ resources: [] }) // Appeals
      .mockResolvedValueOnce({ resources: [] }) // Votes
      .mockResolvedValueOnce({ resources: [] }); // Previous exports

    mockCreate.mockResolvedValue({});

    const req = httpReqMock({ method: 'GET' });
    const response = await exportUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
      tier: 'free',
    });

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body || '{}');
    expect(body).toHaveProperty('metadata');
    expect(body).toHaveProperty('userProfile');
    expect(body).toHaveProperty('content');
    expect(mockCreate).toHaveBeenCalled(); // Logs the export
    expect(mockEnforceExportCooldown).toHaveBeenCalledWith('user-1', 'free', 30);
    expect(mockRecordExportTimestamp).toHaveBeenCalledWith('user-1');
  });

  it('handles missing content gracefully', async () => {
    mockRead.mockResolvedValueOnce({
      resource: {
        id: 'user-2',
        username: 'newuser',
        created_at: '2025-10-01T00:00:00Z',
        tier: 'free',
      },
    });

    // All empty queries
    mockQuery
      .mockResolvedValueOnce({ resources: [] }) // Posts
      .mockResolvedValueOnce({ resources: [] }) // Comments
      .mockResolvedValueOnce({ resources: [] }) // Likes
      .mockResolvedValueOnce({ resources: [] }) // Flags
      .mockResolvedValueOnce({ resources: [] }) // Appeals
      .mockResolvedValueOnce({ resources: [] }) // Votes
      .mockResolvedValueOnce({ resources: [] }); // Previous exports

    mockCreate.mockResolvedValue({});

    const req = httpReqMock({ method: 'GET' });
    const response = await exportUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-2',
      tier: 'free',
    });

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body || '{}');
    expect(body.content.posts).toEqual([]);
    expect(body.content.comments).toEqual([]);
  });

  it('handles Cosmos errors gracefully', async () => {
    mockRead.mockRejectedValueOnce(new Error('Cosmos connection failed'));

    const req = httpReqMock({ method: 'GET' });
    const response = await exportUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
      tier: 'free',
    });

    expect(response.status).toBe(500);
    expect(JSON.parse(response.body || '{}')).toMatchObject({
      error: 'Failed to export user data',
    });
  });
});

// ─────────────────────────────────────────────────────────────
// D1: Interactions & Moderation Export Tests
// ─────────────────────────────────────────────────────────────

describe('exportService - interactions section', () => {
  it('includes likes in export', async () => {
    mockRead.mockResolvedValueOnce({
      resource: { id: 'user-1', username: 'testuser', tier: 'free' },
    });

    const mockLikes = [
      { id: 'like-1', contentId: 'post-1', contentType: 'post', createdAt: '2025-01-15T10:00:00Z' },
      { id: 'like-2', contentId: 'comment-1', contentType: 'comment', createdAt: '2025-01-16T10:00:00Z' },
    ];

    mockQuery
      .mockResolvedValueOnce({ resources: [] }) // Posts
      .mockResolvedValueOnce({ resources: [] }) // Comments
      .mockResolvedValueOnce({ resources: mockLikes }) // Likes
      .mockResolvedValueOnce({ resources: [] }) // Flags
      .mockResolvedValueOnce({ resources: [] }) // Appeals
      .mockResolvedValueOnce({ resources: [] }); // Votes

    mockCreate.mockResolvedValue({});

    const req = httpReqMock({ method: 'GET' });
    const response = await exportUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
      tier: 'free',
    });

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body || '{}');
    expect(body.interactions).toBeDefined();
    expect(body.interactions.likes).toHaveLength(2);
    expect(body.interactions.likes[0]).toHaveProperty('contentId', 'post-1');
    expect(body.interactions.likes[1]).toHaveProperty('contentType', 'comment');
  });

  it('includes flags submitted by user in export', async () => {
    mockRead.mockResolvedValueOnce({
      resource: { id: 'user-1', username: 'testuser', tier: 'free' },
    });

    const mockFlags = [
      {
        id: 'flag-1',
        contentId: 'post-999',
        contentType: 'post',
        reason: 'spam',
        description: 'Promotional content',
        createdAt: '2025-01-20T10:00:00Z',
        status: 'resolved',
      },
      {
        id: 'flag-2',
        contentId: 'comment-888',
        contentType: 'comment',
        reason: 'harassment',
        createdAt: '2025-01-21T10:00:00Z',
        status: 'active',
      },
    ];

    mockQuery
      .mockResolvedValueOnce({ resources: [] }) // Posts
      .mockResolvedValueOnce({ resources: [] }) // Comments
      .mockResolvedValueOnce({ resources: [] }) // Likes
      .mockResolvedValueOnce({ resources: mockFlags }) // Flags
      .mockResolvedValueOnce({ resources: [] }) // Appeals
      .mockResolvedValueOnce({ resources: [] }); // Votes

    mockCreate.mockResolvedValue({});

    const req = httpReqMock({ method: 'GET' });
    const response = await exportUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
      tier: 'free',
    });

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body || '{}');
    expect(body.interactions).toBeDefined();
    expect(body.interactions.flags).toHaveLength(2);
    expect(body.interactions.flags[0]).toMatchObject({
      id: 'flag-1',
      contentId: 'post-999',
      reason: 'spam',
      status: 'resolved',
    });
    expect(body.userProfile.statistics.totalFlags).toBe(2);
  });
});

describe('exportService - moderation section', () => {
  it('includes appeals submitted by user in export', async () => {
    mockRead.mockResolvedValueOnce({
      resource: { id: 'user-1', username: 'testuser', tier: 'free' },
    });

    const mockAppeals = [
      {
        id: 'appeal-1',
        contentId: 'post-123',
        reason: 'I believe this was flagged incorrectly',
        status: 'approved',
        createdAt: '2025-01-22T10:00:00Z',
        resolvedAt: '2025-01-23T10:00:00Z',
        finalDecision: 'Content restored',
      },
      {
        id: 'appeal-2',
        contentId: 'comment-456',
        reason: 'This was taken out of context',
        status: 'pending',
        createdAt: '2025-01-25T10:00:00Z',
      },
    ];

    mockQuery
      .mockResolvedValueOnce({ resources: [] }) // Posts
      .mockResolvedValueOnce({ resources: [] }) // Comments
      .mockResolvedValueOnce({ resources: [] }) // Likes
      .mockResolvedValueOnce({ resources: [] }) // Flags
      .mockResolvedValueOnce({ resources: mockAppeals }) // Appeals
      .mockResolvedValueOnce({ resources: [] }); // Votes

    mockCreate.mockResolvedValue({});

    const req = httpReqMock({ method: 'GET' });
    const response = await exportUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
      tier: 'free',
    });

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body || '{}');
    expect(body.moderation).toBeDefined();
    expect(body.moderation.appeals).toHaveLength(2);
    expect(body.moderation.appeals[0]).toMatchObject({
      id: 'appeal-1',
      contentId: 'post-123',
      status: 'approved',
      finalDecision: 'Content restored',
    });
    expect(body.moderation.appeals[1].status).toBe('pending');
  });

  it('includes votes cast by user on appeals', async () => {
    mockRead.mockResolvedValueOnce({
      resource: { id: 'user-1', username: 'testuser', tier: 'free' },
    });

    const mockVotes = [
      {
        appealId: 'appeal-100',
        vote: 'approve',
        reason: 'Content appears legitimate',
        createdAt: '2025-01-26T10:00:00Z',
      },
      {
        appealId: 'appeal-101',
        vote: 'reject',
        reason: 'Clear violation',
        createdAt: '2025-01-27T10:00:00Z',
      },
    ];

    mockQuery
      .mockResolvedValueOnce({ resources: [] }) // Posts
      .mockResolvedValueOnce({ resources: [] }) // Comments
      .mockResolvedValueOnce({ resources: [] }) // Likes
      .mockResolvedValueOnce({ resources: [] }) // Flags
      .mockResolvedValueOnce({ resources: [] }) // Appeals
      .mockResolvedValueOnce({ resources: mockVotes }); // Votes

    mockCreate.mockResolvedValue({});

    const req = httpReqMock({ method: 'GET' });
    const response = await exportUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
      tier: 'free',
    });

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body || '{}');
    expect(body.moderation).toBeDefined();
    expect(body.moderation.votes).toHaveLength(2);
    expect(body.moderation.votes[0]).toMatchObject({
      appealId: 'appeal-100',
      vote: 'approve',
    });
    expect(body.moderation.votes[1]).toMatchObject({
      appealId: 'appeal-101',
      vote: 'reject',
    });
  });

  it('includes all data categories with populated content', async () => {
    mockRead.mockResolvedValueOnce({
      resource: {
        id: 'user-1',
        username: 'activeuser',
        email: 'active@example.com',
        tier: 'premium',
        createdAt: '2024-01-01T00:00:00Z',
      },
    });

    // Fully populated export
    mockQuery
      .mockResolvedValueOnce({ resources: [{ id: 'post-1', text: 'My post' }] }) // Posts
      .mockResolvedValueOnce({ resources: [{ id: 'comment-1', text: 'My comment' }] }) // Comments
      .mockResolvedValueOnce({ resources: [{ contentId: 'post-2' }] }) // Likes
      .mockResolvedValueOnce({ resources: [{ id: 'flag-1', reason: 'spam' }] }) // Flags
      .mockResolvedValueOnce({ resources: [{ id: 'appeal-1', status: 'pending' }] }) // Appeals
      .mockResolvedValueOnce({ resources: [{ appealId: 'appeal-2', vote: 'approve' }] }); // Votes

    mockCreate.mockResolvedValue({});

    const req = httpReqMock({ method: 'GET' });
    const response = await exportUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
      tier: 'premium',
    });

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body || '{}');

    // Verify all sections exist
    expect(body).toHaveProperty('metadata');
    expect(body).toHaveProperty('userProfile');
    expect(body).toHaveProperty('content');
    expect(body).toHaveProperty('interactions');
    expect(body).toHaveProperty('moderation');
    expect(body).toHaveProperty('privacy');

    // Verify content section
    expect(body.content.posts).toHaveLength(1);
    expect(body.content.comments).toHaveLength(1);

    // Verify interactions section
    expect(body.interactions.likes).toHaveLength(1);
    expect(body.interactions.flags).toHaveLength(1);

    // Verify moderation section
    expect(body.moderation.appeals).toHaveLength(1);
    expect(body.moderation.votes).toHaveLength(1);

    // Verify statistics are updated
    expect(body.userProfile.statistics.totalPosts).toBe(1);
    expect(body.userProfile.statistics.totalComments).toBe(1);
    expect(body.userProfile.statistics.totalLikes).toBe(1);
    expect(body.userProfile.statistics.totalFlags).toBe(1);
  });
});

describe('exportService - cooldown window', () => {
  it('returns cooldown error while export is still on cooldown', async () => {
    const nextAvailableAt = new Date(Date.now() + 60 * 60 * 1000);
    const cooldownError = new ExportCooldownActiveError(nextAvailableAt, 'free');
    mockEnforceExportCooldown.mockRejectedValueOnce(cooldownError);

    const req = httpReqMock({ method: 'GET' });
    const response = await exportUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-cooldown',
      tier: 'free',
    });

    expect(response.status).toBe(429);
    const body = JSON.parse(response.body || '{}');
    expect(body).toMatchObject({
      code: 'EXPORT_COOLDOWN_ACTIVE',
      tier: 'free',
      nextAvailableAt: nextAvailableAt.toISOString(),
    });
    expect(mockRecordExportTimestamp).not.toHaveBeenCalled();
    expect(mockEnforceExportCooldown).toHaveBeenCalledWith('user-cooldown', 'free', 30);
  });

  it('records export timestamp for premium-tier exports', async () => {
    mockRead.mockResolvedValueOnce({
      resource: {
        id: 'user-2',
        username: 'premium-user',
        tier: 'premium',
        created_at: '2024-12-01T00:00:00Z',
      },
    });

    mockQuery.mockResolvedValue({ resources: [] });
    mockCreate.mockResolvedValue({});

    const req = httpReqMock({ method: 'GET' });
    const response = await exportUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-2',
      tier: 'premium',
    });

    expect(response.status).toBe(200);
    expect(mockEnforceExportCooldown).toHaveBeenCalledWith('user-2', 'premium', 7);
    expect(mockRecordExportTimestamp).toHaveBeenCalledWith('user-2');
  });
});
