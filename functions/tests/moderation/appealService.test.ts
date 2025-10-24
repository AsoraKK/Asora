/**
 * Service-layer tests for Appeal Submission
 */
import type { InvocationContext } from '@azure/functions';

// Mock Cosmos DB BEFORE importing the service
jest.mock('@azure/cosmos');

import { CosmosClient } from '@azure/cosmos';
import { submitAppealHandler } from '../../src/moderation/service/appealService';
import { httpReqMock } from '../helpers/http';

const contextStub = { log: jest.fn(), invocationId: 'test-appeal' } as unknown as InvocationContext;

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

describe('appealService - validation', () => {
  it('returns 401 when userId is missing', async () => {
    const req = httpReqMock({ method: 'POST', body: {} });
    const response = await submitAppealHandler({ request: req, context: contextStub, userId: '' });
    expect(response.status).toBe(401);
  });

  it('returns 400 for missing required fields', async () => {
    const req = httpReqMock({ method: 'POST', body: {} });
    const response = await submitAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(400);
    expect(response.jsonBody).toMatchObject({ error: 'Invalid request data' });
  });

  it('returns 400 for invalid appeal type', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-123',
        contentType: 'post',
        appealType: 'invalid_type',
        appealReason: 'short reason',
        userStatement: 'This is my statement about the appeal',
      },
    });
    const response = await submitAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(400);
  });

  it('returns 400 for too-short appeal reason', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-123',
        contentType: 'post',
        appealType: 'false_positive',
        appealReason: 'short',
        userStatement: 'This is my statement about the appeal',
      },
    });
    const response = await submitAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(400);
  });
});

describe('appealService - duplicate prevention', () => {
  it('returns 409 when appeal already exists', async () => {
    mockQuery.mockResolvedValueOnce({
      resources: [{ id: 'appeal-1', status: 'pending', submitterId: 'user-1' }],
    });

    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-123',
        contentType: 'post',
        appealType: 'false_positive',
        appealReason: 'This was incorrectly flagged',
        userStatement: 'I believe this content does not violate any rules',
      },
    });

    const response = await submitAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(409);
    expect(response.jsonBody).toMatchObject({
      error: 'You already have a pending appeal for this content',
    });
  });
});

describe('appealService - content verification', () => {
  it('returns 404 when content does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ resources: [] }); // No existing appeals
    mockRead.mockResolvedValueOnce({ resource: undefined }); // Content not found

    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-999',
        contentType: 'post',
        appealType: 'false_positive',
        appealReason: 'This was incorrectly flagged',
        userStatement: 'I believe this content does not violate any rules and should be reviewed',
      },
    });

    const response = await submitAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(404);
  });

  it('creates appeal successfully when all validations pass', async () => {
    mockQuery.mockResolvedValueOnce({ resources: [] }); // No existing appeals
    mockRead.mockResolvedValueOnce({
      resource: { id: 'post-123', moderationStatus: 'flagged' },
    }); // Content exists
    mockCreate.mockResolvedValueOnce({ resource: { id: 'appeal-new' } });

    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-123',
        contentType: 'post',
        appealType: 'false_positive',
        appealReason: 'This was incorrectly flagged as spam',
        userStatement:
          'I believe this content does not violate any rules and should be reviewed by moderators',
      },
    });

    const response = await submitAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });
    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalled();
  });
});
