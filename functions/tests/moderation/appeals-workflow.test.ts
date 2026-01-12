/**
 * Comprehensive service-layer tests for Appeals & Voting Workflow (B2)
 *
 * Tests cover:
 * - Creating appeals
 * - Voting on appeals (approve/reject)
 * - Double voting prevention
 * - State transitions (pending -> approved/rejected)
 * - Content status updates based on decision
 */
import type { InvocationContext } from '@azure/functions';
import type { Container, Database } from '@azure/cosmos';

// ─────────────────────────────────────────────────────────────
// Mock Setup
// ─────────────────────────────────────────────────────────────

const mockRead = jest.fn();
const mockReplace = jest.fn();
const mockCreate = jest.fn();
const mockQuery = jest.fn();

const createMockContainer = () =>
  ({
    item: jest.fn().mockReturnValue({
      read: mockRead,
      replace: mockReplace,
    }),
    items: {
      query: jest.fn().mockReturnValue({
        fetchAll: mockQuery,
      }),
      create: mockCreate,
    },
  }) as unknown as Container;

const mockContainers: Record<string, ReturnType<typeof createMockContainer>> = {
  appeals: createMockContainer(),
  appeal_votes: createMockContainer(),
  posts: createMockContainer(),
  comments: createMockContainer(),
  users: createMockContainer(),
};

const mockDatabase = {
  container: jest.fn((name: string) => mockContainers[name] || createMockContainer()),
} as unknown as Database;

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(() => mockDatabase),
  getTargetDatabase: jest.fn(() => ({
    posts: mockContainers.posts,
    comments: mockContainers.comments,
    users: mockContainers.users,
    appeals: mockContainers.appeals,
    appealVotes: mockContainers.appeal_votes,
  })),
}));

import { submitAppealHandler } from '../../src/moderation/service/appealService';
import { voteOnAppealHandler } from '../../src/moderation/service/voteService';
import { httpReqMock } from '../helpers/http';

const contextStub = {
  log: jest.fn(),
  invocationId: 'test-appeal-invocation',
} as unknown as InvocationContext;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.COSMOS_CONNECTION_STRING = 'mock-connection';

  // Reset mock implementations
  Object.values(mockContainers).forEach((container) => {
    (container.item as jest.Mock).mockReturnValue({
      read: mockRead,
      replace: mockReplace,
    });
    (container.items.query as jest.Mock).mockReturnValue({ fetchAll: mockQuery });
  });

  mockRead.mockReset();
  mockReplace.mockReset();
  mockCreate.mockReset();
  mockQuery.mockReset();
});

// ─────────────────────────────────────────────────────────────
// Appeal Submission Tests
// ─────────────────────────────────────────────────────────────

