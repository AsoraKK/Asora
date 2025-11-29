import type { InvocationContext } from '@azure/functions';
import { performance } from 'perf_hooks';

import type { FeedOptions, SqlParameter } from '@azure/cosmos';
import { HttpError } from '@shared/utils/errors';
import { withClient } from '@shared/clients/postgres';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { trackAppEvent, trackAppMetric } from '@shared/appInsights';
import type { ChaosContext } from '@shared/chaos/chaosConfig';
import { withCosmosChaos } from '@shared/chaos/chaosInjectors';
import type { Principal } from '@shared/middleware/auth';
import type { FeedCursor, FeedResult } from '@feed/types';
import { getBatchReputationScores } from '@shared/services/reputationService';
import {
  getRankingConfig,
  calculateRankingScore,
  type RankingConfig,
} from '@feed/ranking/rankingConfig';

type FeedMode = 'home' | 'public' | 'profile';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;
const MAX_AUTHOR_BATCH = 50;
const DEFAULT_CURSOR: FeedCursor = {
  ts: Number.MAX_SAFE_INTEGER,
  id: 'ffffffff-ffff-7fff-bfff-ffffffffffff',
};

const STATUS_PUBLISHED = 'published';
const VISIBILITY_PUBLIC = 'public';
const VISIBILITY_FOLLOWERS = 'followers';
const VISIBILITY_PRIVATE = 'private';

export interface GetFeedOptions {
  principal: Principal | null;
  context: InvocationContext;
  cursor?: string | null;
  since?: string | null;  // For forward pagination (fetch newer items)
  limit?: string | number | null;
  authorId?: string | null;
  chaosContext?: ChaosContext;
}

interface FeedModeResult {
  mode: FeedMode;
  authorIds: string[] | null;
  visibility: string[];
  authorCount: number;
}

interface QueryDefinition {
  query: string;
  parameters: SqlParameter[];
  partitionKey?: string;
  requiresCrossPartition: boolean;
}

