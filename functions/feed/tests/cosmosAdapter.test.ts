import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CosmosAdapter } from '../pipeline/adapters/cosmos';

interface ContainerMocks {
  query: ReturnType<typeof vi.fn>;
  fetchAll: ReturnType<typeof vi.fn>;
}

function makeContainer(): { items: { query: ContainerMocks['query'] } } & ContainerMocks {
  const fetchAll = vi.fn();
  const query = vi.fn(() => ({ fetchAll }));
  return { items: { query }, query, fetchAll } as any;
}

function createAdapter() {
  const posts = makeContainer();
  const follows = makeContainer();
  const users = makeContainer();

  const containerMap: Record<string, any> = { posts, follows, users };

  const client = {
    database: vi.fn(() => ({
      container: (name: string) => containerMap[name],
    })),
  } as any;

  const adapter = new CosmosAdapter(client, 'db', {
    posts: 'posts',
    follows: 'follows',
    users: 'users',
  });

  return { adapter, posts, follows, users };
}

describe('CosmosAdapter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('includes region filter when provided', async () => {
    const { adapter, posts, users } = createAdapter();
    posts.fetchAll.mockResolvedValue({ resources: [] });
    users.fetchAll.mockResolvedValue({ resources: [] });

    await adapter.listRecentPosts({ limit: 5, regions: ['US'] });

    expect(posts.query).toHaveBeenCalledTimes(1);
    const call = posts.query.mock.calls[0][0];
    expect(call.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '@regions', value: ['US'] })])
    );
    expect(call.query).toContain('ARRAY_CONTAINS(@regions, c.region)');
  });

  it('applies region filter for trending posts', async () => {
    const { adapter, posts, users } = createAdapter();
    posts.fetchAll.mockResolvedValue({ resources: [] });
    users.fetchAll.mockResolvedValue({ resources: [] });

    await adapter.listTrendingPosts({ limit: 8, regions: ['ZA', 'NG'] });

    const call = posts.query.mock.calls[0][0];
    expect(call.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '@regions', value: ['ZA', 'NG'] })])
    );
    expect(call.query).toContain('ARRAY_CONTAINS(@regions, c.region)');
  });

  it('omits region filter when none provided', async () => {
    const { adapter, posts, users } = createAdapter();
    posts.fetchAll.mockResolvedValue({ resources: [] });
    users.fetchAll.mockResolvedValue({ resources: [] });

    await adapter.listRecentPosts({ limit: 7 });

    expect(posts.query).toHaveBeenCalledTimes(1);
    const call = posts.query.mock.calls[0][0];
    expect(call.query).not.toContain('ARRAY_CONTAINS(@regions');
    expect(call.parameters).toEqual([expect.objectContaining({ name: '@limit', value: 7 })]);
  });

  it('ignores empty regions array', async () => {
    const { adapter, posts, users } = createAdapter();
    posts.fetchAll.mockResolvedValue({ resources: [] });
    users.fetchAll.mockResolvedValue({ resources: [] });

    await adapter.listRecentPosts({ limit: 4, regions: [] });

    const call = posts.query.mock.calls[0][0];
    expect(call.query).not.toContain('ARRAY_CONTAINS(@regions');
    expect(call.parameters).toEqual([expect.objectContaining({ name: '@limit', value: 4 })]);
  });

  it('defaults author signals when user document missing', async () => {
    const { adapter, posts, users } = createAdapter();
    posts.fetchAll.mockResolvedValue({
      resources: [
        {
          id: 'p1',
          authorId: 'a1',
          createdAt: '2024-01-01',
          stats: { likes: 0, replies: 0, reshares: 0 },
          aiHumanScore: 1,
          aiLabeled: false,
        },
      ],
    });
    users.fetchAll.mockResolvedValue({ resources: [] });

    const result = await adapter.listTrendingPosts({ limit: 5 });
    expect(result[0].author).toMatchObject({ reputationLevel: 1, consistency: 0.5 });
  });

  it('clamps author signals when present', async () => {
    const { adapter, posts, users } = createAdapter();
    posts.fetchAll.mockResolvedValue({
      resources: [
        {
          id: 'p1',
          authorId: 'a1',
          createdAt: '2024-01-01',
          stats: { likes: 0, replies: 0, reshares: 0 },
          aiHumanScore: 1,
          aiLabeled: false,
        },
      ],
    });
    users.fetchAll.mockResolvedValue({
      resources: [{ id: 'a1', reputationLevel: 99, consistency: 2 }],
    });

    const result = await adapter.listRecentPosts({ limit: 5 });
    expect(result[0].author).toMatchObject({ reputationLevel: 5, consistency: 1 });
  });

  it('clamps author signals to minimum values', async () => {
    const { adapter, posts, users } = createAdapter();
    posts.fetchAll.mockResolvedValue({
      resources: [
        {
          id: 'p1',
          authorId: 'a1',
          createdAt: '2024-01-01',
          stats: { likes: 0, replies: 0, reshares: 0 },
          aiHumanScore: 1,
          aiLabeled: false,
        },
      ],
    });
    users.fetchAll.mockResolvedValue({
      resources: [{ id: 'a1', reputationLevel: 0, consistency: -0.5 }],
    });

    const result = await adapter.listRecentPosts({ limit: 5 });
    expect(result[0].author).toMatchObject({ reputationLevel: 1, consistency: 0 });
  });

  it('fills in defaults when reputation or consistency are undefined', async () => {
    const { adapter, posts, users } = createAdapter();
    posts.fetchAll.mockResolvedValue({
      resources: [
        {
          id: 'p1',
          authorId: 'a1',
          createdAt: '2024-01-01',
          stats: { likes: 0, replies: 0, reshares: 0 },
          aiHumanScore: 1,
          aiLabeled: false,
        },
      ],
    });
    users.fetchAll.mockResolvedValue({
      resources: [{ id: 'a1' as const }],
    });

    const result = await adapter.listRecentPosts({ limit: 5 });
    expect(result[0].author).toMatchObject({ reputationLevel: 1, consistency: 0.5 });
  });

  it('returns empty list when no follows', async () => {
    const { adapter, posts, follows, users } = createAdapter();
    follows.fetchAll.mockResolvedValue({ resources: [] });
    posts.fetchAll.mockResolvedValue({ resources: [] });
    users.fetchAll.mockResolvedValue({ resources: [] });

    const result = await adapter.listFollowingPosts({ userId: 'u1', limit: 5 });
    expect(result).toEqual([]);
    expect(posts.query).not.toHaveBeenCalled();
  });

  it('swallows errors and returns []', async () => {
    const { adapter, posts } = createAdapter();
    posts.fetchAll.mockRejectedValue(new Error('boom'));

    const recent = await adapter.listRecentPosts({ limit: 5 });
    const trending = await adapter.listTrendingPosts({ limit: 5 });

    expect(recent).toEqual([]);
    expect(trending).toEqual([]);
  });

  it('fetches following posts and enriches authors', async () => {
    const { adapter, posts, follows, users } = createAdapter();
    follows.fetchAll.mockResolvedValue({ resources: [{ authorId: 'a1' }, { authorId: 'a2' }] });
    posts.fetchAll.mockResolvedValue({
      resources: [
        {
          id: 'p1',
          authorId: 'a1',
          createdAt: '2024-01-01',
          stats: { likes: 1, replies: 0, reshares: 0 },
          aiHumanScore: 1,
          aiLabeled: false,
        },
      ],
    });
    users.fetchAll.mockResolvedValue({
      resources: [{ id: 'a1', reputationLevel: 3, consistency: 0.3 }],
    });

    const result = await adapter.listFollowingPosts({ userId: 'user', limit: 10 });

    expect(posts.query).toHaveBeenCalledTimes(1);
    const query = posts.query.mock.calls[0][0];
    expect(query.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '@limit', value: 10 })])
    );
    expect(result[0].author).toMatchObject({ reputationLevel: 3, consistency: 0.3 });
  });

  it('returns empty list when following query throws', async () => {
    const { adapter, follows } = createAdapter();
    follows.fetchAll.mockRejectedValue(new Error('boom'));

    const result = await adapter.listFollowingPosts({ userId: 'user', limit: 10 });

    expect(result).toEqual([]);
  });

  it('returns empty list when following posts query fails', async () => {
    const { adapter, posts, follows } = createAdapter();
    follows.fetchAll.mockResolvedValue({ resources: [{ authorId: 'a1' }] });
    posts.fetchAll.mockRejectedValue(new Error('fail'));

    const result = await adapter.listFollowingPosts({ userId: 'user', limit: 10 });
    expect(result).toEqual([]);
  });

  it('returns empty following set on query failure', async () => {
    const { adapter, follows } = createAdapter();
    follows.fetchAll.mockRejectedValue(new Error('fail'));

    const set = await adapter.getUserFollowingSet({ userId: 'user' });
    expect(set.size).toBe(0);
  });

  it('returns following set when query succeeds', async () => {
    const { adapter, follows } = createAdapter();
    follows.fetchAll.mockResolvedValue({ resources: [{ authorId: 'a1' }, { authorId: 'a2' }] });

    const set = await adapter.getUserFollowingSet({ userId: 'user' });
    expect(set).toEqual(new Set(['a1', 'a2']));
  });

  it('falls back to defaults when user lookup throws', async () => {
    const { adapter, posts, users } = createAdapter();
    posts.fetchAll.mockResolvedValue({
      resources: [
        {
          id: 'p1',
          authorId: 'a1',
          createdAt: '2024-01-01',
          stats: { likes: 1, replies: 1, reshares: 0 },
          aiHumanScore: 1,
          aiLabeled: false,
        },
      ],
    });
    users.fetchAll.mockRejectedValue(new Error('boom'));

    const result = await adapter.listRecentPosts({ limit: 5 });
    expect(result[0].author).toMatchObject({ reputationLevel: 1, consistency: 0.5 });
  });
});