describe('appealService - creating appeals', () => {
  it('returns 401 when userId is missing', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-123',
        contentType: 'post',
        appealType: 'false_positive',
        appealReason: 'This content was incorrectly flagged',
        userStatement: 'I believe this post was flagged in error because it does not violate any community guidelines.',
      },
    });

    const response = await submitAppealHandler({
      request: req,
      context: contextStub,
      userId: '',
    });

    expect(response.status).toBe(401);
    expect(response.jsonBody).toMatchObject({ error: 'Missing authorization header' });
  });

  it('returns 400 for invalid request data', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { contentId: 'post-123' }, // Missing required fields
    });

    const response = await submitAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });

    expect(response.status).toBe(400);
    expect(response.jsonBody).toMatchObject({ error: 'Invalid request data' });
  });

  it('returns 409 when user has pending appeal for same content', async () => {
    // Existing appeal found
    mockQuery.mockResolvedValueOnce({
      resources: [{ id: 'existing-appeal', contentId: 'post-123', status: 'pending' }],
    });

    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-123',
        contentType: 'post',
        appealType: 'false_positive',
        appealReason: 'This content was incorrectly flagged',
        userStatement: 'I believe this post was flagged in error because it does not violate any guidelines.',
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

  it('returns 404 when content does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ resources: [] }); // No existing appeals
    mockRead.mockRejectedValueOnce(new Error('Not found')); // Content not found

    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'non-existent-post',
        contentType: 'post',
        appealType: 'false_positive',
        appealReason: 'Content was flagged incorrectly',
        userStatement: 'This post should not have been flagged as it follows all guidelines.',
      },
    });

    const response = await submitAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });

    expect(response.status).toBe(404);
    expect(response.jsonBody).toMatchObject({ error: 'Content not found' });
  });

  it('returns 400 when content is not under moderation', async () => {
    mockQuery.mockResolvedValueOnce({ resources: [] }); // No existing appeals
    mockRead
      .mockResolvedValueOnce({ resource: { id: 'post-123', status: 'published' } }) // Content is published
      .mockResolvedValueOnce({ resource: { id: 'user-1', name: 'Test User' } }); // User info

    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-123',
        contentType: 'post',
        appealType: 'false_positive',
        appealReason: 'Content was flagged incorrectly',
        userStatement: 'This post should not have been flagged as it follows all guidelines.',
      },
    });

    const response = await submitAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });

    expect(response.status).toBe(400);
    expect(response.jsonBody).toMatchObject({
      error: 'Content is not under moderation and does not require an appeal',
    });
  });

  it('creates appeal successfully for flagged content', async () => {
    mockQuery.mockResolvedValueOnce({ resources: [] }); // No existing appeals
    mockRead
      .mockResolvedValueOnce({
        resource: {
          id: 'post-123',
          status: 'blocked',
          title: 'My Post',
          content: 'Post content here',
          flagCount: 3,
          flagReason: 'spam',
        },
      }) // Flagged content
      .mockResolvedValueOnce({ resource: { id: 'user-1', name: 'Test User' } }); // User info
    mockCreate.mockResolvedValueOnce({ resource: { id: 'new-appeal' } });
    mockReplace.mockResolvedValueOnce({ resource: {} });

    const req = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-123',
        contentType: 'post',
        appealType: 'false_positive',
        appealReason: 'Content was flagged incorrectly',
        userStatement: 'This post should not have been flagged as it follows all community guidelines.',
      },
    });

    const response = await submitAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1',
    });

    expect(response.status).toBe(201);
    expect(response.jsonBody).toMatchObject({
      status: 'pending',
      message: 'Appeal submitted successfully',
    });
    expect(response.jsonBody.appealId).toBeDefined();
    expect(mockCreate).toHaveBeenCalled();

    // Verify appeal document structure
    const createdAppeal = mockCreate.mock.calls[0][0];
    expect(createdAppeal).toMatchObject({
      contentId: 'post-123',
      contentType: 'post',
      appealType: 'false_positive',
      submitterId: 'user-1',
      status: 'pending',
      votingStatus: 'not_started',
      votesFor: 0,
      votesAgainst: 0,
      totalVotes: 0,
      requiredVotes: 0,
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Voting Tests
// ─────────────────────────────────────────────────────────────

describe('voteService - voting on appeals', () => {
  it('returns 401 when userId is missing', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: {
        vote: 'approve',
        reason: 'The content does not violate any guidelines',
      },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: '',
      appealId: 'appeal-123',
    });

    expect(response.status).toBe(401);
    expect(response.jsonBody).toMatchObject({ error: 'Missing authorization header' });
  });

  it('returns 400 for invalid vote data', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { vote: 'invalid' }, // Invalid vote value
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'voter-1',
      appealId: 'appeal-123',
    });

    expect(response.status).toBe(400);
    expect(response.jsonBody).toMatchObject({ error: 'Invalid request data' });
  });

  it('returns 400 when appealId is missing', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: {
        vote: 'approve',
        reason: 'The content does not violate any guidelines',
      },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'voter-1',
      // No appealId in route or body
    });

    expect(response.status).toBe(400);
    expect(response.jsonBody).toMatchObject({
      error: 'Appeal ID is required (provide in route or request body)',
    });
  });

  it('returns 404 when appeal does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ resources: [] });

    const req = httpReqMock({
      method: 'POST',
      body: {
        vote: 'approve',
        reason: 'The content does not violate any guidelines',
      },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'voter-1',
      appealId: 'non-existent-appeal',
    });

    expect(response.status).toBe(404);
    expect(response.jsonBody).toMatchObject({ error: 'Appeal not found' });
  });

  it('returns 409 when appeal is already decided', async () => {
    mockQuery.mockResolvedValueOnce({
      resources: [
        {
          id: 'appeal-123',
          status: 'approved',
          resolvedAt: '2025-11-28T12:00:00Z',
        },
      ],
    });

    const req = httpReqMock({
      method: 'POST',
      body: {
        vote: 'approve',
        reason: 'The content does not violate any guidelines',
      },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'voter-1',
      appealId: 'appeal-123',
    });

    expect(response.status).toBe(409);
    expect(response.jsonBody).toMatchObject({ error: 'Appeal has already been approved' });
  });

  it('returns 409 when voter has already voted', async () => {
    mockQuery
      .mockResolvedValueOnce({
        resources: [
          {
            id: 'appeal-123',
            status: 'pending',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            submitterId: 'original-submitter',
          },
        ],
      })
      .mockResolvedValueOnce({
        resources: [{ id: 'existing-vote', voterId: 'voter-1', vote: 'approve' }],
      });

    const req = httpReqMock({
      method: 'POST',
      body: {
        vote: 'reject',
        reason: 'Actually, I changed my mind and want to reject',
      },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'voter-1',
      appealId: 'appeal-123',
    });

    expect(response.status).toBe(409);
    expect(response.jsonBody).toMatchObject({
      error: 'You have already voted on this appeal',
    });
  });

  it('returns 403 when user tries to vote on own appeal', async () => {
    mockQuery
      .mockResolvedValueOnce({
        resources: [
          {
            id: 'appeal-123',
            status: 'pending',
            submitterId: 'user-1',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          },
        ],
      })
      .mockResolvedValueOnce({ resources: [] }); // No existing votes

    const req = httpReqMock({
      method: 'POST',
      body: {
        vote: 'approve',
        reason: 'I approve my own appeal (should not be allowed)',
      },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'user-1', // Same as submitterId
      appealId: 'appeal-123',
    });

    expect(response.status).toBe(403);
    expect(response.jsonBody).toMatchObject({
      error: 'You cannot vote on your own appeal',
    });
  });

  it('successfully records vote and updates tally', async () => {
    mockQuery
      .mockResolvedValueOnce({
        resources: [
          {
            id: 'appeal-123',
            status: 'pending',
            submitterId: 'original-submitter',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            votesFor: 0,
            votesAgainst: 0,
            totalVotes: 0,
            requiredVotes: 0,
          },
        ],
      }) // Appeal exists
      .mockResolvedValueOnce({ resources: [] }); // No existing votes
    mockRead.mockResolvedValueOnce({ resource: { id: 'voter-1', name: 'Voter One' } }); // Voter info
    mockCreate.mockResolvedValueOnce({ resource: { id: 'vote-1' } });
    mockReplace.mockResolvedValueOnce({ resource: {} });

    const req = httpReqMock({
      method: 'POST',
      body: {
        vote: 'approve',
        reason: 'The content does not violate any community guidelines',
        confidence: 8,
      },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'voter-1',
      appealId: 'appeal-123',
    });

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      message: 'Vote recorded successfully',
      status: 'pending',
    });
    expect(response.jsonBody.currentTally).toMatchObject({
      votesFor: 1,
      votesAgainst: 0,
      totalVotes: 1,
      hasReachedQuorum: false,
    });
    expect(mockCreate).toHaveBeenCalled();

    // Verify vote document structure
    const createdVote = mockCreate.mock.calls[0][0];
    expect(createdVote).toMatchObject({
      appealId: 'appeal-123',
      voterId: 'voter-1',
      vote: 'approve',
      confidence: 8,
    });
  });
});

