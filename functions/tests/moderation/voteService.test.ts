/**
 * Service-layer tests for Appeal Voting
 */
import type { InvocationContext } from '@azure/functions';

// Mock Cosmos DB BEFORE importing the service
jest.mock('@azure/cosmos');

import { CosmosClient } from '@azure/cosmos';
import { voteOnAppealHandler } from '../../src/moderation/service/voteService';
import { httpReqMock } from '../helpers/http';

const contextStub = { log: jest.fn(), invocationId: 'test-vote' } as unknown as InvocationContext;

const mockQuery = jest.fn();
const mockCreate = jest.fn();
const mockRead = jest.fn();
const mockReplace = jest.fn();

const mockContainer = (_name: string) => ({
  item: jest.fn().mockReturnValue({ read: mockRead, replace: mockReplace }),
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

describe('voteService - validation', () => {
  it('returns 401 when userId is missing', async () => {
    const req = httpReqMock({ method: 'POST', body: {} });
    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: '',
      appealId: 'appeal-1',
    });
    expect(response.status).toBe(401);
  });

  it('returns 400 for missing vote field', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { reason: 'valid reason' },
    });
    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
      appealId: 'appeal-1',
    });
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid vote value', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { vote: 'maybe', reason: 'valid reason here' },
    });
    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
      appealId: 'appeal-1',
    });
    expect(response.status).toBe(400);
  });

  it('returns 400 for too-short reason', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { vote: 'approve', reason: 'short' },
    });
    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
      appealId: 'appeal-1',
    });
    expect(response.status).toBe(400);
  });
});

describe('voteService - appeal lookup', () => {
  it('returns 404 when appeal does not exist', async () => {
    mockRead.mockRejectedValueOnce({ code: 404 });

    const req = httpReqMock({
      method: 'POST',
      body: { vote: 'approve', reason: 'Looks good to me' },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
      appealId: 'missing-appeal',
    });
    expect(response.status).toBe(404);
  });

  it('returns 409 when appeal is already resolved', async () => {
    mockRead.mockResolvedValueOnce({
      resource: { id: 'appeal-1', status: 'resolved', resolution: 'approved' },
    });

    const req = httpReqMock({
      method: 'POST',
      body: { vote: 'approve', reason: 'This appeal looks valid' },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
      appealId: 'appeal-1',
    });
    expect(response.status).toBe(409);
  });
});

describe('voteService - duplicate voting', () => {
  it('returns 409 when user has already voted', async () => {
    mockRead.mockResolvedValueOnce({
      resource: { id: 'appeal-1', status: 'pending' },
    });
    mockQuery.mockResolvedValueOnce({
      resources: [{ id: 'vote-1', voterId: 'user-1', vote: 'approve' }],
    });

    const req = httpReqMock({
      method: 'POST',
      body: { vote: 'reject', reason: 'Changed my mind' },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
      appealId: 'appeal-1',
    });
    expect(response.status).toBe(409);
  });
});

describe('voteService - successful voting', () => {
  it('records vote and returns 201', async () => {
    mockRead.mockResolvedValueOnce({
      resource: { id: 'appeal-1', status: 'pending', votes: { approve: 1, reject: 0 } },
    });
    mockQuery.mockResolvedValueOnce({ resources: [] }); // No existing vote
    mockCreate.mockResolvedValueOnce({ resource: { id: 'vote-new' } });
    mockReplace.mockResolvedValueOnce({});

    const req = httpReqMock({
      method: 'POST',
      body: { vote: 'approve', reason: 'Content appears legitimate', confidence: 8 },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'moderator-1',
      claims: { roles: ['moderator'] },
      appealId: 'appeal-1',
    });
    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalled();
  });
});
