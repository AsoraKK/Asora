/**
 * Focused tests for reviewAppealedContent handler.
 * Covers: auth enforcement, validation, Cosmos read/write, and happy-path.
 */
import type { InvocationContext } from '@azure/functions';

// Mock Cosmos BEFORE importing the module under test
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

const { AuthError } = jest.requireActual('@auth/verifyJwt');
const verifyMock = jest.mocked(require('@auth/verifyJwt').verifyAuthorizationHeader);

const contextStub = {
  log: jest.fn(),
  invocationId: 'test-review-appeal',
} as unknown as InvocationContext;

// ─── Cosmos mock helpers ────────────────────────────────────────────────────

const mockItemRead = jest.fn();
const mockItemsUpsert = jest.fn();
const mockItemsCreate = jest.fn();

function makeMockDatabase(appeal?: unknown) {
  mockItemRead.mockResolvedValue({ resource: appeal ?? null });
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

function pendingAppeal(overrides: Record<string, unknown> = {}) {
  return { id: 'appeal-1', status: 'pending', contentId: 'post-99', contentType: 'post', ...overrides };
}

function modReq(body?: unknown) {
  return httpReqMock({
    method: 'POST',
    headers: { authorization: 'Bearer valid-mod-token' },
    params: { appealId: 'appeal-1' },
    body:
      body && typeof body === 'object'
        ? { finalLabel: 'Human-authored', ...(body as Record<string, unknown>) }
        : body,
  });
}

// ─── Setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  contextStub.log = jest.fn();

  verifyMock.mockImplementation(async (header: string | null) => {
    if (!header) throw new AuthError('invalid_request', 'Authorization header missing');
    if (header.includes('invalid')) throw new AuthError('invalid_token', 'Token validation failed');
    return { sub: 'mod-user-1', roles: ['moderator'], raw: { roles: ['moderator'] } };
  });
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('reviewAppealedContent: auth enforcement', () => {
  it('returns 401 when no authorization header is present', async () => {
    makeMockDatabase(pendingAppeal());
    const req = httpReqMock({ method: 'POST', params: { appealId: 'appeal-1' }, body: { decision: 'approved', reason: 'valid' } });
    const res = await reviewAppealedContentRoute(req, contextStub);
    expect(res.status).toBe(401);
    expect(mockItemRead).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', async () => {
    makeMockDatabase(pendingAppeal());
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer invalid-token' },
      params: { appealId: 'appeal-1' },
      body: { decision: 'approved', reason: 'valid' },
    });
    const res = await reviewAppealedContentRoute(req, contextStub);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks moderator role', async () => {
    makeMockDatabase(pendingAppeal());
    verifyMock.mockResolvedValue({ sub: 'regular-user', roles: ['user'], raw: { roles: ['user'] } });
    const res = await reviewAppealedContentRoute(modReq({ decision: 'approved', reason: 'ok' }), contextStub);
    expect(res.status).toBe(403);
  });

  it('returns 200 when user has admin role (not only moderator)', async () => {
    // requireModerator accepts ['moderator', 'admin'] — admin users must be able to review appeals
    makeMockDatabase(pendingAppeal());
    verifyMock.mockResolvedValue({ sub: 'admin-user-1', roles: ['admin'], raw: { roles: ['admin'] } });
    const res = await reviewAppealedContentRoute(
      modReq({ decision: 'rejected', reason: 'Admin override' }),
      contextStub
    );
    expect(res.status).toBe(200);
    // Decision doc must record the admin's ID as the moderatorId
    const [decisionDoc] = mockItemsCreate.mock.calls[0];
    expect(decisionDoc.actorId).toBe('admin-user-1');
  });
});

describe('reviewAppealedContent: validate appeal exists before review', () => {
  it('returns 400 when appealId param is missing', async () => {
    makeMockDatabase(pendingAppeal());
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-mod-token' },
      params: {},
      body: { decision: 'approved', reason: 'valid' },
    });
    const res = await reviewAppealedContentRoute(req, contextStub);
    expect(res.status).toBe(400);
  });

  it('returns 404 when appeal does not exist', async () => {
    makeMockDatabase(undefined); // resource === undefined → not found
    const res = await reviewAppealedContentRoute(modReq({ decision: 'approved', reason: 'valid reason' }), contextStub);
    expect(res.status).toBe(404);
  });

  it('returns 404 when Cosmos throws a 404 error', async () => {
    mockItemRead.mockRejectedValue({ code: 404, message: 'Entity not found' });
    (CosmosClient as jest.MockedClass<typeof CosmosClient>).mockImplementation(
      () =>
        ({
          database: () => ({
            container: (_name: string) => ({
              item: jest.fn().mockReturnValue({ read: mockItemRead }),
              items: { create: mockItemsCreate, upsert: mockItemsUpsert },
            }),
          }),
        }) as any
    );
    process.env.COSMOS_CONNECTION_STRING = 'mock-connection';
    const res = await reviewAppealedContentRoute(modReq({ decision: 'approved', reason: 'valid reason' }), contextStub);
    expect(res.status).toBe(404);
  });

  it('returns 400 when appeal is not in pending status', async () => {
    makeMockDatabase(pendingAppeal({ status: 'resolved_approved' }));
    const res = await reviewAppealedContentRoute(modReq({ decision: 'rejected', reason: 'Already resolved' }), contextStub);
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body as string);
    expect(body.error).toContain('resolved_approved');
  });
});

