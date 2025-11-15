import type { InvocationContext } from '@azure/functions';
import { performance } from 'perf_hooks';

import type { FeedOptions, SqlParameter } from '@azure/cosmos';
import { HttpError } from '@shared/utils/errors';
import { withClient } from '@shared/clients/postgres';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { trackAppEvent, trackAppMetric } from '@shared/appInsights';
import type { Principal } from '@shared/middleware/auth';
import type { FeedCursor, FeedResult } from '@feed/types';

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
  limit?: string | number | null;
  authorId?: string | null;
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
  limit,
  authorId,
}: GetFeedOptions): Promise<FeedResult> {
  const start = performance.now();
  context.log('feed.get.start', {
    principal: principal ? 'user' : 'guest',
    cursor: Boolean(cursor),
    requestedAuthor: authorId ?? 'none',
  });

  const resolvedLimit = resolveLimit(limit);
  const cursorValue = parseCursor(cursor);
  const modeResult = await resolveFeedMode(principal, authorId, context);
  const queryDefinition = buildQuery(cursorValue, modeResult.authorIds, modeResult.visibility);
  const queryOptions = buildQueryOptions(
    resolvedLimit,
    queryDefinition.partitionKey
  );

  const container = getTargetDatabase().posts;
  const queryStart = performance.now();
  const response = await container.items
    .query({ query: queryDefinition.query, parameters: queryDefinition.parameters }, queryOptions)
    .fetchNext();
  const { resources = [], continuationToken } = response;
  const ru = response.requestCharge;
  const queryMetrics = response.queryMetrics;
  const queryDuration = performance.now() - queryStart;
  const totalDuration = performance.now() - start;

  const sortedItems = [...(resources as Record<string, unknown>[])].sort(sortDocuments);
  const lastItem = sortedItems[sortedItems.length - 1];
  const nextCursor = lastItem
    ? encodeCursor({
        ts: extractTimestamp(lastItem['createdAt']),
        id: String(lastItem['id'] ?? ''),
      })
    : null;

  const authorCount = modeResult.authorCount;

  const telemetryProps = {
    'feed.type': modeResult.mode,
    'feed.cursor.present': Boolean(cursor),
    'feed.authorSetSize': authorCount,
    'cosmos.continuation.present': Boolean(continuationToken),
    'feed.limit': resolvedLimit,
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
      hasMore: Boolean(continuationToken),
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

export function parseCursor(cursor?: string | null): FeedCursor {
  if (!cursor) {
    return DEFAULT_CURSOR;
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
  cursor: FeedCursor,
  authorIds: string[] | null,
  visibility: string[]
): QueryDefinition {
  const parameters: SqlParameter[] = [
    { name: '@cursorTs', value: cursor.ts },
    { name: '@cursorId', value: cursor.id },
    { name: '@status', value: STATUS_PUBLISHED },
  ];

  const clauses = [
    '(c.createdAt < @cursorTs OR (c.createdAt = @cursorTs AND c.id < @cursorId))',
    'c.status = @status',
  ];

  appendVisibilityClauses(visibility, parameters, clauses);

  let partitionKey: string | undefined;
  let requiresCrossPartition = false;

  if (authorIds && authorIds.length === 1) {
    clauses.push('c.authorId = @authorId');
    parameters.push({ name: '@authorId', value: authorIds[0] });
    partitionKey = authorIds[0];
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
    parameters.push({ name: '@visibility0', value: unique[0] });
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