export async function getFeed({
  principal,
  context,
  cursor,
  since,
  limit,
  authorId,
  chaosContext,
}: GetFeedOptions): Promise<FeedResult> {
  const start = performance.now();
  context.log('feed.get.start', {
    principal: principal ? 'user' : 'guest',
    cursor: Boolean(cursor),
    since: Boolean(since),
    requestedAuthor: authorId ?? 'none',
  });

  // Validate mutually exclusive parameters
  if (cursor && since) {
    throw new HttpError(400, 'Cannot use both cursor and since parameters');
  }

  const resolvedLimit = resolveLimit(limit);
  const cursorValue = cursor ? parseCursor(cursor) : null;
  const sinceValue = since ? parseSince(since) : null;
  const modeResult = await resolveFeedMode(principal, authorId, context);
  const queryDefinition = buildQuery(cursorValue, sinceValue, modeResult.authorIds, modeResult.visibility);
  const queryOptions = buildQueryOptions(
    resolvedLimit,
    queryDefinition.partitionKey
  );

  const container = getTargetDatabase().posts;
  const queryStart = performance.now();
  const response = await withCosmosChaos(
    chaosContext,
    () =>
      container.items
        .query({ query: queryDefinition.query, parameters: queryDefinition.parameters }, queryOptions)
        .fetchNext(),
    { operation: 'read' }
  );
  const { resources = [], continuationToken } = response;
  const ru = response.requestCharge;
  const queryMetrics = response.queryMetrics;
  const queryDuration = performance.now() - queryStart;

  // ─────────────────────────────────────────────────────────────────────────────
  // Reputation-Based Ranking
  // ─────────────────────────────────────────────────────────────────────────────
  const rankingConfig = getRankingConfig();
  const posts = resources as Record<string, unknown>[];
  
  let sortedItems: Record<string, unknown>[];
  let reputationLookup: Map<string, number> | null = null;

  if (rankingConfig.enabled && posts.length > 0) {
    // Batch fetch author reputations for ranking
    const authorIds = posts
      .map(p => String(p['authorId'] ?? ''))
      .filter(id => id.length > 0);
    
    const reputationStart = performance.now();
    reputationLookup = await getBatchReputationScores(authorIds, rankingConfig.defaultReputation);
    const reputationDuration = performance.now() - reputationStart;

    context.log('feed.ranking.reputations_fetched', {
      authorCount: authorIds.length,
      uniqueAuthors: reputationLookup.size,
      durationMs: reputationDuration.toFixed(2),
    });

    // Sort by combined ranking score (higher score = more visible)
    const now = Date.now();
    sortedItems = [...posts].sort((a, b) => 
      sortByRankingScore(a, b, reputationLookup!, now, rankingConfig)
    );
  } else {
    // Ranking disabled: fall back to pure recency sort
    sortedItems = [...posts].sort(sortDocuments);
  }

  const totalDuration = performance.now() - start;
  
  // For backward pagination (older items): lastItem gives nextCursor
  const lastItem = sortedItems[sortedItems.length - 1];
  const firstItem = sortedItems[0];
  
  // nextCursor: use to fetch older items (continue scrolling down)
  const nextCursor = lastItem
    ? encodeCursor({
        ts: extractTimestamp(lastItem['createdAt']),
        id: String(lastItem['id'] ?? ''),
      })
    : null;
  
  // sinceCursor: use to fetch newer items (refresh / pull-to-refresh)
  // Only provide if we have items and this isn't already a "since" query
  const sinceCursor = firstItem && !sinceValue
    ? encodeCursor({
        ts: extractTimestamp(firstItem['createdAt']),
        id: String(firstItem['id'] ?? ''),
      })
    : null;

  const authorCount = modeResult.authorCount;

  const telemetryProps = {
    'feed.type': modeResult.mode,
    'feed.cursor.present': Boolean(cursor),
    'feed.since.present': Boolean(since),
    'feed.authorSetSize': authorCount,
    'cosmos.continuation.present': Boolean(continuationToken),
    'feed.limit': resolvedLimit,
    'feed.ranking.enabled': rankingConfig.enabled,
    'feed.ranking.recencyWeight': rankingConfig.recencyWeight,
    'feed.ranking.reputationWeight': rankingConfig.reputationWeight,
  };

  trackAppMetric({
    name: 'cosmos_ru_feed_page',
    value: Number.isFinite(ru) ? ru : 0,
    properties: telemetryProps,
  });

  trackAppEvent({
    name: 'feed_page',
    properties: {
      ...telemetryProps,
      count: sortedItems.length,
      hasMore: Boolean(continuationToken) || Boolean(nextCursor),
    },
  });

  context.log('feed.get.complete', {
    feedType: modeResult.mode,
    durationMs: totalDuration.toFixed(2),
    queryDurationMs: queryDuration.toFixed(2),
    authorCount,
    items: sortedItems.length,
    continuationToken: Boolean(continuationToken),
    ru: Number.isFinite(ru) ? ru.toFixed(2) : '0',
  });

  return {
    body: {
      items: sortedItems,
      meta: {
        count: sortedItems.length,
        nextCursor,
        sinceCursor,  // For forward pagination (fetch newer)
        timingsMs: {
          query: Number(queryDuration.toFixed(2)),
          total: Number(totalDuration.toFixed(2)),
        },
        applied: {
          feedType: modeResult.mode,
          visibilityFilters: modeResult.visibility,
          authorCount,
          continuationToken,
        },
      },
    },
    headers: {
      'X-Feed-Limit': resolvedLimit.toString(),
      'X-Feed-Type': modeResult.mode,
      'X-Feed-Author-Count': authorCount.toString(),
      'X-Cosmos-RU': Number.isFinite(ru) ? ru.toFixed(2) : '0',
      'X-Cosmos-Query-Metrics': queryMetrics ?? '',
      'X-Cosmos-Continuation-Token': continuationToken ?? '',
      'X-Request-Duration': totalDuration.toFixed(2),
    },
  };
}

function resolveLimit(value?: string | number | null): number {
  const parsed =
    typeof value === 'string' ? Number.parseInt(value, 10) : Number(value ?? Number.NaN);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
}

export function parseCursor(cursor?: string | null): FeedCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
    const parsed = JSON.parse(decoded);
    const ts = Number(parsed?.ts);
    const id = typeof parsed?.id === 'string' ? parsed.id : '';
    if (!Number.isFinite(ts) || !id) {
      throw new Error('malformed cursor');
    }

    return { ts, id };
  } catch (error) {
    throw new HttpError(400, 'Invalid cursor');
  }
}

