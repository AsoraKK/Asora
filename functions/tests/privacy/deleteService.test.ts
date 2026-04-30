/**
 * Service-layer tests for User Deletion (GDPR Right to be Forgotten)
 */
import type { InvocationContext } from '@azure/functions';

// Mock Cosmos DB and rate limiter BEFORE importing the service
jest.mock('@azure/cosmos');
// cascadeDelete imports dsrStore which calls getCosmosDatabase() at module init;
// mock it before deleteService is imported to prevent that eager evaluation.
jest.mock('../../src/privacy/service/cascadeDelete', () => ({
  executeCascadeDelete: jest.fn().mockResolvedValue({
    userId: 'user-1',
    deletedAt: new Date().toISOString(),
    deletedBy: 'user_request',
    cosmos: { deleted: { users: 1, likes: 0 }, anonymized: { posts: 0 }, skippedDueToHold: {} },
    postgres: { deleted: { follows: 0, profiles: 1, auth_identities: 1, refresh_tokens: 2, users: 1 } },
    errors: [],
  }),
}));
jest.mock('@auth/service/refreshTokenStore', () => ({
  revokeAllUserTokens: jest.fn().mockResolvedValue(2),
}));
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
    const body = JSON.parse(response.body as string);
    expect(body).toMatchObject({
      message: 'Account deletion completed (user already deleted)',
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
    expect(response.status).toBe(200);
    // New implementation uses executeCascadeDelete, not direct Cosmos operations
    const { executeCascadeDelete } = require('../../src/privacy/service/cascadeDelete');
    expect(executeCascadeDelete).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', deletedBy: 'user_request' }),
    );
  });

  it('handles partial failures gracefully', async () => {
    mockRead.mockResolvedValueOnce({ resource: { id: 'user-1' } }); // User exists
    // Simulate a non-fatal cascade error via the mock result
    const { executeCascadeDelete } = require('../../src/privacy/service/cascadeDelete');
    (executeCascadeDelete as jest.Mock).mockResolvedValueOnce({
      userId: 'user-1',
      deletedAt: new Date().toISOString(),
      deletedBy: 'user_request',
      cosmos: { deleted: { users: 1 }, anonymized: {}, skippedDueToHold: {} },
      postgres: { deleted: {} },
      errors: [{ container: 'comments', error: 'Cosmos timeout' }],
    });

    const req = httpReqMock({
      method: 'DELETE',
      headers: { 'x-confirm-delete': 'true' },
    });

    const response = await deleteUserHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    // Should complete with partial failure flag
    expect(response.status).toBe(200);
  });
});
