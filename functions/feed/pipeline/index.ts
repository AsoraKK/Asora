import { InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { CandidateSource } from './candidateSource';
import { Filter } from './filter';
import { Ranker } from './ranker';
import { FairnessPolicy } from './fairness';
import { Mixer } from './mixer';
import { FeedContext, FeedResult } from './types';
import { CosmosAdapter } from './adapters/cosmos';
import { loadDynamicConfig } from './config';

let sharedCosmosClient: CosmosClient | undefined;

function getCosmosClient(): CosmosClient {
  if (!sharedCosmosClient) {
    const endpoint = process.env.COSMOS_DB_ENDPOINT ?? process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY ?? process.env.COSMOS_KEY;
    if (!endpoint || !key) {
      throw new Error(
        'COSMOS_DB_ENDPOINT/COSMOS_ENDPOINT and COSMOS_DB_KEY/COSMOS_KEY must be configured'
      );
    }
    sharedCosmosClient = new CosmosClient({ endpoint, key });
  }
  return sharedCosmosClient;
}

export function buildPipeline(ctx: InvocationContext) {
  const database = process.env.COSMOS_DB_DATABASE ?? process.env.COSMOS_DATABASE;
  if (!database) {
    throw new Error('COSMOS_DB_DATABASE or COSMOS_DATABASE must be configured');
  }

  const adapter = new CosmosAdapter(getCosmosClient(), database, {
    posts: process.env.COSMOS_CONTAINER_POSTS ?? process.env.COSMOS_POSTS_CONTAINER ?? 'posts',
    follows:
      process.env.COSMOS_CONTAINER_FOLLOWS ?? process.env.COSMOS_FOLLOWS_CONTAINER ?? 'follows',
    users: process.env.COSMOS_CONTAINER_USERS ?? process.env.COSMOS_USERS_CONTAINER ?? 'users',
  });

  const source = new CandidateSource({
    getRecentPosts: args => adapter.listRecentPosts(args),
    getTrendingPosts: args => adapter.listTrendingPosts(args),
    getFollowingPosts: args => adapter.listFollowingPosts(args),
  });
  const filter = new Filter();
  const ranker = new Ranker();
  const fairness = new FairnessPolicy();
  const mixer = new Mixer();

  return {
    run: async (userId: string, context: FeedContext): Promise<FeedResult> => {
      await loadDynamicConfig();
      const t0 = Date.now();

      const cStart = Date.now();
      const cands =
        context.mode === 'personalized'
          ? await source.fetchPersonalized(userId, context)
          : await source.fetchDiscovery(userId, context);
      const tCand = Date.now() - cStart;

      const fStart = Date.now();
      const followingSet = await adapter.getUserFollowingSet({ userId });
      const filtered = filter.apply(cands, context, followingSet);
      const tFilt = Date.now() - fStart;

      const rStart = Date.now();
      const ranked = ranker.scoreAll(filtered, context);
      const tRank = Date.now() - rStart;

      const qStart = Date.now();
      const fair = fairness.apply(ranked, context.pageSize);
      const tFair = Date.now() - qStart;

      const mStart = Date.now();
      const mixed = mixer.apply(fair, context).slice(0, context.pageSize);
      const tMix = Date.now() - mStart;

      const timings = {
        candidatesMs: tCand,
        filtersMs: tFilt,
        rankMs: tRank,
        fairnessMs: tFair,
        mixMs: tMix,
        totalMs: Date.now() - t0,
      };
      ctx.log('feed timings', timings);

      return { items: mixed, timingsMs: timings, meta: { mode: context.mode } };
    },
  };
}
