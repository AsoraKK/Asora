/**
 * Service-layer tests for Content Flagging
 */
import type { InvocationContext } from '@azure/functions';

// Mock Cosmos DB, Hive, and rate limiter BEFORE importing the service
jest.mock('@azure/cosmos');
jest.mock('@shared/clients/hive', () => ({
  createHiveClient: jest.fn().mockReturnValue({
    moderateText: jest.fn().mockResolvedValue({ safe: true, scores: {} }),
  }),
  HiveAIClient: jest.fn(),
}));
jest.mock('@shared/utils/rateLimiter', () => ({
  createRateLimiter: jest.fn().mockReturnValue({
    checkRateLimit: jest.fn().mockResolvedValue({ blocked: false, limit: 5, remaining: 4, resetTime: Date.now() + 3600000 }),
  }),
  endpointKeyGenerator: jest.fn(),
  userKeyGenerator: jest.fn(),
  defaultKeyGenerator: jest.fn(),
}));

import { CosmosClient } from '@azure/cosmos';
import { flagContentHandler } from '../../src/moderation/service/flagService';
import { httpReqMock } from '../helpers/http';

const contextStub = { log: jest.fn(), invocationId: 'test-flag' } as unknown as InvocationContext;

const mockQuery = jest.fn();
const mockCreate = jest.fn();
const mockRead = jest.fn();

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

describe('flagService - validation', () => {
  it('returns 401 when userId is missing', async () => {
    const req = httpReqMock({ method: 'POST', body: {} });
    const response = await flagContentHandler({ request: req, context: contextStub, userId: '' });
    expect(response.status).toBe(401);
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
        contentType: 'invalid',
        reason: 'spam',
      },
    });
    const response = await flagContentHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid reason', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-123',
        contentType: 'post',
        reason: 'not_a_real_reason',
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

describe('flagService - duplicate prevention', () => {
  it('returns 409 when user has already flagged content', async () => {
    mockQuery.mockResolvedValueOnce({
      resources: [{ id: 'flag-1', contentId: 'post-123', userId: 'user-1' }],
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
  });
});

describe('flagService - content verification', () => {
  it('returns 404 when content does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ resources: [] }); // No existing flags
    mockRead.mockResolvedValueOnce({ resource: undefined }); // Content not found

    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-999',
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
  });

  it('creates flag successfully when all validations pass', async () => {
    mockQuery.mockResolvedValueOnce({ resources: [] }); // No existing flags
    mockRead.mockResolvedValueOnce({ resource: { id: 'post-123', text: 'some content' } }); // Content exists
    mockCreate.mockResolvedValueOnce({ resource: { id: 'flag-new' } });

    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-123',
        contentType: 'post',
        reason: 'spam',
        additionalDetails: 'This post is promotional spam',
      },
    });

    const response = await flagContentHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalled();
  });
});
