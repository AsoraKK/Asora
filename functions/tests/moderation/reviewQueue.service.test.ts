/**
 * Integration tests for reviewQueueService
 * Tests sorting, pagination, filtering and response shape
 */
import type { InvocationContext } from '@azure/functions';

// Create mock functions before mocking the module
const mockFetchNext = jest.fn();
const mockQuery = jest.fn(() => ({ fetchNext: mockFetchNext }));

// Mock cosmos client
jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(() => ({
    container: (name: string) => ({
      items: {
        query: mockQuery,
      },
    }),
  })),
}));

import { getReviewQueueHandler } from '@moderation/service/reviewQueueService';

const contextStub = { log: jest.fn() } as unknown as InvocationContext;

describe('reviewQueueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchNext.mockReset();
    mockQuery.mockClear();
  });

  describe('sorting', () => {
    it('sorts items by createdAt most recent first', async () => {
      // Setup: flags return older and newer items, appeals return mid-range
      let callCount = 0;
      mockFetchNext.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call is flags
          return Promise.resolve({
            resources: [
              { id: 'f1', contentId: 'c1', contentType: 'post', reason: 'spam', createdAt: '2025-11-29T08:00:00Z', priorityScore: 5 },
              { id: 'f2', contentId: 'c2', contentType: 'post', reason: 'harassment', createdAt: '2025-11-29T10:00:00Z', priorityScore: 8 },
            ],
            continuationToken: undefined,
          });
        } else {
          // Second call is appeals
          return Promise.resolve({
            resources: [
              { id: 'a1', contentId: 'c3', contentType: 'comment', status: 'pending', appealType: 'false_positive', urgencyScore: 7, createdAt: '2025-11-29T09:00:00Z', flagCount: 2 },
            ],
            continuationToken: undefined,
          });
        }
      });

      const response = await getReviewQueueHandler({
        context: contextStub,
        limit: 20,
      });

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body.items).toHaveLength(3);

      // Check sorted by createdAt descending (10:00 > 09:00 > 08:00)
      const dates = body.items.map((item: any) => new Date(item.createdAt).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }

      // Verify order: c2 (10:00), c3 (09:00), c1 (08:00)
      expect(body.items[0].contentId).toBe('c2');
      expect(body.items[1].contentId).toBe('c3');
      expect(body.items[2].contentId).toBe('c1');
    });
  });

  describe('pagination', () => {
    it('respects limit parameter', async () => {
      let callCount = 0;
      mockFetchNext.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            resources: [
              { id: 'f1', contentId: 'c1', contentType: 'post', reason: 'spam', createdAt: '2025-11-29T10:00:00Z', priorityScore: 5 },
              { id: 'f2', contentId: 'c2', contentType: 'post', reason: 'harassment', createdAt: '2025-11-29T09:00:00Z', priorityScore: 8 },
              { id: 'f3', contentId: 'c3', contentType: 'post', reason: 'violence', createdAt: '2025-11-29T08:00:00Z', priorityScore: 10 },
            ],
            continuationToken: 'more-flags',
          });
        } else {
          return Promise.resolve({
            resources: [],
            continuationToken: undefined,
          });
        }
      });

      const response = await getReviewQueueHandler({
        context: contextStub,
        limit: 2,
      });

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body.items.length).toBeLessThanOrEqual(2);
      expect(body.hasMore).toBe(true);
    });

    it('clamps limit to MAX_PAGE_SIZE', async () => {
      mockFetchNext.mockResolvedValue({
        resources: [],
        continuationToken: undefined,
      });

      // Should not error with very large limit
      const response = await getReviewQueueHandler({
        context: contextStub,
        limit: 9999,
      });

      expect(response.status).toBe(200);
    });

    it('returns hasMore: false when no more data', async () => {
      mockFetchNext.mockResolvedValue({
        resources: [
          { id: 'f1', contentId: 'c1', contentType: 'post', reason: 'spam', createdAt: '2025-11-29T10:00:00Z', priorityScore: 5 },
        ],
        continuationToken: undefined,
      });

      const response = await getReviewQueueHandler({
        context: contextStub,
        limit: 20,
      });

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body.hasMore).toBe(false);
      expect(body.continuationToken).toBeNull();
    });

    it('returns continuation token when more data exists', async () => {
      let callCount = 0;
      mockFetchNext.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            resources: [
              { id: 'f1', contentId: 'c1', contentType: 'post', reason: 'spam', createdAt: '2025-11-29T10:00:00Z', priorityScore: 5 },
            ],
            continuationToken: 'flag-token-123',
          });
        } else {
          return Promise.resolve({
            resources: [
              { id: 'a1', contentId: 'c2', contentType: 'post', status: 'pending', appealType: 'false_positive', urgencyScore: 7, createdAt: '2025-11-29T09:00:00Z', flagCount: 1 },
            ],
            continuationToken: 'appeal-token-456',
          });
        }
      });

      const response = await getReviewQueueHandler({
        context: contextStub,
        limit: 20,
      });

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body.hasMore).toBe(true);
      expect(body.continuationToken).toBeTruthy();
      // Token should be base64 encoded
      expect(() => JSON.parse(Buffer.from(body.continuationToken, 'base64').toString())).not.toThrow();
    });
  });

  describe('filtering', () => {
    it('only queries flags container when filterType=flag', async () => {
      mockFetchNext.mockResolvedValue({
        resources: [
          { id: 'f1', contentId: 'c1', contentType: 'post', reason: 'spam', createdAt: '2025-11-29T10:00:00Z', priorityScore: 5 },
        ],
        continuationToken: undefined,
      });

      const response = await getReviewQueueHandler({
        context: contextStub,
        filterType: 'flag',
      });

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body.items.every((item: any) => item.type === 'flag')).toBe(true);
      // Only one query call for flags
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('only queries appeals container when filterType=appeal', async () => {
      mockFetchNext.mockResolvedValue({
        resources: [
          { id: 'a1', contentId: 'c2', contentType: 'post', status: 'pending', appealType: 'false_positive', urgencyScore: 7, createdAt: '2025-11-29T09:00:00Z', flagCount: 1 },
        ],
        continuationToken: undefined,
      });

      const response = await getReviewQueueHandler({
        context: contextStub,
        filterType: 'appeal',
      });

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body.items.every((item: any) => item.type === 'appeal')).toBe(true);
      // Only one query call for appeals
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('queries both containers when filterType=all', async () => {
      let callCount = 0;
      mockFetchNext.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          resources: callCount === 1
            ? [{ id: 'f1', contentId: 'c1', contentType: 'post', reason: 'spam', createdAt: '2025-11-29T10:00:00Z', priorityScore: 5 }]
            : [{ id: 'a1', contentId: 'c2', contentType: 'post', status: 'pending', appealType: 'false_positive', urgencyScore: 7, createdAt: '2025-11-29T09:00:00Z', flagCount: 1 }],
          continuationToken: undefined,
        });
      });

      const response = await getReviewQueueHandler({
        context: contextStub,
        filterType: 'all',
      });

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body.items.some((item: any) => item.type === 'flag')).toBe(true);
      expect(body.items.some((item: any) => item.type === 'appeal')).toBe(true);
      // Two query calls - one for flags, one for appeals
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('returns 500 on database error', async () => {
      mockFetchNext.mockRejectedValue(new Error('Cosmos connection failed'));

      const response = await getReviewQueueHandler({
        context: contextStub,
      });

      expect(response.status).toBe(500);
      expect(response.jsonBody).toMatchObject({
        error: 'Internal server error',
        message: 'Cosmos connection failed',
      });
    });
  });

  describe('response shape', () => {
    it('includes all required fields in flag queue items', async () => {
      mockFetchNext.mockResolvedValue({
        resources: [
          { id: 'f1', contentId: 'c1', contentType: 'post', reason: 'spam', createdAt: '2025-11-29T10:00:00Z', priorityScore: 5 },
        ],
        continuationToken: undefined,
      });

      const response = await getReviewQueueHandler({
        context: contextStub,
        filterType: 'flag',
      });

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;

      const item = body.items[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('contentId');
      expect(item).toHaveProperty('contentType');
      expect(item).toHaveProperty('type', 'flag');
      expect(item).toHaveProperty('flagCount');
      expect(item).toHaveProperty('latestReasons');
      expect(item).toHaveProperty('appealStatus', null);
      expect(item).toHaveProperty('urgencyScore');
      expect(item).toHaveProperty('createdAt');
    });

    it('includes all required fields in appeal queue items', async () => {
      mockFetchNext.mockResolvedValue({
        resources: [
          { id: 'a1', contentId: 'c2', contentType: 'comment', status: 'pending', appealType: 'false_positive', urgencyScore: 7, createdAt: '2025-11-29T09:00:00Z', flagCount: 2, contentPreview: 'Preview text' },
        ],
        continuationToken: undefined,
      });

      const response = await getReviewQueueHandler({
        context: contextStub,
        filterType: 'appeal',
      });

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;

      const item = body.items[0];
      expect(item).toHaveProperty('id', 'a1');
      expect(item).toHaveProperty('contentId', 'c2');
      expect(item).toHaveProperty('contentType', 'comment');
      expect(item).toHaveProperty('type', 'appeal');
      expect(item).toHaveProperty('flagCount', 2);
      expect(item).toHaveProperty('latestReasons');
      expect(item.latestReasons).toContain('false_positive');
      expect(item).toHaveProperty('appealStatus', 'pending');
      expect(item).toHaveProperty('urgencyScore', 7);
      expect(item).toHaveProperty('createdAt');
      expect(item).toHaveProperty('preview', 'Preview text');
    });

    it('returns correct response envelope', async () => {
      mockFetchNext.mockResolvedValue({
        resources: [],
        continuationToken: undefined,
      });

      const response = await getReviewQueueHandler({
        context: contextStub,
      });

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;
      expect(body).toHaveProperty('items');
      expect(body).toHaveProperty('continuationToken');
      expect(body).toHaveProperty('totalCount');
      expect(body).toHaveProperty('hasMore');
      expect(Array.isArray(body.items)).toBe(true);
    });
  });

  describe('flag grouping', () => {
    it('groups multiple flags for same content', async () => {
      let callCount = 0;
      mockFetchNext.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            resources: [
              { id: 'f1', contentId: 'c1', contentType: 'post', reason: 'spam', createdAt: '2025-11-29T10:00:00Z', priorityScore: 5 },
              { id: 'f2', contentId: 'c1', contentType: 'post', reason: 'harassment', createdAt: '2025-11-29T09:00:00Z', priorityScore: 8 },
              { id: 'f3', contentId: 'c1', contentType: 'post', reason: 'spam', createdAt: '2025-11-29T08:00:00Z', priorityScore: 5 },
            ],
            continuationToken: undefined,
          });
        } else {
          return Promise.resolve({
            resources: [],
            continuationToken: undefined,
          });
        }
      });

      const response = await getReviewQueueHandler({
        context: contextStub,
      });

      expect(response.status).toBe(200);
      const body = response.jsonBody as any;

      // Should have only 1 item (grouped by contentId)
      expect(body.items).toHaveLength(1);
      expect(body.items[0].contentId).toBe('c1');
      expect(body.items[0].flagCount).toBe(3);
      // Should have unique reasons
      expect(body.items[0].latestReasons).toContain('spam');
      expect(body.items[0].latestReasons).toContain('harassment');
      // Should use highest priority score
      expect(body.items[0].urgencyScore).toBe(8);
      // Should use most recent createdAt
      expect(body.items[0].createdAt).toBe('2025-11-29T10:00:00Z');
    });
  });
});
