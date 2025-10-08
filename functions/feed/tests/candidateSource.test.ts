import { describe, expect, it, beforeEach, vi } from 'vitest';
import { CandidateSource } from '../pipeline/candidateSource';
import { makeCandidate, makeContext } from './testUtils';

describe('CandidateSource', () => {
  const recent = vi.fn();
  const trending = vi.fn();
  const following = vi.fn();

  beforeEach(() => {
    recent.mockReset();
    trending.mockReset();
    following.mockReset();
  });

  it('fetchDiscovery mixes local and global posts when region is provided', async () => {
    const localCandidates = [makeCandidate({ id: 'local-1' })];
    const globalCandidates = [makeCandidate({ id: 'global-1' })];
    recent.mockResolvedValue(localCandidates);
    trending.mockResolvedValue(globalCandidates);

    const source = new CandidateSource({
      getRecentPosts: recent,
      getTrendingPosts: trending,
      getFollowingPosts: following,
    });

    const ctx = makeContext({ mode: 'discovery', pageSize: 2, region: 'US' });
    const result = await source.fetchDiscovery('user-1', ctx);

    expect(recent).toHaveBeenCalledWith({ limit: 10, regions: ['US'] });
    expect(trending).toHaveBeenCalledWith({ limit: 10 });
    expect(result.map(c => c.id)).toEqual(['local-1', 'global-1']);
  });

  it('fetchDiscovery skips local call when region is undefined', async () => {
    trending.mockResolvedValue([makeCandidate({ id: 't-1' })]);

    const source = new CandidateSource({
      getRecentPosts: recent,
      getTrendingPosts: trending,
      getFollowingPosts: following,
    });

    const ctx = makeContext({ mode: 'discovery', pageSize: 3, region: undefined });
    const result = await source.fetchDiscovery('user-2', ctx);

    expect(recent).not.toHaveBeenCalled();
    expect(trending).toHaveBeenCalledWith({ limit: 15 });
    expect(result.length).toBe(1);
  });

  it('fetchPersonalized pulls following and topical candidates', async () => {
    const follows = [makeCandidate({ id: 'follow-1' })];
    const topical = [makeCandidate({ id: 'topic-1' })];
    following.mockResolvedValue(follows);
    trending.mockResolvedValue(topical);

    const source = new CandidateSource({
      getRecentPosts: recent,
      getTrendingPosts: trending,
      getFollowingPosts: following,
    });

    const ctx = makeContext({
      mode: 'personalized',
      pageSize: 4,
      hardFilters: { regions: ['US', 'CA'] },
    });

    const result = await source.fetchPersonalized('user-3', ctx);

    expect(following).toHaveBeenCalledWith({ userId: 'user-3', limit: 20 });
    expect(trending).toHaveBeenCalledWith({ limit: 20, regions: ['US', 'CA'] });
    expect(result.map(c => c.id)).toEqual(['follow-1', 'topic-1']);
  });
});
