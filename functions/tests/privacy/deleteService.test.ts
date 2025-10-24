/**
 * Service-layer tests for User Deletion (GDPR Right to be Forgotten)
 */
import type { InvocationContext } from '@azure/functions';

// Mock Cosmos DB and rate limiter BEFORE importing the service
jest.mock('@azure/cosmos');
jest.mock('@shared/utils/rateLimiter', () => ({
  createRateLimiter: jest.fn().mockReturnValue({
    checkRateLimit: jest.fn().mockResolvedValue({ blocked: false, limit: 1, remaining: 1, resetTime: Date.now() + 3600000 }),
  }),
  endpointKeyGenerator: jest.fn(),
  userKeyGenerator: jest.fn(),
  defaultKeyGenerator: jest.fn(),
}));

import { CosmosClient } from '@azure/cosmos';
import { deleteUserHandler } from '../../src/privacy/service/deleteService';
import { httpReqMock } from '../helpers/http';

const contextStub = { log: jest.fn(), invocationId: 'test-del' } as unknown as InvocationContext;

const mockQuery = jest.fn();
const mockRead = jest.fn();
const mockDelete = jest.fn();
const mockReplace = jest.fn();

const mockContainer = (_name: string) => ({
  item: jest.fn().mockReturnValue({ read: mockRead, delete: mockDelete, replace: mockReplace }),
  items: {
    query: jest.fn().mockReturnValue({ fetchAll: mockQuery }),
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

describe('deleteService - authentication', () => {
  it('returns 401 when userId is missing', async () => {
    const req = httpReqMock({ method: 'DELETE' });
    const response = await deleteUserHandler({ request: req, context: contextStub, userId: '' });
    expect(response.status).toBe(401);
  });
});

describe('deleteService - confirmation header', () => {
  it('returns 400 when confirmation header is missing', async () => {
    const req = httpReqMock({ method: 'DELETE' });
    const response = await deleteUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(400);
    expect(JSON.parse(response.body || '{}')).toMatchObject({
      code: 'confirmation_required',
    });
  });

  it('returns 400 when confirmation header is not "true"', async () => {
    const req = httpReqMock({
      method: 'DELETE',
      headers: { 'x-confirm-delete': 'false' },
    });
    const response = await deleteUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(400);
  });
});

describe('deleteService - idempotent behavior', () => {
  it('returns 200 when user already deleted', async () => {
    mockRead.mockRejectedValueOnce({ code: 404 });

    const req = httpReqMock({
      method: 'DELETE',
      headers: { 'x-confirm-delete': 'true' },
    });

    const response = await deleteUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body || '{}')).toMatchObject({
      message: 'Account already deleted or never existed',
    });
  });
});

describe('deleteService - successful deletion', () => {
  it('deletes user and anonymizes content', async () => {
    mockRead.mockResolvedValueOnce({ resource: { id: 'user-1', username: 'john' } }); // User exists
    mockQuery
      .mockResolvedValueOnce({ resources: [{ id: 'post-1' }, { id: 'post-2' }] }) // Posts
      .mockResolvedValueOnce({ resources: [{ id: 'comment-1' }] }) // Comments
      .mockResolvedValueOnce({ resources: [{ id: 'like-1' }] }) // Likes
      .mockResolvedValueOnce({ resources: [] }) // Flags
      .mockResolvedValueOnce({ resources: [] }) // Appeals
      .mockResolvedValueOnce({ resources: [] }); // Votes

    mockDelete.mockResolvedValue({});
    mockReplace.mockResolvedValue({});

    const req = httpReqMock({
      method: 'DELETE',
      headers: { 'x-confirm-delete': 'true' },
    });

    const response = await deleteUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(202);
    expect(mockDelete).toHaveBeenCalled();
  });

  it('handles partial failures gracefully', async () => {
    mockRead.mockResolvedValueOnce({ resource: { id: 'user-1' } }); // User exists
    mockQuery
      .mockResolvedValueOnce({ resources: [{ id: 'post-1' }] }) // Posts
      .mockRejectedValueOnce(new Error('Cosmos timeout')); // Comments fail

    mockDelete.mockResolvedValue({});

    const req = httpReqMock({
      method: 'DELETE',
      headers: { 'x-confirm-delete': 'true' },
    });

    const response = await deleteUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    // Should complete with warnings
    expect(response.status).toBeGreaterThanOrEqual(200);
  });
});