export function parseSince(since?: string | null): FeedCursor | null {
  if (!since) {
    return null;
  }

  try {
    const decoded = Buffer.from(since, 'base64url').toString('utf-8');
    const parsed = JSON.parse(decoded);
    const ts = Number(parsed?.ts);
    const id = typeof parsed?.id === 'string' ? parsed.id : '';
    if (!Number.isFinite(ts) || !id) {
      throw new Error('malformed since');
    }

    return { ts, id };
  } catch (error) {
    throw new HttpError(400, 'Invalid since parameter');
  }
}

export function encodeCursor(value: FeedCursor): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function resolveFeedMode(
  principal: Principal | null,
  requestedAuthor: string | null | undefined,
  context: InvocationContext
): Promise<FeedModeResult> {
  const normalizedAuthorId = requestedAuthor?.trim() || null;
  if (normalizedAuthorId) {
    const visibilitySet = new Set<string>([VISIBILITY_PUBLIC]);
    let showFollowers = false;
    let showPrivate = false;

    if (principal?.sub) {
      if (principal.sub === normalizedAuthorId) {
        showFollowers = true;
        showPrivate = true;
      } else {
        showFollowers = await isFollowing(principal.sub, normalizedAuthorId);
      }
    }

    if (showFollowers) {
      visibilitySet.add(VISIBILITY_FOLLOWERS);
    }
    if (showPrivate) {
      visibilitySet.add(VISIBILITY_PRIVATE);
    }

    return {
      mode: 'profile',
      authorIds: [normalizedAuthorId],
      visibility: Array.from(visibilitySet),
      authorCount: 1,
    };
  }

  if (!principal) {
    return {
      mode: 'public',
      authorIds: null,
      visibility: [VISIBILITY_PUBLIC],
      authorCount: 0,
    };
  }

  const authors = await fetchFollowees(principal.sub, context);
  if (!authors.length) {
    context.log('feed.home.no_authors', { principal: principal.sub });
    return {
      mode: 'public',
      authorIds: null,
      visibility: [VISIBILITY_PUBLIC],
      authorCount: 0,
    };
  }

  return {
    mode: 'home',
    authorIds: authors,
    visibility: [VISIBILITY_PUBLIC, VISIBILITY_FOLLOWERS],
    authorCount: authors.length,
  };
}

async function fetchFollowees(principalId: string, context: InvocationContext): Promise<string[]> {
  try {
    const rows = await withClient(async client =>
      client.query({
        text: 'SELECT followee_uuid FROM follows WHERE follower_uuid = $1 ORDER BY created_at DESC LIMIT $2',
        values: [principalId, MAX_AUTHOR_BATCH],
      })
    );

    const authors: string[] = [];
    const seen = new Set<string>();

    const add = (id?: string | null) => {
      if (!id) {
        return;
      }
      if (seen.has(id)) {
        return;
      }
      seen.add(id);
      authors.push(id);
    };

    add(principalId);
    for (const row of rows.rows ?? []) {
      add(row?.followee_uuid);
      if (authors.length >= MAX_AUTHOR_BATCH) {
        break;
      }
    }

    return authors;
  } catch (error) {
    context.log('feed.followees.error', error);
    return [];
  }
}

async function isFollowing(followerId: string, followeeId: string): Promise<boolean> {
  try {
    return await withClient(async client => {
      const result = await client.query({
        text: 'SELECT 1 FROM follows WHERE follower_uuid = $1 AND followee_uuid = $2 LIMIT 1',
        values: [followerId, followeeId],
      });
      return (result.rowCount ?? 0) > 0;
    });
  } catch {
    return false;
  }
}

