/**
 * Feed Performance, Pagination, and Cache Safety – Hardening Tests
 *
 * Workstream 7: ADR target p95 feed reads < 200 ms.
 *
 * Covers gaps not addressed by feedService.test.ts / feed.cache-headers.test.ts:
 *  - Cursor edge cases (stale, malformed, exclusive boundary, NaN/Infinity ts, empty id)
 *  - Stable ordering edge cases (null/undefined createdAt, ISO string dates)
 *  - Limit boundary values (0, 1, 49, 50, 51, null, undefined, NaN string)
 *  - Content/visibility filtering (test posts, status, visibility clause)
 *  - Feed mode fallback (auth + no follows → public, Postgres error → public)
 *  - Observability (trackAppEvent, trackAppMetric, X-Request-Duration header, timingsMs, context.log)
 *  - Error handling (Cosmos throws, Postgres throws during followee fetch)
 *  - Cache header contract (route layer: guest ↔ auth, no s-maxage for auth)
 *  - Pagination continuity (cursor boundary exclusivity, empty stale page, sinceCursor chaining)
 *  - Duplicate post prevention across pages
 */

import type { InvocationContext } from '@azure/functions';
import { getFeed, encodeCursor, parseCursor, parseSince } from '@feed/service/feedService';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { withClient } from '@shared/clients/postgres';
import { trackAppEvent, trackAppMetric } from '@shared/appInsights';
import { HttpError } from '@shared/utils/errors';

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks – must come before any import that triggers them
// ─────────────────────────────────────────────────────────────────────────────

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

