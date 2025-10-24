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

beforeEach(() => {
  jest.clearAllMocks();

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
    const response = await exportUserHandler({ request: req, context: contextStub, userId: '' });
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
    });

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body || '{}');
    expect(body).toHaveProperty('metadata');
    expect(body).toHaveProperty('userProfile');
    expect(body).toHaveProperty('content');
    expect(mockCreate).toHaveBeenCalled(); // Logs the export
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
    });

    expect(response.status).toBe(500);
    expect(JSON.parse(response.body || '{}')).toMatchObject({
      error: 'Failed to export user data',
    });
  });
});