function buildQuery(
  cursor: FeedCursor | null,
  since: FeedCursor | null,
  authorIds: string[] | null,
  visibility: string[]
): QueryDefinition {
  const parameters: SqlParameter[] = [
    { name: '@status', value: STATUS_PUBLISHED },
  ];

  const clauses: string[] = [
    'c.status = @status',
    // Filter out comments (they have type='comment', posts have no type or type='post')
    '(NOT IS_DEFINED(c.type) OR c.type = "post")',
  ];

  // Cursor-based pagination (backward: fetch older items)
  if (cursor) {
    parameters.push(
      { name: '@cursorTs', value: cursor.ts },
      { name: '@cursorId', value: cursor.id }
    );
    clauses.push('(c.createdAt < @cursorTs OR (c.createdAt = @cursorTs AND c.id < @cursorId))');
  } else if (since) {
    // "Since" pagination (forward: fetch newer items)
    parameters.push(
      { name: '@sinceTs', value: since.ts },
      { name: '@sinceId', value: since.id }
    );
    clauses.push('(c.createdAt > @sinceTs OR (c.createdAt = @sinceTs AND c.id > @sinceId))');
  }
  // If neither cursor nor since, fetch from newest (no time constraint needed)

  appendVisibilityClauses(visibility, parameters, clauses);

  let partitionKey: string | undefined;
  let requiresCrossPartition = false;

  if (authorIds && authorIds.length === 1) {
    const authorId = authorIds[0]!; // Length checked
    clauses.push('c.authorId = @authorId');
    parameters.push({ name: '@authorId', value: authorId });
    partitionKey = authorId;
  } else if (authorIds && authorIds.length > 1) {
    clauses.push('ARRAY_CONTAINS(@authorIds, c.authorId)');
    parameters.push({ name: '@authorIds', value: authorIds });
    requiresCrossPartition = true;
  } else {
    requiresCrossPartition = true;
  }

  const query = `
    SELECT c.*
    FROM c
    WHERE ${clauses.join(' AND ')}
    ORDER BY c.createdAt DESC, c.id DESC
  `;

  return { query, parameters, partitionKey, requiresCrossPartition };
}

function appendVisibilityClauses(
  visibility: string[],
  parameters: SqlParameter[],
  clauses: string[]
): void {
  const unique = Array.from(new Set(visibility));
  if (!unique.length) {
    return;
  }

  if (unique.length === 1) {
    clauses.push('c.visibility = @visibility0');
    parameters.push({ name: '@visibility0', value: unique[0]! }); // Length checked
    return;
  }

  const placeholders = unique.map((_, index) => `@visibility${index}`);
  clauses.push(`c.visibility IN (${placeholders.join(', ')})`);
  unique.forEach((value, index) => {
    parameters.push({ name: `@visibility${index}`, value });
  });
}

function buildQueryOptions(
  limit: number,
  partitionKey?: string
): FeedOptions {
  const options: FeedOptions = {
    maxItemCount: limit,
    populateQueryMetrics: true,
  };

  if (partitionKey) {
    options.partitionKey = partitionKey;
  }
  // Cross-partition queries are automatically enabled in Cosmos SDK v4 when partitionKey is not set

  return options;
}

function sortDocuments(a: Record<string, unknown>, b: Record<string, unknown>): number {
  const aTs = extractTimestamp(a['createdAt']);
  const bTs = extractTimestamp(b['createdAt']);

  if (aTs !== bTs) {
    return bTs - aTs;
  }

  const aId = String(a['id'] ?? '');
  const bId = String(b['id'] ?? '');
  if (aId === bId) {
    return 0;
  }

  return aId < bId ? 1 : -1;
}

function extractTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

/**
 * Sort posts by combined ranking score (reputation + recency).
 *
 * Algorithm:
 *   score = (recencyWeight * recencyScore) + (reputationWeight * reputationScore)
 *
 * Higher scores appear first. On tie, newer post wins. On same timestamp, higher ID wins.
 */
function sortByRankingScore(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  reputationLookup: Map<string, number>,
  now: number,
  config: RankingConfig
): number {
  const aTs = extractTimestamp(a['createdAt']);
  const bTs = extractTimestamp(b['createdAt']);
  const aAuthorId = String(a['authorId'] ?? '');
  const bAuthorId = String(b['authorId'] ?? '');
  const aRep = reputationLookup.get(aAuthorId) ?? config.defaultReputation;
  const bRep = reputationLookup.get(bAuthorId) ?? config.defaultReputation;

  const aScore = calculateRankingScore(aTs, aRep, now, config);
  const bScore = calculateRankingScore(bTs, bRep, now, config);

  // Higher score first
  if (aScore !== bScore) {
    return bScore - aScore;
  }

  // Tie-breaker 1: Newer post first
  if (aTs !== bTs) {
    return bTs - aTs;
  }

  // Tie-breaker 2: ID comparison (deterministic ordering)
  const aId = String(a['id'] ?? '');
  const bId = String(b['id'] ?? '');
  if (aId === bId) {
    return 0;
  }
  return aId < bId ? 1 : -1;
}
