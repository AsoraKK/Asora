import type { InvocationContext } from '@azure/functions';
import { getFeed, encodeCursor, parseCursor, parseSince } from '@feed/service/feedService';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { withClient } from '@shared/clients/postgres';
import { HttpError } from '@shared/utils/errors';

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(),
}));

jest.mock('@shared/clients/postgres', () => ({
  withClient: jest.fn(),
}));

jest.mock('@shared/appInsights', () => ({
  trackAppMetric: jest.fn(),
  trackAppEvent: jest.fn(),
}));

const mockFetchNext = jest.fn();
const mockItemsQuery = jest.fn(() => ({ fetchNext: mockFetchNext }));
const mockContainer = {
  items: {
    query: mockItemsQuery,
  },
};

const getTargetDatabaseMock = getTargetDatabase as jest.MockedFunction<typeof getTargetDatabase>;
const mockedWithClient = withClient as jest.MockedFunction<typeof withClient>;

const mockContext = {
  log: jest.fn(),
} as unknown as InvocationContext;

function setupCosmosResponse(
  resources: Record<string, unknown>[],
  headers: Record<string, string> = {},
  continuationToken?: string
) {
  mockFetchNext.mockResolvedValue({
    resources,
    headers,
    continuationToken,
  });
}

describe('feedService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getTargetDatabaseMock.mockReturnValue({ posts: mockContainer });
    mockFetchNext.mockReset();
    mockItemsQuery.mockReset();
    mockItemsQuery.mockReturnValue({ fetchNext: mockFetchNext });
    mockedWithClient.mockReset();
  });

  // ─────────────────────────────────────────────────────────────
  // Cursor encoding/decoding
  // ─────────────────────────────────────────────────────────────

  describe('cursor encoding/decoding', () => {
    it('encodeCursor creates valid base64url string', () => {
      const cursor = encodeCursor({ ts: 1700000000000, id: 'post-123' });
      expect(typeof cursor).toBe('string');
      expect(cursor.length).toBeGreaterThan(0);
      // Should be base64url (no +, /, =)
      expect(cursor).not.toMatch(/[+/=]/);
    });

    it('parseCursor decodes valid cursor', () => {
      const original = { ts: 1700000000000, id: 'post-abc' };
      const encoded = encodeCursor(original);
      const decoded = parseCursor(encoded);
      expect(decoded).toEqual(original);
    });

    it('parseCursor returns null for empty/null input', () => {
      expect(parseCursor(null)).toBeNull();
      expect(parseCursor(undefined)).toBeNull();
      expect(parseCursor('')).toBeNull();
    });

    it('parseCursor throws HttpError for invalid cursor', () => {
      expect(() => parseCursor('invalid-not-base64')).toThrow(HttpError);
      expect(() => parseCursor('invalid-not-base64')).toThrow('Invalid cursor');
    });

    it('parseSince decodes valid since parameter', () => {
      const original = { ts: 1700000000000, id: 'post-xyz' };
      const encoded = encodeCursor(original);
      const decoded = parseSince(encoded);
      expect(decoded).toEqual(original);
    });

    it('parseSince returns null for empty/null input', () => {
      expect(parseSince(null)).toBeNull();
      expect(parseSince(undefined)).toBeNull();
    });

    it('parseSince throws HttpError for invalid since', () => {
      expect(() => parseSince('garbage')).toThrow(HttpError);
      expect(() => parseSince('garbage')).toThrow('Invalid since parameter');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getFeed - Ordering
  // ─────────────────────────────────────────────────────────────

  describe('getFeed ordering', () => {
    it('returns items sorted newest first (DESC by createdAt)', async () => {
      setupCosmosResponse([
        { id: 'old', createdAt: 1_000 },
        { id: 'mid', createdAt: 2_000 },
        { id: 'new', createdAt: 3_000 },
      ]);

      const result = await getFeed({ principal: null, context: mockContext });

      expect(result.body.items.map(item => item.id)).toEqual(['new', 'mid', 'old']);
    });

    it('sorts by id DESC when createdAt is equal (tie-breaker)', async () => {
      const sameTs = 1700000000000;
      setupCosmosResponse([
        { id: 'aaa', createdAt: sameTs },
        { id: 'ccc', createdAt: sameTs },
        { id: 'bbb', createdAt: sameTs },
      ]);

      const result = await getFeed({ principal: null, context: mockContext });

      // Should be sorted by id DESC: ccc > bbb > aaa
      expect(result.body.items.map(item => item.id)).toEqual(['ccc', 'bbb', 'aaa']);
    });

    it('handles mixed timestamps and ids correctly', async () => {
      setupCosmosResponse([
        { id: 'a', createdAt: 1000 },
        { id: 'b', createdAt: 2000 },
        { id: 'c', createdAt: 2000 },
        { id: 'd', createdAt: 3000 },
      ]);

      const result = await getFeed({ principal: null, context: mockContext });

      // d (3000), then c,b (2000, by id DESC), then a (1000)
      expect(result.body.items.map(item => item.id)).toEqual(['d', 'c', 'b', 'a']);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getFeed - Pagination
  // ─────────────────────────────────────────────────────────────

  describe('getFeed pagination', () => {
    it('returns nextCursor pointing to last item for backward pagination', async () => {
      setupCosmosResponse([
        { id: 'post-1', createdAt: 3000 },
        { id: 'post-2', createdAt: 2000 },
        { id: 'post-3', createdAt: 1000 },
      ]);

      const result = await getFeed({ principal: null, context: mockContext });

      expect(result.body.meta.nextCursor).toBe(encodeCursor({ ts: 1000, id: 'post-3' }));
    });

    it('returns sinceCursor pointing to first (newest) item for forward pagination', async () => {
      setupCosmosResponse([
        { id: 'newest', createdAt: 5000 },
        { id: 'older', createdAt: 4000 },
      ]);

      const result = await getFeed({ principal: null, context: mockContext });

      expect(result.body.meta.sinceCursor).toBe(encodeCursor({ ts: 5000, id: 'newest' }));
    });

    it('returns null cursors when no items', async () => {
      setupCosmosResponse([]);

      const result = await getFeed({ principal: null, context: mockContext });

      expect(result.body.meta.nextCursor).toBeNull();
      expect(result.body.meta.sinceCursor).toBeNull();
      expect(result.body.meta.count).toBe(0);
    });

    it('passes cursor to query for backward pagination', async () => {
      setupCosmosResponse([]);

      const cursor = encodeCursor({ ts: 2000, id: 'pivot-post' });
      await getFeed({ principal: null, context: mockContext, cursor });

      const queryDef = mockItemsQuery.mock.calls[0][0];
      expect(queryDef.query).toContain('@cursorTs');
      expect(queryDef.query).toContain('@cursorId');
      expect(queryDef.parameters).toContainEqual({ name: '@cursorTs', value: 2000 });
      expect(queryDef.parameters).toContainEqual({ name: '@cursorId', value: 'pivot-post' });
    });

    it('passes since to query for forward pagination', async () => {
      setupCosmosResponse([]);

      const since = encodeCursor({ ts: 1000, id: 'old-post' });
      await getFeed({ principal: null, context: mockContext, since });

      const queryDef = mockItemsQuery.mock.calls[0][0];
      expect(queryDef.query).toContain('@sinceTs');
      expect(queryDef.query).toContain('@sinceId');
      expect(queryDef.parameters).toContainEqual({ name: '@sinceTs', value: 1000 });
      expect(queryDef.parameters).toContainEqual({ name: '@sinceId', value: 'old-post' });
    });

    it('throws error when both cursor and since are provided', async () => {
      const cursor = encodeCursor({ ts: 2000, id: 'post-a' });
      const since = encodeCursor({ ts: 1000, id: 'post-b' });

      await expect(
        getFeed({ principal: null, context: mockContext, cursor, since })
      ).rejects.toThrow('Cannot use both cursor and since parameters');
    });

    it('does not include sinceCursor when using since parameter (avoid loops)', async () => {
      setupCosmosResponse([
        { id: 'new-post', createdAt: 3000 },
      ]);

      const since = encodeCursor({ ts: 2000, id: 'old-post' });
      const result = await getFeed({ principal: null, context: mockContext, since });

      // sinceCursor should be null when fetching with "since"
      expect(result.body.meta.sinceCursor).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getFeed - Query filtering
  // ─────────────────────────────────────────────────────────────

  describe('getFeed query filtering', () => {
    it('filters out comments (type=comment) from feed', async () => {
      setupCosmosResponse([]);

      await getFeed({ principal: null, context: mockContext });

      const queryDef = mockItemsQuery.mock.calls[0][0];
      expect(queryDef.query).toContain('NOT IS_DEFINED(c.type) OR c.type = "post"');
    });

    it('filters by published status', async () => {
      setupCosmosResponse([]);

      await getFeed({ principal: null, context: mockContext });

      const queryDef = mockItemsQuery.mock.calls[0][0];
      expect(queryDef.query).toContain('c.status = @status');
      expect(queryDef.parameters).toContainEqual({ name: '@status', value: 'published' });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getFeed - Feed modes
  // ─────────────────────────────────────────────────────────────

  describe('getFeed modes', () => {
    it('returns public feed with metadata for guest', async () => {
      setupCosmosResponse(
        [{ id: 'b', createdAt: 1_000 }, { id: 'c', createdAt: 2_000 }],
        { 'x-ms-request-charge': '2.00' },
        'token-123'
      );

      const result = await getFeed({ principal: null, context: mockContext });

      expect(result.body.meta.applied.feedType).toBe('public');
      expect(result.headers['X-Cosmos-RU']).toBe('2.00');
      expect(mockedWithClient).not.toHaveBeenCalled();
    });

    it('caps multi-author queries to MAX_AUTHOR_BATCH with cross partitioning', async () => {
      const followeeRows = Array.from({ length: 55 }, (_, index) => ({
        followee_uuid: `author-${index}`,
      }));

      mockedWithClient.mockImplementation(async (callback: any) =>
        callback({
          query: jest.fn(async (query: any) => {
            if (String(query.text).includes('followee_uuid')) {
              return { rows: followeeRows };
            }
            return { rowCount: 0 };
          }),
        })
      );

      setupCosmosResponse([], { 'x-ms-request-charge': '1' });

      const result = await getFeed({
        principal: { sub: 'principal-id', raw: {} } as any,
        context: mockContext,
      });

      expect(result.headers['X-Feed-Author-Count']).toBe('50');
      const options = mockItemsQuery.mock.calls[0][1];
      expect(options.partitionKey).toBeUndefined();
    });

    it('restricts profile feeds to single partition key', async () => {
      setupCosmosResponse([]);

      const result = await getFeed({
        principal: null,
        context: mockContext,
        authorId: 'target-author',
      });

      const options = mockItemsQuery.mock.calls[0][1];
      expect(options.partitionKey).toBe('target-author');
      expect(result.body.meta.applied.feedType).toBe('profile');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getFeed - Limit handling
  // ─────────────────────────────────────────────────────────────

  describe('getFeed limit handling', () => {
    it('respects custom limit parameter', async () => {
      setupCosmosResponse([]);

      await getFeed({ principal: null, context: mockContext, limit: 10 });

      const options = mockItemsQuery.mock.calls[0][1];
      expect(options.maxItemCount).toBe(10);
    });

    it('caps limit at MAX_LIMIT (50)', async () => {
      setupCosmosResponse([]);

      await getFeed({ principal: null, context: mockContext, limit: 100 });

      const options = mockItemsQuery.mock.calls[0][1];
      expect(options.maxItemCount).toBe(50);
    });

    it('uses DEFAULT_LIMIT (30) for invalid limit', async () => {
      setupCosmosResponse([]);

      await getFeed({ principal: null, context: mockContext, limit: -5 });

      const options = mockItemsQuery.mock.calls[0][1];
      expect(options.maxItemCount).toBe(30);
    });

    it('uses DEFAULT_LIMIT for non-numeric limit', async () => {
      setupCosmosResponse([]);

      await getFeed({ principal: null, context: mockContext, limit: 'abc' as any });

      const options = mockItemsQuery.mock.calls[0][1];
      expect(options.maxItemCount).toBe(30);
    });
  });
});