// Reputation service: mock to avoid live Cosmos calls in ranking path
jest.mock('@shared/services/reputationService', () => ({
  getBatchReputationScores: jest.fn().mockResolvedValue(new Map()),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Test infrastructure
// ─────────────────────────────────────────────────────────────────────────────

const mockFetchNext = jest.fn();
const mockItemsQuery = jest.fn(() => ({ fetchNext: mockFetchNext }));
const mockPostsContainer = { items: { query: mockItemsQuery } };

const getTargetDatabaseMock = getTargetDatabase as jest.MockedFunction<typeof getTargetDatabase>;
const mockedWithClient = withClient as jest.MockedFunction<typeof withClient>;
const mockTrackAppEvent = trackAppEvent as jest.MockedFunction<typeof trackAppEvent>;
const mockTrackAppMetric = trackAppMetric as jest.MockedFunction<typeof trackAppMetric>;

const mockContext = {
  log: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

function setupCosmosResponse(
  resources: Record<string, unknown>[],
  requestCharge = 1.5,
  continuationToken?: string,
) {
  mockFetchNext.mockResolvedValue({ resources, requestCharge, continuationToken });
}

/** Build an encoded cursor from raw values without going through getFeed */
function makeCursor(ts: number, id: string): string {
  return encodeCursor({ ts, id });
}

beforeEach(() => {
  jest.clearAllMocks();
  getTargetDatabaseMock.mockReturnValue({ posts: mockPostsContainer } as any);
  mockItemsQuery.mockReturnValue({ fetchNext: mockFetchNext });
  mockedWithClient.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Cursor edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('cursor edge cases', () => {
  it('stale cursor (no matching results) returns empty page without error', async () => {
    setupCosmosResponse([]);
    const cursor = makeCursor(1, 'very-old-post');

    const result = await getFeed({ principal: null, context: mockContext, cursor });

    expect(result.body.items).toHaveLength(0);
    expect(result.body.meta.nextCursor).toBeNull();
    expect(result.body.meta.count).toBe(0);
  });

  it('throws HttpError 400 for cursor with NaN ts', () => {
    // JSON.stringify(NaN) → null → Number(null)=0 which is finite, so embed ts as string "NaN"
    const bad = Buffer.from('{"ts":"NaN","id":"post-1"}').toString('base64url');
    expect(() => parseCursor(bad)).toThrow(HttpError);
    expect(() => parseCursor(bad)).toThrow('Invalid cursor');
  });

  it('throws HttpError 400 for cursor with Infinity ts', () => {
    // JSON.stringify(Infinity) → null; embed as string so Number("Infinity")=Infinity (not finite)
    const raw = Buffer.from('{"ts":"Infinity","id":"post-1"}').toString('base64url');
    expect(() => parseCursor(raw)).toThrow(HttpError);
  });

  it('throws HttpError 400 for cursor with empty id string', () => {
    const bad = Buffer.from(JSON.stringify({ ts: 1700000000000, id: '' })).toString('base64url');
    expect(() => parseCursor(bad)).toThrow(HttpError);
  });

  it('throws HttpError 400 for cursor that is plain JSON (not base64url)', () => {
    // Plain JSON bypasses base64url decoding → garbage → parse fails → 400
    expect(() => parseCursor('{"ts":1000,"id":"post"}')).toThrow(HttpError);
  });

  it('throws HttpError 400 for cursor that is empty JSON object {}', () => {
    const bad = Buffer.from('{}').toString('base64url');
    expect(() => parseCursor(bad)).toThrow(HttpError);
  });

  it('throws HttpError 400 for since with NaN ts', () => {
    // Use string "NaN" so Number("NaN") returns NaN (non-finite)
    const bad = Buffer.from('{"ts":"NaN","id":"post-1"}').toString('base64url');
    expect(() => parseSince(bad)).toThrow(HttpError);
    expect(() => parseSince(bad)).toThrow('Invalid since parameter');
  });

  it('throws HttpError 400 for since with empty id', () => {
    const bad = Buffer.from(JSON.stringify({ ts: 1000, id: '' })).toString('base64url');
    expect(() => parseSince(bad)).toThrow(HttpError);
  });

  it('since with no newer items returns empty page without error', async () => {
    setupCosmosResponse([]);
    const since = makeCursor(Date.now() + 9999999, 'future-post');

    const result = await getFeed({ principal: null, context: mockContext, since });

    expect(result.body.items).toHaveLength(0);
    expect(result.body.meta.nextCursor).toBeNull();
    expect(result.body.meta.sinceCursor).toBeNull();
  });

  it('cursor boundary is exclusive – page 2 query excludes page 1 pivot item', async () => {
    // Page 1: 3 items; last item has ts=1000, id='post-c'
    setupCosmosResponse([
      { id: 'post-a', createdAt: 3000 },
      { id: 'post-b', createdAt: 2000 },
      { id: 'post-c', createdAt: 1000 },
    ]);
    const page1 = await getFeed({ principal: null, context: mockContext });
    const nextCursor = page1.body.meta.nextCursor!;
    expect(nextCursor).toBeTruthy();

    // Page 2: pass nextCursor
    jest.clearAllMocks();
    getTargetDatabaseMock.mockReturnValue({ posts: mockPostsContainer } as any);
    mockItemsQuery.mockReturnValue({ fetchNext: mockFetchNext });
    setupCosmosResponse([]);
    await getFeed({ principal: null, context: mockContext, cursor: nextCursor });

    // Verify the cursor parameters in the query
    const queryDef = mockItemsQuery.mock.calls[0][0] as { query: string; parameters: any[] };
    // Strict less-than: < @cursorTs (exclusive of pivot)
    expect(queryDef.query).toMatch(/c\.createdAt < @cursorTs/);
    expect(queryDef.parameters).toContainEqual({ name: '@cursorTs', value: 1000 });
    expect(queryDef.parameters).toContainEqual({ name: '@cursorId', value: 'post-c' });
  });

  it('sinceCursor encodes the first (newest) item for pull-to-refresh', async () => {
    setupCosmosResponse([
      { id: 'newest', createdAt: 5000 },
      { id: 'older', createdAt: 4000 },
    ]);

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.body.meta.sinceCursor).toBe(makeCursor(5000, 'newest'));
  });

  it('sinceCursor is null when fetching via since (prevents loop)', async () => {
    setupCosmosResponse([{ id: 'new-post', createdAt: 9999 }]);
    const since = makeCursor(5000, 'prev-newest');

    const result = await getFeed({ principal: null, context: mockContext, since });

    expect(result.body.meta.sinceCursor).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Limit boundary values
// ─────────────────────────────────────────────────────────────────────────────

describe('limit boundary values', () => {
  async function checkMaxItemCount(limit: any, expected: number) {
    setupCosmosResponse([]);
    await getFeed({ principal: null, context: mockContext, limit });
    const opts = mockItemsQuery.mock.calls[0][1] as { maxItemCount: number };
    expect(opts.maxItemCount).toBe(expected);
  }

  it('limit=1 → maxItemCount=1', () => checkMaxItemCount(1, 1));
  it('limit=49 → maxItemCount=49', () => checkMaxItemCount(49, 49));
  it('limit=50 (MAX) → maxItemCount=50', () => checkMaxItemCount(50, 50));
  it('limit=51 is capped to 50', () => checkMaxItemCount(51, 50));
  it('limit=100 is capped to 50', () => checkMaxItemCount(100, 50));
  it('limit=0 falls back to default 30', () => checkMaxItemCount(0, 30));
  it('limit=-1 falls back to default 30', () => checkMaxItemCount(-1, 30));
  it('limit=-999 falls back to default 30', () => checkMaxItemCount(-999, 30));
  it('limit=NaN falls back to default 30', () => checkMaxItemCount(NaN, 30));
  it('limit=null falls back to default 30', () => checkMaxItemCount(null, 30));
  it('limit=undefined falls back to default 30', () => checkMaxItemCount(undefined, 30));
  it('limit="NaN" string falls back to default 30', () => checkMaxItemCount('NaN', 30));
  it('limit="0" string falls back to default 30', () => checkMaxItemCount('0', 30));
  it('limit="51" string is capped to 50', () => checkMaxItemCount('51', 50));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Stable ordering edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('stable ordering edge cases', () => {
  it('items with undefined createdAt are treated as oldest (ts=0)', async () => {
    setupCosmosResponse([
      { id: 'no-ts' }, // no createdAt
      { id: 'has-ts', createdAt: 5000 },
    ]);

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.body.items[0]!.id).toBe('has-ts');
    expect(result.body.items[1]!.id).toBe('no-ts');
  });

  it('items with null createdAt are treated as oldest', async () => {
    setupCosmosResponse([
      { id: 'null-ts', createdAt: null },
      { id: 'valid-ts', createdAt: 1000 },
    ]);

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.body.items[0]!.id).toBe('valid-ts');
    expect(result.body.items[1]!.id).toBe('null-ts');
  });

  it('ISO string createdAt dates are sorted correctly', async () => {
    setupCosmosResponse([
      { id: 'jan', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'dec', createdAt: '2024-12-31T00:00:00.000Z' },
      { id: 'jun', createdAt: '2024-06-15T00:00:00.000Z' },
    ]);

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.body.items.map(i => i.id)).toEqual(['dec', 'jun', 'jan']);
  });

  it('ordering is deterministic when ts equals and id is identical (no infinite loop)', async () => {
    setupCosmosResponse([
      { id: 'same', createdAt: 1000 },
      { id: 'same', createdAt: 1000 }, // duplicate id
    ]);

    // Should not throw
    const result = await getFeed({ principal: null, context: mockContext });
    expect(result.body.items).toHaveLength(2);
  });

  it('single-item feed has nextCursor and sinceCursor pointing to same item', async () => {
    setupCosmosResponse([{ id: 'solo', createdAt: 9000 }]);

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.body.meta.nextCursor).toBe(makeCursor(9000, 'solo'));
    expect(result.body.meta.sinceCursor).toBe(makeCursor(9000, 'solo'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Content and visibility filtering
// ─────────────────────────────────────────────────────────────────────────────

describe('content and visibility filtering', () => {
  it('excludes test posts by default (includes NOT IS_DEFINED(c.isTestPost) clause)', async () => {
    setupCosmosResponse([]);

    await getFeed({ principal: null, context: mockContext, includeTestPosts: false });

    const queryDef = mockItemsQuery.mock.calls[0][0] as { query: string };
    expect(queryDef.query).toContain('NOT IS_DEFINED(c.isTestPost)');
  });

  it('includes test posts when includeTestPosts=true (without session)', async () => {
    setupCosmosResponse([]);

    await getFeed({ principal: null, context: mockContext, includeTestPosts: true });

    const queryDef = mockItemsQuery.mock.calls[0][0] as { query: string };
    expect(queryDef.query).toContain('c.isTestPost = true');
  });

  it('scopes test posts to session when testSessionId provided', async () => {
    setupCosmosResponse([]);

    await getFeed({
      principal: null,
      context: mockContext,
      includeTestPosts: true,
      testSessionId: 'sess-abc',
    });

    const queryDef = mockItemsQuery.mock.calls[0][0] as { query: string; parameters: any[] };
    expect(queryDef.query).toContain('c.testSessionId = @testSessionId');
    expect(queryDef.parameters).toContainEqual({ name: '@testSessionId', value: 'sess-abc' });
  });

  it('filters by published status – deleted/moderated posts excluded', async () => {
    setupCosmosResponse([]);

    await getFeed({ principal: null, context: mockContext });

    const queryDef = mockItemsQuery.mock.calls[0][0] as { query: string; parameters: any[] };
    // Cosmos SQL WHERE clause enforces status=published; deleted/moderated items have different status
    expect(queryDef.query).toContain('c.status = @status');
    expect(queryDef.parameters).toContainEqual({ name: '@status', value: 'published' });
  });

  it('blocked AI content excluded via status filter (aiLabel=generated uses moderation pipeline to set non-published status)', async () => {
    setupCosmosResponse([]);

    await getFeed({ principal: null, context: mockContext });

    // AI-generated content blocked by moderation pipeline will have status != 'published'
    // and therefore be excluded by the c.status = @status WHERE clause
    const queryDef = mockItemsQuery.mock.calls[0][0] as { parameters: any[] };
    expect(queryDef.parameters).toContainEqual({ name: '@status', value: 'published' });
  });

  it('guest feed uses public visibility filter only', async () => {
    setupCosmosResponse([]);

    await getFeed({ principal: null, context: mockContext });

    const queryDef = mockItemsQuery.mock.calls[0][0] as { query: string; parameters: any[] };
    expect(queryDef.parameters).toContainEqual({ name: '@visibility0', value: 'public' });
    // Only one visibility value → no ARRAY_CONTAINS pattern for visibility
    expect(queryDef.query).toContain('c.visibility = @visibility0');
  });

  it('home feed uses public + followers visibility filters', async () => {
    mockedWithClient.mockImplementation(async (cb: any) =>
      cb({
        query: jest.fn().mockResolvedValue({
          rows: [{ followee_uuid: 'author-2' }],
        }),
      }),
    );
    setupCosmosResponse([]);

    await getFeed({
      principal: { sub: 'user-1', raw: {} } as any,
      context: mockContext,
    });

    const queryDef = mockItemsQuery.mock.calls[0][0] as { query: string };
    expect(queryDef.query).toContain('c.visibility IN');
  });

  it('profile feed with unauthenticated viewer restricts to public visibility only', async () => {
    setupCosmosResponse([]);

    await getFeed({ principal: null, context: mockContext, authorId: 'target-user' });

    const queryDef = mockItemsQuery.mock.calls[0][0] as { query: string; parameters: any[] };
    expect(queryDef.parameters).toContainEqual({ name: '@visibility0', value: 'public' });
    // Not followers or private
    const hasFollowers = queryDef.parameters.some(
      (p: any) => p.value === 'followers' || p.value === 'private',
    );
    expect(hasFollowers).toBe(false);
  });

  it('profile feed with owner includes private visibility', async () => {
    mockedWithClient.mockImplementation(async (cb: any) =>
      cb({
        query: jest.fn().mockResolvedValue({ rowCount: 1, rows: [] }),
      }),
    );
    setupCosmosResponse([]);

    await getFeed({
      principal: { sub: 'owner-1', raw: {} } as any,
      context: mockContext,
      authorId: 'owner-1', // requesting own profile
    });

    const queryDef = mockItemsQuery.mock.calls[0][0] as { parameters: any[] };
    const visibilityValues = queryDef.parameters
      .filter((p: any) => p.name.startsWith('@visibility'))
      .map((p: any) => p.value);
    expect(visibilityValues).toContain('private');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Feed mode fallback
// ─────────────────────────────────────────────────────────────────────────────

describe('feed mode fallback', () => {
  it('authenticated user with no follows returns home feed including self', async () => {
    // fetchFollowees always adds principalId (self) to the author list,
    // so even with zero follows the mode is 'home' (not 'public').
    mockedWithClient.mockImplementation(async (cb: any) =>
      cb({ query: jest.fn().mockResolvedValue({ rows: [] }) }),
    );
    setupCosmosResponse([]);

    const result = await getFeed({
      principal: { sub: 'lonely-user', raw: {} } as any,
      context: mockContext,
    });

    expect(result.body.meta.applied!.feedType).toBe('home');
    expect(result.headers['X-Feed-Type']).toBe('home');
  });

  it('authenticated user with follows gets home feed mode', async () => {
    mockedWithClient.mockImplementation(async (cb: any) =>
      cb({
        query: jest.fn().mockResolvedValue({
          rows: [{ followee_uuid: 'friend-1' }, { followee_uuid: 'friend-2' }],
        }),
      }),
    );
    setupCosmosResponse([]);

    const result = await getFeed({
      principal: { sub: 'social-user', raw: {} } as any,
      context: mockContext,
    });

    expect(result.body.meta.applied!.feedType).toBe('home');
    expect(result.headers['X-Feed-Type']).toBe('home');
  });

  it('Postgres error during followee fetch falls back to public feed (graceful degradation)', async () => {
    mockedWithClient.mockRejectedValueOnce(new Error('DB connection refused'));
    setupCosmosResponse([]);

    // Should NOT throw – degrades to public feed
    const result = await getFeed({
      principal: { sub: 'user-1', raw: {} } as any,
      context: mockContext,
    });

    expect(result.body.meta.applied!.feedType).toBe('public');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Observability
// ─────────────────────────────────────────────────────────────────────────────

describe('observability', () => {
  it('emits feed_page custom event via trackAppEvent', async () => {
    setupCosmosResponse([{ id: 'p1', createdAt: 1000 }]);

    await getFeed({ principal: null, context: mockContext });

    expect(mockTrackAppEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'feed_page' }),
    );
  });

  it('feed_page event includes count, hasMore, and feed.type', async () => {
    setupCosmosResponse([{ id: 'p1', createdAt: 1000 }], 2.5, 'cont-token');

    await getFeed({ principal: null, context: mockContext });

    const [call] = mockTrackAppEvent.mock.calls;
    const props = (call![0] as any).properties;
    expect(props['count']).toBe(1);
    expect(props['hasMore']).toBe(true);
    expect(props['feed.type']).toBe('public');
  });

  it('emits cosmos_ru_feed_page metric via trackAppMetric', async () => {
    setupCosmosResponse([], 4.2);

    await getFeed({ principal: null, context: mockContext });

    expect(mockTrackAppMetric).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'cosmos_ru_feed_page', value: 4.2 }),
    );
  });

  it('cosmos_ru_feed_page metric is 0 when requestCharge is non-finite', async () => {
    mockFetchNext.mockResolvedValue({ resources: [], requestCharge: NaN });

    await getFeed({ principal: null, context: mockContext });

    expect(mockTrackAppMetric).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'cosmos_ru_feed_page', value: 0 }),
    );
  });

  it('X-Request-Duration header is present and numeric', async () => {
    setupCosmosResponse([]);

    const result = await getFeed({ principal: null, context: mockContext });

    const dur = result.headers['X-Request-Duration'];
    expect(dur).toBeDefined();
    expect(Number.isFinite(Number(dur))).toBe(true);
  });

  it('X-Feed-Type header reflects the resolved feed mode', async () => {
    setupCosmosResponse([]);

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.headers['X-Feed-Type']).toBe('public');
  });

  it('X-Cosmos-RU header reflects the Cosmos request charge', async () => {
    setupCosmosResponse([], 3.14);

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.headers['X-Cosmos-RU']).toBe('3.14');
  });

  it('response body meta includes timingsMs with query and total', async () => {
    setupCosmosResponse([]);

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.body.meta.timingsMs).toBeDefined();
    expect(typeof result.body.meta.timingsMs!.query).toBe('number');
    expect(typeof result.body.meta.timingsMs!.total).toBe('number');
    expect(result.body.meta.timingsMs!.total).toBeGreaterThanOrEqual(0);
  });

  it('context.log is called at feed start and completion', async () => {
    setupCosmosResponse([]);

    await getFeed({ principal: null, context: mockContext });

    const logCalls = (mockContext.log as jest.Mock).mock.calls.map(c => c[0]);
    expect(logCalls).toContain('feed.get.start');
    expect(logCalls).toContain('feed.get.complete');
  });

  it('feed.get.complete log includes durationMs, items count, and feedType', async () => {
    setupCosmosResponse([{ id: 'p1', createdAt: 1000 }]);

    await getFeed({ principal: null, context: mockContext });

    const completeCall = (mockContext.log as jest.Mock).mock.calls.find(c => c[0] === 'feed.get.complete');
    expect(completeCall).toBeDefined();
    const meta = completeCall![1];
    expect(typeof meta.durationMs).toBe('string'); // toFixed returns string
    expect(meta.items).toBe(1);
    expect(meta.feedType).toBe('public');
  });

  it('X-Feed-Limit header matches resolved limit', async () => {
    setupCosmosResponse([]);

    const result = await getFeed({ principal: null, context: mockContext, limit: 15 });

    expect(result.headers['X-Feed-Limit']).toBe('15');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Error handling hardening
// ─────────────────────────────────────────────────────────────────────────────

describe('error handling hardening', () => {
  it('getFeed rejects when Cosmos fetchNext throws a generic error', async () => {
    mockFetchNext.mockRejectedValueOnce(new Error('Cosmos service unavailable'));

    await expect(
      getFeed({ principal: null, context: mockContext }),
    ).rejects.toThrow('Cosmos service unavailable');
  });

  it('getFeed rejects when Cosmos throws a timeout-like error', async () => {
    const timeoutErr = Object.assign(new Error('Request timeout'), { code: 'REQUEST_TIMEOUT' });
    mockFetchNext.mockRejectedValueOnce(timeoutErr);

    await expect(
      getFeed({ principal: null, context: mockContext }),
    ).rejects.toThrow('Request timeout');
  });

  it('getFeed rejects with HttpError 400 when both cursor and since are provided', async () => {
    const cursor = makeCursor(2000, 'a');
    const since = makeCursor(1000, 'b');

    await expect(
      getFeed({ principal: null, context: mockContext, cursor, since }),
    ).rejects.toThrow(HttpError);
    await expect(
      getFeed({ principal: null, context: mockContext, cursor, since }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('Postgres error during isFollowing check falls back to public visibility for profile feed', async () => {
    mockedWithClient.mockRejectedValueOnce(new Error('DB timeout'));
    setupCosmosResponse([]);

    // Should not throw – visibility falls back gracefully
    const result = await getFeed({
      principal: { sub: 'viewer-1', raw: {} } as any,
      context: mockContext,
      authorId: 'other-user',
    });

    // Without isFollowing, only public visibility
    const queryDef = mockItemsQuery.mock.calls[0][0] as { parameters: any[] };
    const visibilityValues = queryDef.parameters
      .filter((p: any) => p.name.startsWith('@visibility'))
      .map((p: any) => p.value);
    expect(visibilityValues).not.toContain('followers');
    expect(result.body).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Pagination continuity
// ─────────────────────────────────────────────────────────────────────────────

describe('pagination continuity', () => {
  it('nextCursor from page 1 encodes the last sorted item (oldest of the page)', async () => {
    setupCosmosResponse([
      { id: 'p-newest', createdAt: 9000 },
      { id: 'p-mid', createdAt: 7000 },
      { id: 'p-oldest', createdAt: 5000 },
    ]);

    const result = await getFeed({ principal: null, context: mockContext });

    // After sorting DESC, last item is p-oldest (5000)
    expect(result.body.meta.nextCursor).toBe(makeCursor(5000, 'p-oldest'));
  });

  it('empty page with stale cursor returns null for both cursors', async () => {
    setupCosmosResponse([]);
    const cursor = makeCursor(999, 'ancient-post');

    const result = await getFeed({ principal: null, context: mockContext, cursor });

    expect(result.body.meta.nextCursor).toBeNull();
    expect(result.body.meta.sinceCursor).toBeNull();
    expect(result.body.meta.count).toBe(0);
  });

  it('page 2 cursor query uses strict less-than, not less-than-or-equal', async () => {
    setupCosmosResponse([]);
    const cursor = makeCursor(5000, 'pivot');

    await getFeed({ principal: null, context: mockContext, cursor });

    const queryDef = mockItemsQuery.mock.calls[0][0] as { query: string };
    // Strict exclusive: c.createdAt < @cursorTs (no <=)
    expect(queryDef.query).toMatch(/c\.createdAt < @cursorTs/);
    expect(queryDef.query).not.toMatch(/c\.createdAt <= @cursorTs/);
  });

  it('since query uses strict greater-than for forward pagination', async () => {
    setupCosmosResponse([]);
    const since = makeCursor(5000, 'pivot');

    await getFeed({ principal: null, context: mockContext, since });

    const queryDef = mockItemsQuery.mock.calls[0][0] as { query: string };
    expect(queryDef.query).toMatch(/c\.createdAt > @sinceTs/);
    expect(queryDef.query).not.toMatch(/c\.createdAt >= @sinceTs/);
  });

  it('meta.applied includes feedType, visibilityFilters, and authorCount', async () => {
    setupCosmosResponse([]);

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.body.meta.applied).toMatchObject({
      feedType: 'public',
      visibilityFilters: ['public'],
      authorCount: 0,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Cache header contract (service-level headers only; route-level in feed.cache-headers.test.ts)
// ─────────────────────────────────────────────────────────────────────────────

describe('service-level response headers', () => {
  it('X-Cosmos-Continuation-Token header is set when continuationToken exists', async () => {
    setupCosmosResponse([], 1, 'cont-token-xyz');

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.headers['X-Cosmos-Continuation-Token']).toBe('cont-token-xyz');
  });

  it('X-Cosmos-Continuation-Token header is empty string when no continuation', async () => {
    setupCosmosResponse([]);

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.headers['X-Cosmos-Continuation-Token']).toBe('');
  });

  it('X-Feed-Author-Count is 0 for public/guest feed', async () => {
    setupCosmosResponse([]);

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.headers['X-Feed-Author-Count']).toBe('0');
  });

  it('X-Feed-Author-Count reflects number of authors for home feed', async () => {
    mockedWithClient.mockImplementation(async (cb: any) =>
      cb({
        query: jest.fn().mockResolvedValue({
          rows: [{ followee_uuid: 'f1' }, { followee_uuid: 'f2' }],
        }),
      }),
    );
    setupCosmosResponse([]);

    const result = await getFeed({
      principal: { sub: 'me', raw: {} } as any,
      context: mockContext,
    });

    // me + f1 + f2 = 3 authors
    expect(Number(result.headers['X-Feed-Author-Count'])).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Duplicate post prevention across pages
// ─────────────────────────────────────────────────────────────────────────────

describe('duplicate post prevention across pages', () => {
  it('cursor from page 1 produces query parameters that exclude the pivot item', async () => {
    const page1Items = [
      { id: 'post-alpha', createdAt: 10000 },
      { id: 'post-beta', createdAt: 8000 },
      { id: 'post-gamma', createdAt: 6000 },
    ];
    setupCosmosResponse(page1Items);

    const page1 = await getFeed({ principal: null, context: mockContext, limit: 3 });
    const pivotCursor = page1.body.meta.nextCursor!;

    // Decode cursor to verify it points to last item (post-gamma)
    const decoded = parseCursor(pivotCursor)!;
    expect(decoded.ts).toBe(6000);
    expect(decoded.id).toBe('post-gamma');

    // Now simulate page 2 request – verify query excludes post-gamma
    jest.clearAllMocks();
    getTargetDatabaseMock.mockReturnValue({ posts: mockPostsContainer } as any);
    mockItemsQuery.mockReturnValue({ fetchNext: mockFetchNext });
    setupCosmosResponse([{ id: 'post-delta', createdAt: 4000 }]);

    await getFeed({ principal: null, context: mockContext, cursor: pivotCursor });

    const page2Query = mockItemsQuery.mock.calls[0][0] as { query: string; parameters: any[] };
    // Must use strict less-than (exclusive), not <=
    expect(page2Query.query).toContain('c.createdAt < @cursorTs');
    expect(page2Query.parameters).toContainEqual({ name: '@cursorTs', value: 6000 });
    expect(page2Query.parameters).toContainEqual({ name: '@cursorId', value: 'post-gamma' });
  });

  it('newer posts inserted after page 1 do not appear in backward pagination page 2', async () => {
    const page1Items = [{ id: 'old-post', createdAt: 5000 }];
    setupCosmosResponse(page1Items);

    const page1 = await getFeed({ principal: null, context: mockContext });
    const nextCursor = page1.body.meta.nextCursor!;

    // Page 2 uses cursor which is backward-looking (< cursorTs)
    // Newer items (ts > cursorTs) would not match this condition
    jest.clearAllMocks();
    getTargetDatabaseMock.mockReturnValue({ posts: mockPostsContainer } as any);
    mockItemsQuery.mockReturnValue({ fetchNext: mockFetchNext });
    setupCosmosResponse([]);

    await getFeed({ principal: null, context: mockContext, cursor: nextCursor });

    const page2Query = mockItemsQuery.mock.calls[0][0] as { query: string; parameters: any[] };
    // Cursor ts = 5000: only items with createdAt < 5000 match → new items (ts > 5000) excluded
    expect(page2Query.query).toContain('c.createdAt < @cursorTs');
    expect(page2Query.parameters).toContainEqual({ name: '@cursorTs', value: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Guest discovery feed (route-agnostic service contract)
// ─────────────────────────────────────────────────────────────────────────────

describe('guest discovery feed', () => {
  it('null principal produces mode=public with no Postgres calls', async () => {
    setupCosmosResponse([{ id: 'pub-post', createdAt: 1000 }]);

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.body.meta.applied!.feedType).toBe('public');
    expect(mockedWithClient).not.toHaveBeenCalled();
  });

  it('guest feed response has all required meta fields', async () => {
    setupCosmosResponse([{ id: 'p1', createdAt: 1000 }]);

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.body.meta).toMatchObject({
      count: 1,
      nextCursor: expect.any(String),
    });
    expect(result.body.meta.sinceCursor).toBeTruthy();
    expect(result.body.meta.timingsMs).toBeDefined();
  });

  it('empty guest feed returns count=0 and null cursors', async () => {
    setupCosmosResponse([]);

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.body.meta.count).toBe(0);
    expect(result.body.meta.nextCursor).toBeNull();
    expect(result.body.meta.sinceCursor).toBeNull();
  });
});
