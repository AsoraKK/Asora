import { Candidate, FeedContext } from './types';

export interface CandidateSourcePort {
  fetchDiscovery(userId: string, ctx: FeedContext): Promise<Candidate[]>;
  fetchPersonalized(userId: string, ctx: FeedContext): Promise<Candidate[]>;
}

export class CandidateSource implements CandidateSourcePort {
  constructor(
    private readonly deps: {
      getRecentPosts: (args: { limit: number; regions?: string[] }) => Promise<Candidate[]>;
      getTrendingPosts: (args: { limit: number; regions?: string[] }) => Promise<Candidate[]>;
      getFollowingPosts: (args: { userId: string; limit: number }) => Promise<Candidate[]>;
    }
  ) {}

  async fetchDiscovery(userId: string, ctx: FeedContext): Promise<Candidate[]> {
    const limit = ctx.pageSize * 5; // overfetch for ranking/fairness
    const local = ctx.region
      ? await this.deps.getRecentPosts({ limit, regions: [ctx.region] })
      : [];
    const global = await this.deps.getTrendingPosts({ limit });
    return [...local, ...global];
  }

  async fetchPersonalized(userId: string, ctx: FeedContext): Promise<Candidate[]> {
    const limit = ctx.pageSize * 5;
    const following = await this.deps.getFollowingPosts({ userId, limit });
    const topical = await this.deps.getTrendingPosts({ limit, regions: ctx.hardFilters.regions });
    return [...following, ...topical];
  }
}
