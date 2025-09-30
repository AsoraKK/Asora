import { CosmosClient, SqlQuerySpec, SqlParameter } from "@azure/cosmos";
import { Candidate, AuthorSignals } from "../types";

interface ContainersConfig {
  posts: string;
  follows: string;
  users: string;
}

export class CosmosAdapter {
  constructor(
    private readonly client: CosmosClient,
    private readonly dbName: string,
    private readonly containers: ContainersConfig
  ) {}

  private posts() {
    return this.client.database(this.dbName).container(this.containers.posts);
  }

  private follows() {
    return this.client.database(this.dbName).container(this.containers.follows);
  }

  private users() {
    return this.client.database(this.dbName).container(this.containers.users);
  }

  async listRecentPosts({ limit, regions }: { limit: number; regions?: string[] }): Promise<Candidate[]> {
    const filters: string[] = [];
    const parameters: SqlParameter[] = [{ name: "@limit", value: limit }];
    if (regions && regions.length) {
      filters.push("ARRAY_CONTAINS(@regions, c.region)");
      parameters.push({ name: "@regions", value: regions });
    }
    const query: SqlQuerySpec = {
      query: `SELECT TOP @limit c.id, c.authorId, c.createdAt, c.region, c.topics, c.keywords, c.stats, c.aiHumanScore, c.aiLabeled
              FROM c ${filters.length ? "WHERE " + filters.join(" AND ") : ""}
              ORDER BY c.createdAt DESC`,
      parameters,
    };
    const { resources } = await this.posts().items.query(query).fetchAll();
    return this.enrichAuthors(resources);
  }

  async listTrendingPosts({ limit, regions }: { limit: number; regions?: string[] }): Promise<Candidate[]> {
    const filters: string[] = [];
    const parameters: SqlParameter[] = [{ name: "@limit", value: limit }];
    if (regions && regions.length) {
      filters.push("ARRAY_CONTAINS(@regions, c.region)");
      parameters.push({ name: "@regions", value: regions });
    }
    const query: SqlQuerySpec = {
      query: `SELECT TOP @limit c.id, c.authorId, c.createdAt, c.region, c.topics, c.keywords, c.stats, c.aiHumanScore, c.aiLabeled
              FROM c ${filters.length ? "WHERE " + filters.join(" AND ") : ""}
              ORDER BY (c.stats.likes*1 + c.stats.replies*2 + c.stats.reshares*1.5) DESC, c.createdAt DESC`,
      parameters,
    };
    const { resources } = await this.posts().items.query(query).fetchAll();
    return this.enrichAuthors(resources);
  }

  async listFollowingPosts({ userId, limit }: { userId: string; limit: number }): Promise<Candidate[]> {
    const { resources: follows } = await this.follows()
      .items.query<{ authorId: string }>({
        query: "SELECT f.authorId FROM f WHERE f.userId = @uid",
        parameters: [{ name: "@uid", value: userId }],
      })
      .fetchAll();

    const authorIds = follows.map((f) => f.authorId).slice(0, 100);
    if (authorIds.length === 0) return [];

    const { resources } = await this.posts()
      .items.query({
        query:
          "SELECT TOP @limit c.id, c.authorId, c.createdAt, c.region, c.topics, c.keywords, c.stats, c.aiHumanScore, c.aiLabeled FROM c WHERE ARRAY_CONTAINS(@authors, c.authorId) ORDER BY c.createdAt DESC",
        parameters: [
          { name: "@limit", value: limit },
          { name: "@authors", value: authorIds },
        ],
      })
      .fetchAll();

    return this.enrichAuthors(resources);
  }

  async getUserFollowingSet({ userId }: { userId: string }): Promise<Set<string>> {
    const { resources } = await this.follows()
      .items.query<{ authorId: string }>({
        query: "SELECT f.authorId FROM f WHERE f.userId = @uid",
        parameters: [{ name: "@uid", value: userId }],
      })
      .fetchAll();
    return new Set(resources.map((r) => r.authorId));
  }

  private async enrichAuthors(posts: any[]): Promise<Candidate[]> {
    const authorIds = Array.from(new Set(posts.map((p) => p.authorId))).slice(0, 100);
    const signalsMap = new Map<string, AuthorSignals>();

    if (authorIds.length) {
      const { resources } = await this.users()
        .items.query({
          query: "SELECT u.id, u.reputationLevel, u.consistency FROM u WHERE ARRAY_CONTAINS(@ids, u.id)",
          parameters: [{ name: "@ids", value: authorIds }],
        })
        .fetchAll();

      for (const u of resources as Array<{ id: string; reputationLevel?: number; consistency?: number }>) {
        signalsMap.set(u.id, {
          authorId: u.id,
          reputationLevel: Math.min(5, Math.max(1, u.reputationLevel ?? 1)) as AuthorSignals["reputationLevel"],
          consistency: Math.max(0, Math.min(1, u.consistency ?? 0.5)),
        });
      }
    }

    return posts.map((p) => ({
      ...p,
      author: signalsMap.get(p.authorId) ?? {
        authorId: p.authorId,
        reputationLevel: 1,
        consistency: 0.5,
      },
    }));
  }
}