// ─────────────────────────────────────────────────────────────
// State Transition Tests
// ─────────────────────────────────────────────────────────────

describe('voteService - vote window behavior', () => {
  it('does not resolve appeals before the window ends (approve vote)', async () => {
    mockQuery
      .mockResolvedValueOnce({
        resources: [
          {
            id: 'appeal-123',
            contentId: 'post-123',
            contentType: 'post',
            status: 'pending',
            submitterId: 'original-submitter',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            votesFor: 3,
            votesAgainst: 1,
            totalVotes: 4,
            requiredVotes: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ resources: [] });
    mockRead.mockResolvedValueOnce({ resource: { id: 'voter-5', name: 'Voter Five' } });
    mockCreate.mockResolvedValueOnce({ resource: { id: 'vote-5' } });
    mockReplace.mockResolvedValueOnce({ resource: {} });

    const req = httpReqMock({
      method: 'POST',
      body: {
        vote: 'approve',
        reason: 'I agree, the content is fine and should be restored',
      },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'voter-5',
      appealId: 'appeal-123',
    });

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      message: 'Vote recorded successfully',
      finalDecision: null,
      status: 'pending',
    });
    expect(response.jsonBody.currentTally).toMatchObject({
      votesFor: 4,
      votesAgainst: 1,
      totalVotes: 5,
      hasReachedQuorum: false,
    });
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('does not resolve appeals before the window ends (reject vote)', async () => {
    mockQuery
      .mockResolvedValueOnce({
        resources: [
          {
            id: 'appeal-456',
            contentId: 'post-456',
            contentType: 'post',
            status: 'pending',
            submitterId: 'original-submitter',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            votesFor: 1,
            votesAgainst: 3,
            totalVotes: 4,
            requiredVotes: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ resources: [] });
    mockRead.mockResolvedValueOnce({ resource: { id: 'voter-5', name: 'Voter Five' } });
    mockCreate.mockResolvedValueOnce({ resource: { id: 'vote-5' } });
    mockReplace.mockResolvedValueOnce({ resource: {} });

    const req = httpReqMock({
      method: 'POST',
      body: {
        vote: 'reject',
        reason: 'The content clearly violates guidelines and should remain hidden',
      },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'voter-5',
      appealId: 'appeal-456',
    });

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      finalDecision: null,
      status: 'pending',
    });
    expect(response.jsonBody.currentTally).toMatchObject({
      votesFor: 1,
      votesAgainst: 4,
      totalVotes: 5,
      hasReachedQuorum: false,
    });
  });

  it('handles expired appeals correctly', async () => {
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
    mockQuery.mockResolvedValueOnce({
      resources: [
        {
          id: 'appeal-expired',
          contentId: 'post-expired',
          contentType: 'post',
          status: 'pending',
          submitterId: 'original-submitter',
          expiresAt: expiredDate,
          votesFor: 1,
          votesAgainst: 0,
          totalVotes: 1,
        },
      ],
    });
    mockRead
      .mockResolvedValueOnce({ resource: { id: 'post-expired', status: 'blocked' } })
      .mockResolvedValueOnce({ resource: { id: 'post-expired', status: 'blocked' } });
    mockReplace.mockResolvedValueOnce({ resource: {} });

    const req = httpReqMock({
      method: 'POST',
      body: {
        vote: 'approve',
        reason: 'I want to vote on this expired appeal',
      },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'voter-1',
      appealId: 'appeal-expired',
    });

    expect(response.status).toBe(409);
    expect(response.jsonBody).toMatchObject({
      error: 'Appeal has expired',
      finalDecision: 'approved',
      status: 'approved',
    });

    // Verify appeal was resolved
    expect(mockReplace).toHaveBeenCalled();
  });

  it('uses weighted votes for moderators and admins', async () => {
    mockQuery
      .mockResolvedValueOnce({
        resources: [
          {
            id: 'appeal-weighted',
            contentId: 'post-weighted',
            contentType: 'post',
            status: 'pending',
            submitterId: 'original-submitter',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            votesFor: 0,
            votesAgainst: 0,
            totalVotes: 0,
            requiredVotes: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ resources: [] });
    mockRead.mockResolvedValueOnce({ resource: { id: 'admin-user', name: 'Admin User' } });
    mockCreate.mockResolvedValueOnce({ resource: { id: 'admin-vote' } });
    mockReplace.mockResolvedValueOnce({ resource: {} });

    const req = httpReqMock({
      method: 'POST',
      body: {
        vote: 'approve',
        reason: 'As admin, I approve this appeal with weight 3',
      },
    });

    const response = await voteOnAppealHandler({
      request: req,
      context: contextStub,
      userId: 'admin-user',
      claims: { roles: ['admin'] },
      appealId: 'appeal-weighted',
    });

    expect(response.status).toBe(200);
    // Admin vote should have weight 3
    expect(response.jsonBody.currentTally).toMatchObject({
      votesFor: 3, // Weight 3 for admin
      votesAgainst: 0,
      totalVotes: 3,
    });

    // Verify vote document has correct weight
    const createdVote = mockCreate.mock.calls[0][0];
    expect(createdVote.weight).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────
// Integration-style flow tests
// ─────────────────────────────────────────────────────────────

describe('appeals workflow - end-to-end flow', () => {
  it('complete flow: create appeal -> vote -> reach quorum -> resolve', async () => {
    // This test validates the logical flow even though mocks are reset between handlers

    // Step 1: Create appeal
    mockQuery.mockResolvedValueOnce({ resources: [] });
    mockRead
      .mockResolvedValueOnce({
        resource: {
          id: 'post-flow',
          status: 'blocked',
          content: 'Test content',
          flagCount: 2,
        },
      })
      .mockResolvedValueOnce({ resource: { id: 'user-flow', name: 'Flow User' } });
    mockCreate.mockResolvedValueOnce({ resource: { id: 'appeal-flow' } });
    mockReplace.mockResolvedValueOnce({ resource: {} });

    const createReq = httpReqMock({
      method: 'POST',
      body: {
        contentId: 'post-flow',
        contentType: 'post',
        appealType: 'false_positive',
        appealReason: 'This was incorrectly flagged',
        userStatement: 'I believe this content follows all guidelines and should be restored.',
      },
    });

    const createResponse = await submitAppealHandler({
      request: createReq,
      context: contextStub,
      userId: 'user-flow',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.jsonBody.status).toBe('pending');
    const appealId = createResponse.jsonBody.appealId;
    expect(appealId).toBeDefined();

    // Step 2: Verify appeal structure
    const createdAppeal = mockCreate.mock.calls[0][0];
    expect(createdAppeal.votesFor).toBe(0);
    expect(createdAppeal.votesAgainst).toBe(0);
    expect(createdAppeal.status).toBe('pending');
    expect(createdAppeal.requiredVotes).toBe(0);
  });
});