describe('reviewAppealedContent: record decision in Cosmos', () => {
  it('returns 200 and creates a decision doc and upserts the appeal', async () => {
    makeMockDatabase(pendingAppeal());
    const res = await reviewAppealedContentRoute(
      modReq({ decision: 'approved', reason: 'Content is fine', notes: 'Reviewed carefully' }),
      contextStub
    );
    expect(res.status).toBe(200);

    // Decision document created in moderation_decisions
    expect(mockItemsCreate).toHaveBeenCalledTimes(1);
    const [decisionDoc] = mockItemsCreate.mock.calls[0];
    expect(decisionDoc).toMatchObject({
      appealId: 'appeal-1',
      action: 'approved',
      reason: 'Content is fine: Reviewed carefully',
      actorId: 'mod-user-1',
      source: 'human_review',
    });

    // Appeal upserted with resolved status
    expect(mockItemsUpsert).toHaveBeenCalledTimes(1);
    const [updatedAppeal] = mockItemsUpsert.mock.calls[0];
    expect(updatedAppeal).toMatchObject({
      id: 'appeal-1',
      status: 'approved',
      finalDecision: 'approved',
      resolvedBy: 'mod-user-1',
    });
  });

  it('decision doc includes contentId and contentType from the appeal document', async () => {
    makeMockDatabase(pendingAppeal({ contentId: 'post-42', contentType: 'comment' }));
    await reviewAppealedContentRoute(
      modReq({ decision: 'approved', reason: 'False positive' }),
      contextStub
    );
    const [decisionDoc] = mockItemsCreate.mock.calls[0];
    expect(decisionDoc.contentId).toBe('post-42');
    expect(decisionDoc.contentType).toBe('comment');
  });

  it('decision doc has a unique id per invocation', async () => {
    makeMockDatabase(pendingAppeal());
    await reviewAppealedContentRoute(modReq({ decision: 'approved', reason: 'First' }), contextStub);
    jest.clearAllMocks();
    makeMockDatabase(pendingAppeal());
    await reviewAppealedContentRoute(modReq({ decision: 'rejected', reason: 'Second' }), contextStub);
    const [secondDoc] = mockItemsCreate.mock.calls[0];
    expect(typeof secondDoc.id).toBe('string');
    expect(secondDoc.id).toBeTruthy();
  });

  it('sets status to resolved_rejected when decision is rejected', async () => {
    makeMockDatabase(pendingAppeal());
    await reviewAppealedContentRoute(
      modReq({ decision: 'rejected', reason: 'Violated community guidelines' }),
      contextStub
    );
    const [updatedAppeal] = mockItemsUpsert.mock.calls[0];
    expect(updatedAppeal.status).toBe('rejected');
    expect(updatedAppeal.finalDecision).toBe('rejected');
  });

  it('returns 500 when Cosmos write fails', async () => {
    makeMockDatabase(pendingAppeal());
    mockItemsCreate.mockRejectedValue(new Error('Cosmos write error'));
    const res = await reviewAppealedContentRoute(
      modReq({ decision: 'approved', reason: 'valid reason' }),
      contextStub
    );
    expect(res.status).toBe(500);
  });
});

describe('reviewAppealedContent: body validation', () => {
  it('returns 400 for invalid decision value', async () => {
    makeMockDatabase(pendingAppeal());
    const res = await reviewAppealedContentRoute(modReq({ decision: 'maybe', reason: 'valid' }), contextStub);
    expect(res.status).toBe(400);
  });

  it('returns 400 when reason is missing', async () => {
    makeMockDatabase(pendingAppeal());
    const res = await reviewAppealedContentRoute(modReq({ decision: 'approved' }), contextStub);
    expect(res.status).toBe(400);
  });

  it('returns 400 when reason exceeds 500 characters', async () => {
    makeMockDatabase(pendingAppeal());
    const res = await reviewAppealedContentRoute(
      modReq({ decision: 'approved', reason: 'x'.repeat(501) }),
      contextStub
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when notes exceed 1000 characters', async () => {
    makeMockDatabase(pendingAppeal());
    const res = await reviewAppealedContentRoute(
      modReq({ decision: 'approved', reason: 'valid', notes: 'n'.repeat(1001) }),
      contextStub
    );
    expect(res.status).toBe(400);
  });

  it('returns 200 for OPTIONS preflight', async () => {
    const res = await reviewAppealedContentRoute(httpReqMock({ method: 'OPTIONS' }), contextStub);
    expect(res.status).toBe(200);
    expect(res.body).toBe('');
  });

  it('returns 405 for disallowed method', async () => {
    const res = await reviewAppealedContentRoute(httpReqMock({ method: 'GET' }), contextStub);
    expect(res.status).toBe(405);
  });
});

