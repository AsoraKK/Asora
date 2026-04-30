import type { InvocationContext } from '@azure/functions';

import { voteOnAppealRoute } from '@moderation/routes/voteOnAppeal';
import { httpReqMock } from '../helpers/http';

const appealsFetchAll = jest.fn();
const appealsReplace = jest.fn();
const votesFetchAll = jest.fn();
const votesCreate = jest.fn();
const usersRead = jest.fn();
const postsRead = jest.fn();
const postsReplace = jest.fn();
const moderationDecisionsCreate = jest.fn();

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(() => ({
    container: jest.fn((name: string) => {
      if (name === 'appeals') {
        return {
          items: {
            query: jest.fn(() => ({
              fetchAll: jest.fn(async () => appealsFetchAll()),
            })),
          },
          item: jest.fn(() => ({ replace: appealsReplace })),
        };
      }
      if (name === 'appeal_votes') {
        return {
          items: {
            query: jest.fn((query: { query: string }) => ({
              fetchAll: jest.fn(async () => votesFetchAll(query)),
            })),
            create: votesCreate,
          },
        };
      }
      if (name === 'users') {
        return {
          item: jest.fn(() => ({ read: usersRead })),
        };
      }
      if (name === 'posts') {
        return {
          item: jest.fn(() => ({ read: postsRead, replace: postsReplace })),
          items: { query: jest.fn() },
        };
      }
      if (name === 'moderation_decisions') {
        return {
          items: { create: moderationDecisionsCreate },
        };
      }
      return { items: { query: jest.fn(), create: jest.fn() } };
    }),
  })),
}));

jest.mock('@auth/service/usersService', () => ({
  usersService: {
    getUserById: jest.fn(),
  },
}));

jest.mock('@shared/services/reputationService', () => ({
  penalizeContentRemoval: jest.fn(),
}));

jest.mock('@shared/services/receiptEvents', () => ({
  appendReceiptEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@shared/services/notificationEvents', () => ({
  enqueueUserNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    verifyAuthorizationHeader: jest.fn(),
  };
});

const { AuthError } = jest.requireActual('@auth/verifyJwt');
const verifyMock = jest.mocked(require('@auth/verifyJwt').verifyAuthorizationHeader);
const { usersService } = require('@auth/service/usersService') as { usersService: { getUserById: jest.Mock } };
const { appendReceiptEvent } = require('@shared/services/receiptEvents') as { appendReceiptEvent: jest.Mock };
const { enqueueUserNotification } = require('@shared/services/notificationEvents') as { enqueueUserNotification: jest.Mock };

const contextStub = {
  invocationId: 'vote-integration',
  log: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

function createAppeal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'appeal-1',
    contentId: 'post-1',
    contentType: 'post',
    status: 'pending',
    submitterId: 'submitter-1',
    appealReason: 'This content should be restored',
    votesFor: 0,
    votesAgainst: 0,
    requiredVotes: 3,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    ...overrides,
  };
}

function setupCosmos(options?: { appeal?: Record<string, unknown>; existingVotes?: unknown[]; dailyCount?: number }) {
  appealsFetchAll.mockResolvedValue({ resources: [options?.appeal ?? createAppeal()] });
  votesFetchAll.mockImplementation(async (query: { query: string }) => {
    if (query.query.includes('COUNT(1)')) {
      return { resources: [options?.dailyCount ?? 0] };
    }
    return { resources: options?.existingVotes ?? [] };
  });
  appealsReplace.mockResolvedValue({});
  votesCreate.mockResolvedValue({ resource: { id: 'vote-1' } });
  usersRead.mockResolvedValue({ resource: { name: 'Moderator One' } });
  postsRead.mockResolvedValue({ resource: { id: 'post-1', authorId: 'author-1', status: 'blocked' } });
  postsReplace.mockResolvedValue({});
  moderationDecisionsCreate.mockResolvedValue({ resource: { id: 'decision-1' } });
  usersService.getUserById.mockResolvedValue({ reputation_score: 500 });
}

function request(body: Record<string, unknown>, appealId = 'appeal-1') {
  return httpReqMock({
    method: 'POST',
    params: { appealId },
    headers: { authorization: 'Bearer valid-token' },
    body,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  contextStub.log = jest.fn();
  contextStub.error = jest.fn();
  verifyMock.mockImplementation(async header => {
    if (!header) {
      throw new AuthError('invalid_request', 'Authorization header missing');
    }
    return { sub: 'moderator-1', roles: ['moderator'], raw: { roles: ['moderator'] } } as any;
  });
});

describe('VoteOnAppeal integration', () => {
  it('records a community vote and resolves the appeal through the route', async () => {
    setupCosmos({ appeal: createAppeal({ requiredVotes: 2 }) });

    const response = await voteOnAppealRoute(
      request({ vote: 'approve', reason: 'The blocked content was clearly mistaken', confidence: 8 }),
      contextStub
    );

    expect(response.status).toBe(200);
    expect((response.jsonBody as any).currentTally.hasReachedQuorum).toBe(true);
    expect(votesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        appealId: 'appeal-1',
        voterId: 'moderator-1',
      })
    );
    expect(moderationDecisionsCreate).toHaveBeenCalled();
    expect(appendReceiptEvent).toHaveBeenCalled();
    expect(enqueueUserNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'submitter-1',
        eventType: expect.any(String),
      })
    );
  });

  it('returns 409 when the same user tries to vote twice through the route', async () => {
    setupCosmos({ existingVotes: [{ id: 'vote-1', voterId: 'moderator-1', vote: 'approve' }] });

    const response = await voteOnAppealRoute(
      request({ vote: 'reject', reason: 'Another sufficiently long reason' }),
      contextStub
    );

    expect(response.status).toBe(409);
    expect((response.jsonBody as any).error).toBe('You have already voted on this appeal');
    expect(votesCreate).not.toHaveBeenCalled();
  });
});
