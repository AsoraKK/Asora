import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import type { InvocationContext } from '@azure/functions';
import { makeCandidate, makeContext, useFixedTime, restoreTime, hoursAgo } from './testUtils';

const adapterFactory = () => ({
  listRecentPosts: vi.fn(),
  listTrendingPosts: vi.fn(),
  listFollowingPosts: vi.fn(),
  getUserFollowingSet: vi.fn(),
});

let adapterStub = adapterFactory();

const cosmosClientMock = vi.fn(() => ({}));

vi.mock('@azure/cosmos', () => ({
  CosmosClient: cosmosClientMock,
}));

vi.mock('../pipeline/adapters/cosmos', () => ({
  CosmosAdapter: vi.fn(() => adapterStub),
}));

describe('pipeline integration', () => {
  beforeEach(() => {
    useFixedTime();
    adapterStub = adapterFactory();
    process.env.COSMOS_DB_ENDPOINT = 'https://localhost';
    process.env.COSMOS_DB_KEY = 'key';
    process.env.COSMOS_DB_DATABASE = 'db';
  });

  afterEach(() => {
    restoreTime();
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.COSMOS_DB_ENDPOINT;
    delete process.env.COSMOS_DB_KEY;
    delete process.env.COSMOS_DB_DATABASE;
    delete process.env.COSMOS_ENDPOINT;
    delete process.env.COSMOS_KEY;
    delete process.env.COSMOS_DATABASE;
    delete process.env.COSMOS_POSTS_CONTAINER;
    delete process.env.COSMOS_FOLLOWS_CONTAINER;
    delete process.env.COSMOS_USERS_CONTAINER;
  });

  it('honors fairness floors/caps, ratio, and chronological ordering', async () => {
    const makeCands = (region: string, label: string, likeBoost: number) =>
      [1, 2, 3, 4, 5].flatMap(level =>
        Array.from({ length: 6 }, (_, idx) =>
          makeCandidate({
            id: `${label}-${level}-${idx}`,
            authorId: `${label}-author-${level}-${idx}`,
            createdAt: hoursAgo(level * 2 + idx / 10),
            region,
            aiHumanScore: 1,
            stats: {
              likes: (50 - level * 5) * likeBoost,
              replies: level,
              reshares: level,
            },
            author: {
              authorId: `${label}-author-${level}-${idx}`,
              reputationLevel: level as 1 | 2 | 3 | 4 | 5,
              consistency: 0.8,
            },
          })
        )
      );

    const localCands = makeCands('US', 'local', 1.3);
    const globalCands = makeCands('CA', 'global', 1);

    adapterStub.listRecentPosts.mockResolvedValue(localCands);
    adapterStub.listTrendingPosts.mockResolvedValue(globalCands);
    adapterStub.listFollowingPosts.mockResolvedValue([]);
    adapterStub.getUserFollowingSet.mockResolvedValue(new Set<string>());

    const { buildPipeline } = await import('../pipeline');

    const pipeline = buildPipeline({ log: vi.fn() } as unknown as InvocationContext);
    const context = makeContext({
      mode: 'discovery',
      pageSize: 20,
      region: 'US',
      localToGlobalRatio: 0.5,
      userPrefs: { rankMode: 'chronological' },
    });

    const result = await pipeline.run('user-1', context);
    expect(result.items).toHaveLength(20);

    const localCount = result.items.filter(i => i.region === 'US').length;
    const needLocal = Math.floor(result.items.length * context.localToGlobalRatio);
    const needGlobal = result.items.length - needLocal;
    const globalCount = result.items.length - localCount;
    if (globalCount < needGlobal) {
      expect(localCount).toBe(result.items.length - globalCount);
      expect(localCount).toBeGreaterThanOrEqual(needLocal);
    } else if (localCount < needLocal) {
      expect(globalCount).toBe(result.items.length - localCount);
      expect(globalCount).toBeGreaterThanOrEqual(needGlobal);
    } else {
      expect(localCount).toBe(needLocal);
      expect(globalCount).toBe(needGlobal);
    }

    const counts = new Map<number, number>();
    for (const item of result.items) {
      counts.set(item.cohort, (counts.get(item.cohort) ?? 0) + 1);
    }

    const { Fairness } = await import('../pipeline/config');
    const scale = context.pageSize / 20;
    for (const [level, floor] of Fairness.floors.entries()) {
      expect(counts.get(level) ?? 0).toBeGreaterThanOrEqual(Math.floor(floor * scale));
    }
    for (const [level, cap] of Fairness.caps.entries()) {
      expect(counts.get(level) ?? 0).toBeLessThanOrEqual(Math.floor(cap * scale) || 1);
    }

    const chronological = [...result.items].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
    expect(result.items.map(i => i.id)).toEqual(chronological.map(i => i.id));
  });

  it('throws when Cosmos database env is missing', async () => {
    process.env.COSMOS_DB_ENDPOINT = 'https://localhost';
    process.env.COSMOS_DB_KEY = 'key';
    delete process.env.COSMOS_DB_DATABASE;
    delete process.env.COSMOS_DATABASE;

    const { buildPipeline } = await import('../pipeline');
    expect(() => buildPipeline({ log: vi.fn() } as unknown as InvocationContext)).toThrow(
      'COSMOS_DB_DATABASE or COSMOS_DATABASE must be configured'
    );
  });

  it('throws when Cosmos key env is missing', async () => {
    process.env.COSMOS_DB_ENDPOINT = 'https://localhost';
    delete process.env.COSMOS_DB_KEY;
    delete process.env.COSMOS_KEY;
    process.env.COSMOS_DB_DATABASE = 'db';

    const { buildPipeline } = await import('../pipeline');
    expect(() => buildPipeline({ log: vi.fn() } as unknown as InvocationContext)).toThrow(
      'COSMOS_DB_ENDPOINT/COSMOS_ENDPOINT and COSMOS_DB_KEY/COSMOS_KEY must be configured'
    );
  });

  it('prefers fallback cosmos env keys and caches the client', async () => {
    adapterStub.listRecentPosts.mockResolvedValue([]);
    adapterStub.listTrendingPosts.mockResolvedValue([]);
    adapterStub.listFollowingPosts.mockResolvedValue([]);
    adapterStub.getUserFollowingSet.mockResolvedValue(new Set<string>());

    process.env.COSMOS_ENDPOINT = 'https://fallback';
    process.env.COSMOS_KEY = 'fallback-key';
    process.env.COSMOS_DATABASE = 'primary';
    process.env.COSMOS_POSTS_CONTAINER = 'posts';
    process.env.COSMOS_FOLLOWS_CONTAINER = 'follows';
    process.env.COSMOS_USERS_CONTAINER = 'users';

    const { buildPipeline } = await import('../pipeline');
    const ctx = { log: vi.fn() } as unknown as InvocationContext;
    buildPipeline(ctx);
    buildPipeline(ctx);

    expect(cosmosClientMock).toHaveBeenCalledTimes(1);
  });

  it('uses personalized candidate sources when mode is personalized', async () => {
    const followingCands = [makeCandidate({ id: 'follow-1' }), makeCandidate({ id: 'follow-2' })];
    const topical = [makeCandidate({ id: 'topic-1' })];
    adapterStub.listRecentPosts.mockResolvedValue([]);
    adapterStub.listTrendingPosts.mockResolvedValue(topical);
    adapterStub.listFollowingPosts.mockResolvedValue(followingCands);
    adapterStub.getUserFollowingSet.mockResolvedValue(new Set(['author-1']));

    process.env.COSMOS_DB_ENDPOINT = 'https://localhost';
    process.env.COSMOS_DB_KEY = 'key';
    process.env.COSMOS_DB_DATABASE = 'db';

    const { buildPipeline } = await import('../pipeline');
    const pipeline = buildPipeline({ log: vi.fn() } as unknown as InvocationContext);
    const context = makeContext({
      mode: 'personalized',
      pageSize: 5,
      hardFilters: { regions: ['US', 'CA'] },
    });

    const result = await pipeline.run('user-100', context);
    expect(adapterStub.listFollowingPosts).toHaveBeenCalledWith({ userId: 'user-100', limit: 25 });
    expect(adapterStub.listTrendingPosts).toHaveBeenCalledWith({
      limit: 25,
      regions: ['US', 'CA'],
    });
    expect(result.items.length).toBeLessThanOrEqual(context.pageSize);
  });
});
