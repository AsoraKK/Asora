/**
 * Test suite for reviewAppealedContent server-side filtering
 * Tests that user's own appeals are filtered out at the database level
 */

import { reviewAppealedContent } from '../moderation/reviewAppealedContent';
import { getUserContext } from '../shared/auth';
import { getContainer } from '../shared/cosmosClient';

// Mock dependencies
jest.mock('../shared/auth');
jest.mock('../shared/cosmosClient');

const mockGetUserContext = getUserContext as jest.MockedFunction<typeof getUserContext>;
const mockGetContainer = getContainer as jest.MockedFunction<typeof getContainer>;

describe('ReviewAppealedContent Server-Side Filtering', () => {
  let mockAppealsContainer: any;
  let mockUserContainer: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetUserContext.mockReturnValue({
      userId: 'test-user-123',
      email: 'test@example.com',
      role: 'user',
      tier: 'free',
    });

    // Mock user container
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

    // Mock appeals container
    mockAppealsContainer = {
      items: {
        query: jest.fn().mockReturnValue({
          fetchAll: jest.fn(),
        }),
      },
    };

    mockGetContainer.mockImplementation((containerName: string) => {
      switch (containerName) {
        case 'users':
          return mockUserContainer;
        case 'appeals':
          return mockAppealsContainer;
        default:
          throw new Error(`Unknown container: ${containerName}`);
      }
    });
  });

  describe('Server-side filtering of own appeals', () => {
    it('should include contentOwnerId != @userId in Cosmos DB query', async () => {
      // Mock empty results to avoid complex content lookup
      mockAppealsContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      });

      const mockRequest = {
        url: 'https://example.com/api/moderation/appeals/review',
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
      };

      const mockContext = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      await reviewAppealedContent(mockRequest as any, mockContext as any);

      // Verify the query was called with the correct filter
      expect(mockAppealsContainer.items.query).toHaveBeenCalledWith({
        query: expect.stringContaining('AND c.contentOwnerId != @userId'),
        parameters: expect.arrayContaining([
          { name: '@userId', value: 'test-user-123' },
          { name: '@now', value: expect.any(String) },
        ]),
      });
    });

    it('should return zero items when contentOwnerId equals caller userId', async () => {
      // Mock query to simulate Cosmos DB filtering behavior
      const mockAppeal = {
        id: 'appeal-123',
        contentId: 'post-123',
        contentType: 'post',
        contentOwnerId: 'test-user-123', // Same as caller - should be filtered out by query
        reviewQueue: 'community',
        status: 'pending',
        reason: 'Test appeal',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      // Simulate Cosmos DB query filtering - should return empty because of contentOwnerId != @userId
      mockAppealsContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockImplementation(() => {
          // Simulate the actual Cosmos DB filter logic
          const allAppeals = [mockAppeal];
          const filteredAppeals = allAppeals.filter(
            appeal => appeal.contentOwnerId !== 'test-user-123' // This is what the query does
          );
          return Promise.resolve({ resources: filteredAppeals });
        }),
      });

      const mockRequest = {
        url: 'https://example.com/api/moderation/appeals/review',
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
      };

      const mockContext = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const response = await reviewAppealedContent(mockRequest as any, mockContext as any);

      // Should return success but with empty appeals array
      expect(response.status).toBe(200);
      expect(response.jsonBody.data.appeals).toHaveLength(0);
      expect(response.jsonBody.data.summary.totalActive).toBe(0);
    });

    it('should return appeals where contentOwnerId != caller userId', async () => {
      // Mock appeals with different content owners
      const mockAppeals = [
        {
          id: 'appeal-other-1',
          contentId: 'post-456',
          contentType: 'post',
          contentOwnerId: 'other-user-456', // Different from caller - should be included
          reviewQueue: 'community',
          status: 'pending',
          reason: 'Appeal from other user',
          explanation: 'This content should not be moderated',
          requestedAction: 'restore',
          createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
          expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
          metadata: {},
        },
        {
          id: 'appeal-other-2',
          contentId: 'comment-789',
          contentType: 'comment',
          contentOwnerId: 'another-user-789', // Different from caller - should be included
          reviewQueue: 'community',
          status: 'pending',
          reason: 'Appeal from another user',
          explanation: 'This was unfairly flagged',
          requestedAction: 'restore',
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          expiresAt: new Date(Date.now() + 23.5 * 60 * 60 * 1000).toISOString(),
          metadata: {},
        },
      ];

      // Simulate server-side filtering - only return appeals not owned by current user
      mockAppealsContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockImplementation(() => {
          const filteredAppeals = mockAppeals.filter(
            appeal => appeal.contentOwnerId !== 'test-user-123'
          );
          return Promise.resolve({ resources: filteredAppeals });
        }),
      });

      // Mock content containers
      const mockContentContainer = {
        item: jest.fn().mockReturnValue({
          read: jest.fn().mockResolvedValue({
            resource: {
              id: 'content-id',
              text: 'Sample content text',
              createdAt: new Date().toISOString(),
              flagCount: 2,
            },
          }),
        }),
      };

      const mockVotesContainer = {
        items: {
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: [] }), // No votes
          }),
        },
      };

      mockGetContainer.mockImplementation((containerName: string) => {
        switch (containerName) {
          case 'users':
            return mockUserContainer;
          case 'appeals':
            return mockAppealsContainer;
          case 'posts':
            return mockContentContainer;
          case 'comments':
            return mockContentContainer;
          case 'votes':
            return mockVotesContainer;
          default:
            throw new Error(`Unknown container: ${containerName}`);
        }
      });

      const mockRequest = {
        url: 'https://example.com/api/moderation/appeals/review',
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
      };

      const mockContext = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const response = await reviewAppealedContent(mockRequest as any, mockContext as any);

      // Should return success with appeals from other users
      expect(response.status).toBe(200);
      expect(response.jsonBody.data.appeals).toHaveLength(2);
      expect(response.jsonBody.data.appeals[0].appealId).toBe('appeal-other-1');
      expect(response.jsonBody.data.appeals[1].appealId).toBe('appeal-other-2');

      // Verify none of the returned appeals belong to the current user
      response.jsonBody.data.appeals.forEach((appeal: any) => {
        expect(appeal.content.authorId).not.toBe('test-user-123');
      });
    });

    it('should verify query contains proper parameters', async () => {
      mockAppealsContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      });

      const mockRequest = {
        url: 'https://example.com/api/moderation/appeals/review?timeRemaining=expiring',
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
      };

      const mockContext = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      await reviewAppealedContent(mockRequest as any, mockContext as any);

      // Verify the query structure
      const queryCall = mockAppealsContainer.items.query.mock.calls[0][0];

      expect(queryCall.query).toContain('WHERE c.reviewQueue = "community"');
      expect(queryCall.query).toContain('AND c.status = "pending"');
      expect(queryCall.query).toContain('AND c.expiresAt > @now');
      expect(queryCall.query).toContain('AND c.contentOwnerId != @userId');
      expect(queryCall.query).toContain('ORDER BY c.createdAt DESC');

      // Verify required parameters are present
      const paramNames = queryCall.parameters.map((p: any) => p.name);
      expect(paramNames).toContain('@now');
      expect(paramNames).toContain('@userId');

      // Find userId parameter and verify it's correct
      const userIdParam = queryCall.parameters.find((p: any) => p.name === '@userId');
      expect(userIdParam.value).toBe('test-user-123');
    });
  });
});
