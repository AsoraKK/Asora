/**
 * Server-side filter tests for reviewAppealedContent.
 * Verifies that only pending appeals are accepted for review and that
 * resolved/non-existent appeals are correctly rejected.
 */
import type { InvocationContext } from '@azure/functions';

jest.mock('@azure/cosmos');

jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    verifyAuthorizationHeader: jest.fn(),
  };
});

import { CosmosClient } from '@azure/cosmos';
import { reviewAppealedContentRoute } from '@moderation/reviewAppealedContent';
import { httpReqMock } from '../../tests/helpers/http';

const verifyMock = jest.mocked(require('@auth/verifyJwt').verifyAuthorizationHeader);
const contextStub = { log: jest.fn(), invocationId: 'filter-test' } as unknown as InvocationContext;

const mockItemRead = jest.fn();
const mockItemsCreate = jest.fn();
const mockItemsUpsert = jest.fn();

function setupCosmos(appeal: unknown) {
  mockItemRead.mockResolvedValue({ resource: appeal });
  mockItemsCreate.mockResolvedValue({ resource: {} });
  mockItemsUpsert.mockResolvedValue({ resource: {} });
  (CosmosClient as jest.MockedClass<typeof CosmosClient>).mockImplementation(
    () =>
      ({
        database: () => ({
          container: (name: string) => {
            if (name === 'appeals') {
              return {
                item: jest.fn().mockReturnValue({ read: mockItemRead }),
                items: { upsert: mockItemsUpsert },
              };
            }
            if (name === 'moderation_decisions') {
              return { items: { create: mockItemsCreate } };
            }
            return {
              item: jest.fn().mockReturnValue({
                read: jest.fn().mockResolvedValue({ resource: null }),
                replace: jest.fn().mockResolvedValue({ resource: null }),
              }),
              items: {
                create: jest.fn().mockResolvedValue({ resource: {} }),
                query: jest.fn(() => ({
                  fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
                })),
              },
            };
          },
        }),
      }) as any
  );
  process.env.COSMOS_CONNECTION_STRING = 'mock-connection';
}

function modRequest(params: Record<string, string>, body: unknown) {
  return httpReqMock({
    method: 'POST',
    headers: { authorization: 'Bearer valid-mod-token' },
    params,
    body:
      body && typeof body === 'object'
        ? { finalLabel: 'Human-authored', ...(body as Record<string, unknown>) }
        : body,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  contextStub.log = jest.fn();
  verifyMock.mockResolvedValue({ sub: 'mod-1', roles: ['moderator'], raw: { roles: ['moderator'] } });
});

describe('serverSideFilter: returns only pending appeals for review queue', () => {
  it('accepts a pending appeal and processes the review', async () => {
    setupCosmos({ id: 'a1', status: 'pending', contentId: 'c1', contentType: 'post' });
    const res = await reviewAppealedContentRoute(
      modRequest({ appealId: 'a1' }, { decision: 'approved', reason: 'Looks fine' }),
      contextStub
    );
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.appealId).toBe('a1');
    expect(body.decision).toBe('approved');
  });

  it('rejects an appeal that has already been approved', async () => {
    setupCosmos({ id: 'a2', status: 'resolved_approved', contentId: 'c2', contentType: 'post' });
    const res = await reviewAppealedContentRoute(
      modRequest({ appealId: 'a2' }, { decision: 'rejected', reason: 'Changed mind' }),
      contextStub
    );
    expect(res.status).toBe(400);
    expect(mockItemsCreate).not.toHaveBeenCalled();
  });
});

describe('serverSideFilter: excludes appeals already decided', () => {
  const decidedStatuses = ['resolved_approved', 'resolved_rejected', 'dismissed', 'expired'];

  it.each(decidedStatuses)('blocks review when status is "%s"', async (status) => {
    setupCosmos({ id: 'a3', status, contentId: 'c3', contentType: 'post' });
    const res = await reviewAppealedContentRoute(
      modRequest({ appealId: 'a3' }, { decision: 'approved', reason: 'Test' }),
      contextStub
    );
    expect(res.status).toBe(400);
    expect(mockItemsCreate).not.toHaveBeenCalled();
    expect(mockItemsUpsert).not.toHaveBeenCalled();
  });
});

describe('serverSideFilter: applies content-type filter', () => {
  it('processes a post appeal correctly', async () => {
    setupCosmos({ id: 'a4', status: 'pending', contentId: 'post-1', contentType: 'post' });
    const res = await reviewAppealedContentRoute(
      modRequest({ appealId: 'a4' }, { decision: 'rejected', reason: 'Violates rules' }),
      contextStub
    );
    expect(res.status).toBe(200);
    const [decisionDoc] = mockItemsCreate.mock.calls[0];
    expect(decisionDoc.contentType).toBe('post');
  });

  it('processes a comment appeal correctly', async () => {
    setupCosmos({ id: 'a5', status: 'pending', contentId: 'comment-7', contentType: 'comment' });
    const res = await reviewAppealedContentRoute(
      modRequest({ appealId: 'a5' }, { decision: 'approved', reason: 'False positive' }),
      contextStub
    );
    expect(res.status).toBe(200);
    const [decisionDoc] = mockItemsCreate.mock.calls[0];
    expect(decisionDoc.contentType).toBe('comment');
  });
});

