/**
 * Integration test to verify the rolling 1-hour rate limit for voteOnAppeal
 * This test validates that the 21st vote within 60 minutes returns HTTP 429
 * and the 21st vote after 60 minutes returns HTTP 200
 */

import { voteOnAppeal } from '../moderation/voteOnAppeal';
import { VOTING_CONFIG } from '../shared/moderationUtils';

// Mock the dependencies
jest.mock('../shared/auth');
jest.mock('../shared/cosmosClient');

const mockGetUserContext = require('../shared/auth').getUserContext;
const mockGetContainer = require('../shared/cosmosClient').getContainer;

describe('VoteOnAppeal Rate Limiting Integration', () => {
  let mockVotesContainer: any;
  let mockUserContainer: any;
  let mockAppealsContainer: any;
  let mockModerationLogsContainer: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock user context
    mockGetUserContext.mockReturnValue({
      userId: 'test-user-123',
      email: 'test@example.com',
      role: 'user',
      tier: 'free',
    });

    // Mock containers
    mockVotesContainer = {
      items: {
        query: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
      },
    };

    mockUserContainer = {
      item: jest.fn().mockReturnValue({
        read: jest.fn().mockResolvedValue({
          resource: {
            id: 'test-user-123',
            email: 'test@example.com',
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
            reputationScore: 50,
          },
        }),
      }),
    };

    mockAppealsContainer = {
      item: jest.fn().mockReturnValue({
        read: jest.fn().mockResolvedValue({
          resource: {
            id: 'test-appeal-123',
            contentId: 'test-post-123',
            contentType: 'post',
            contentOwnerId: 'other-user-456',
            status: 'pending',
            reviewQueue: 'community',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
        patch: jest.fn().mockResolvedValue({}),
      }),
    };

    mockModerationLogsContainer = {
      items: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    mockGetContainer.mockImplementation((containerName: string) => {
      switch (containerName) {
        case 'votes':
          return mockVotesContainer;
        case 'users':
          return mockUserContainer;
        case 'appeals':
          return mockAppealsContainer;
        case 'moderationLogs':
          return mockModerationLogsContainer;
        default:
          throw new Error(`Unknown container: ${containerName}`);
      }
    });
  });

  it('should return HTTP 429 for 21st vote within 60 minutes', async () => {
    // Create exactly 20 votes within the last hour
    const now = new Date();
    const recentVotes = Array.from({ length: 20 }, (_, i) => ({
      id: `vote-${i}`,
      userId: 'test-user-123',
      appealId: 'some-other-appeal',
      vote: 'approve',
      timestamp: new Date(now.getTime() - (i + 1) * 60 * 1000).toISOString(), // 1-20 minutes ago
    }));

    // Mock the rate limit query to return 20 votes
    mockVotesContainer.items.query.mockReturnValueOnce({
      fetchAll: jest.fn().mockResolvedValue({ resources: recentVotes }),
    });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        appealId: 'test-appeal-123',
        vote: 'approve',
        reason: 'This content should not be moderated',
      }),
      headers: {
        get: jest.fn().mockReturnValue('test-user-agent'),
      },
    };

    const mockContext = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const response = await voteOnAppeal(mockRequest as any, mockContext as any);

    // Should return HTTP 429 (Too Many Requests)
    expect(response.status).toBe(429);
    expect(response.jsonBody).toMatchObject({
      error: 'Vote rate limit exceeded',
      votesInLastHour: 20,
      maxPerHour: VOTING_CONFIG.MAX_VOTES_PER_HOUR,
      resetTime: expect.any(String),
    });

    // Verify reset time is approximately 1 hour from now
    const resetTime = new Date(response.jsonBody.resetTime);
    const expectedResetTime = new Date(now.getTime() + 3600 * 1000);
    const timeDiff = Math.abs(resetTime.getTime() - expectedResetTime.getTime());
    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds tolerance
  });

  it('should return HTTP 200 for 21st vote after 60 minutes', async () => {
    // Create 20 votes where the oldest is just over 1 hour ago
    const now = new Date();
    const oldVotes = [
      // This vote is outside the 1-hour window (61 minutes ago)
      {
        id: 'old-vote',
        userId: 'test-user-123',
        appealId: 'some-old-appeal',
        vote: 'reject',
        timestamp: new Date(now.getTime() - 61 * 60 * 1000).toISOString(),
      },
    ];

    const recentVotes = Array.from({ length: 19 }, (_, i) => ({
      id: `vote-${i}`,
      userId: 'test-user-123',
      appealId: 'some-other-appeal',
      vote: 'approve',
      timestamp: new Date(now.getTime() - (i + 2) * 60 * 1000).toISOString(), // 2-20 minutes ago
    }));

    // The rate limit query should only return votes from the last hour (19 votes)
    mockVotesContainer.items.query
      .mockReturnValueOnce({
        fetchAll: jest.fn().mockResolvedValue({ resources: recentVotes }),
      })
      // Mock duplicate vote check - no duplicate
      .mockReturnValueOnce({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      })
      // Mock all votes for this appeal (for quorum check)
      .mockReturnValueOnce({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [
            { id: 'vote1', vote: 'approve' },
            { id: 'vote2', vote: 'reject' },
          ],
        }),
      });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        appealId: 'test-appeal-123',
        vote: 'approve',
        reason: 'This content should not be moderated',
      }),
      headers: {
        get: jest.fn().mockReturnValue('test-user-agent'),
      },
    };

    const mockContext = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const response = await voteOnAppeal(mockRequest as any, mockContext as any);

    // Should return HTTP 201 (Created) - vote accepted
    expect(response.status).toBe(201);
    expect(response.jsonBody).toMatchObject({
      success: true,
      voteId: expect.any(String),
      appeal: {
        id: 'test-appeal-123',
        contentId: 'test-post-123',
        status: expect.any(String),
      },
      voting: {
        userVote: 'approve',
        totalVotes: expect.any(Number),
        approveVotes: expect.any(Number),
        rejectVotes: expect.any(Number),
      },
      rateLimitInfo: {
        votesInLastHour: 20, // 19 existing + 1 new vote
        maxPerHour: VOTING_CONFIG.MAX_VOTES_PER_HOUR,
        resetTime: expect.any(String),
      },
    });

    // Verify the vote was created
    expect(mockVotesContainer.items.create).toHaveBeenCalledWith(
      expect.objectContaining({
        appealId: 'test-appeal-123',
        userId: 'test-user-123',
        vote: 'approve',
      })
    );
  });

  it('should use proper time calculations for rolling window', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Create a vote exactly at the 1-hour boundary
    const boundaryVote = {
      id: 'boundary-vote',
      userId: 'test-user-123',
      appealId: 'boundary-appeal',
      vote: 'approve',
      timestamp: oneHourAgo.toISOString(),
    };

    // Mock the query to simulate Cosmos DB time filtering
    mockVotesContainer.items.query
      .mockReturnValueOnce({
        fetchAll: jest.fn().mockImplementation(() => {
          // Simulate the actual query filter: timestamp > oneHourAgo
          const votes = [boundaryVote].filter(vote => new Date(vote.timestamp) > oneHourAgo);
          return Promise.resolve({ resources: votes });
        }),
      })
      // Mock duplicate vote check
      .mockReturnValueOnce({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      })
      // Mock all votes for appeal
      .mockReturnValueOnce({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        appealId: 'test-appeal-123',
        vote: 'approve',
      }),
      headers: {
        get: jest.fn().mockReturnValue('test-user-agent'),
      },
    };

    const mockContext = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const response = await voteOnAppeal(mockRequest as any, mockContext as any);

    // Should succeed because the boundary vote doesn't count (not strictly greater than oneHourAgo)
    expect(response.status).toBe(201);

    // Verify the query was called with the correct time parameter (first call is rate limit check)
    const rateLimitCall = mockVotesContainer.items.query.mock.calls[0][0];
    expect(rateLimitCall.query).toBe(
      'SELECT * FROM c WHERE c.userId = @userId AND c.timestamp > @oneHourAgo'
    );
    expect(rateLimitCall.parameters).toEqual([
      { name: '@userId', value: 'test-user-123' },
      {
        name: '@oneHourAgo',
        value: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
      },
    ]);

    // Verify the timestamp is approximately 1 hour ago
    const actualOneHourAgo = new Date(rateLimitCall.parameters[1].value);
    const expectedOneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const timeDiff = Math.abs(actualOneHourAgo.getTime() - expectedOneHourAgo.getTime());
    expect(timeDiff).toBeLessThan(100); // Within 100ms tolerance
  });
});
