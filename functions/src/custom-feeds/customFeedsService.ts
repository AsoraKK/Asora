import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import { HttpError, notFoundError } from '@shared/utils/errors';
import { normalizeTier } from '@shared/services/tierLimits';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { postsService } from '@posts/service/postsService';
import type {
  CreateCustomFeedRequest,
  CustomFeedDefinition,
  CursorPaginatedPostView,
} from '@shared/types/openapi';

const DEFAULT_FEED_LIMIT = 20;
const MAX_FEED_LIMIT = 50;

const TIER_CUSTOM_FEED_LIMITS: Record<'free' | 'premium' | 'black' | 'admin', number> = {
  free: 1,
  premium: 2,
  black: 5,
  admin: 20,
};

const DEFAULT_CURSOR = {
  ts: Number.MAX_SAFE_INTEGER,
  id: 'ffffffff-ffff-7fff-bfff-ffffffffffff',
};

type CustomFeedDocument = Omit<CustomFeedDefinition, 'createdAt' | 'updatedAt'> & {
  partitionKey: string;
  createdAt: number;
  updatedAt: number;
};

type FeedCursor = {
  ts: number;
  id: string;
};

type PostDocumentInput = Parameters<typeof postsService.enrichPost>[0];

function clampLimit(value?: number): number {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_FEED_LIMIT;
  }

  return Math.max(1, Math.min(value, MAX_FEED_LIMIT));
}

function normalizeKeywords(keywords?: string[]): string[] {
  return (
    keywords
      ?.map((keyword) => keyword?.trim()?.toLowerCase())
      .filter(Boolean)
      ?.filter((keyword, index, arr) => arr.indexOf(keyword) === index) ?? []
  );
}

function encodeCursor(payload: FeedCursor): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(cursor?: string): FeedCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
    return {
      ts: typeof decoded.ts === 'number' ? decoded.ts : DEFAULT_CURSOR.ts,
      id: typeof decoded.id === 'string' ? decoded.id : DEFAULT_CURSOR.id,
    };
  } catch {
    return null;
  }
}

function mapToDefinition(doc: CustomFeedDocument): CustomFeedDefinition {
  return {
    id: doc.id,
    ownerId: doc.ownerId,
    name: doc.name,
    contentType: doc.contentType,
    sorting: doc.sorting,
    includeKeywords: doc.includeKeywords,
    excludeKeywords: doc.excludeKeywords,
    includeAccounts: doc.includeAccounts,
    excludeAccounts: doc.excludeAccounts,
    isHome: doc.isHome,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

function getFeedLimitForTier(tier?: string): number {
  const normalized = normalizeTier(tier);
  return TIER_CUSTOM_FEED_LIMITS[normalized] ?? TIER_CUSTOM_FEED_LIMITS.free;
}

async function getCustomFeedsContainer() {
  return getTargetDatabase().customFeeds;
}

export async function countCustomFeeds(ownerId: string): Promise<number> {
  const container = await getCustomFeedsContainer();
  const { resources } = await container.items
    .query(
      {
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.ownerId = @ownerId',
        parameters: [{ name: '@ownerId', value: ownerId }],
      },
      { partitionKey: ownerId }
    )
    .fetchAll();

  const count = resources?.[0];
  return typeof count === 'number' ? count : 0;
}

export async function createCustomFeed(
  ownerId: string,
  payload: CreateCustomFeedRequest,
  tier?: string
): Promise<CustomFeedDefinition> {
  const limit = getFeedLimitForTier(tier);
  const existingCount = await countCustomFeeds(ownerId);

  if (existingCount >= limit) {
    throw new HttpError(403, 'Custom feed limit reached for your tier');
  }

  const now = Date.now();
  const doc: CustomFeedDocument = {
    id: `custom::${crypto.randomUUID()}`,
    ownerId,
    partitionKey: ownerId,
    name: payload.name,
    contentType: payload.contentType,
    sorting: payload.sorting,
    includeKeywords: normalizeKeywords(payload.includeKeywords),
    excludeKeywords: normalizeKeywords(payload.excludeKeywords),
    includeAccounts: Array.from(new Set((payload.includeAccounts ?? []).filter(Boolean))),
    excludeAccounts: Array.from(new Set((payload.excludeAccounts ?? []).filter(Boolean))),
    isHome: payload.isHome ?? false,
    createdAt: now,
    updatedAt: now,
  };

  const container = await getCustomFeedsContainer();
  await container.items.create(doc);

  return mapToDefinition(doc);
}

async function readCustomFeedDocument(ownerId: string, feedId: string): Promise<CustomFeedDocument | null> {
  const container = await getCustomFeedsContainer();

  try {
    const { resource } = await container.item(feedId, ownerId).read<CustomFeedDocument>();
    return resource ?? null;
  } catch (error) {
    const err = error as any;
    if (err?.code === 404 || err?.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function getCustomFeed(ownerId: string, feedId: string): Promise<CustomFeedDefinition | null> {
  const doc = await readCustomFeedDocument(ownerId, feedId);
  return doc ? mapToDefinition(doc) : null;
}

export async function updateCustomFeed(
  ownerId: string,
  feedId: string,
  updates: Partial<CreateCustomFeedRequest & { isHome?: boolean }>
): Promise<CustomFeedDefinition | null> {
  const doc = await readCustomFeedDocument(ownerId, feedId);
  if (!doc) {
    return null;
  }

  const updatedDoc: CustomFeedDocument = {
    ...doc,
    name: updates.name ?? doc.name,
    contentType: updates.contentType ?? doc.contentType,
    sorting: updates.sorting ?? doc.sorting,
    includeKeywords: normalizeKeywords(
      updates.includeKeywords === undefined ? doc.includeKeywords : updates.includeKeywords
    ),
    excludeKeywords: normalizeKeywords(
      updates.excludeKeywords === undefined ? doc.excludeKeywords : updates.excludeKeywords
    ),
    includeAccounts: updates.includeAccounts
      ? Array.from(new Set(updates.includeAccounts.filter(Boolean)))
      : doc.includeAccounts,
    excludeAccounts: updates.excludeAccounts
      ? Array.from(new Set(updates.excludeAccounts.filter(Boolean)))
      : doc.excludeAccounts,
    isHome: updates.isHome ?? doc.isHome,
    updatedAt: Date.now(),
  };

  const container = await getCustomFeedsContainer();
  await container.item(feedId, ownerId).replace(updatedDoc);

  return mapToDefinition(updatedDoc);
}

export async function deleteCustomFeed(ownerId: string, feedId: string): Promise<boolean> {
  const container = await getCustomFeedsContainer();

  try {
    await container.item(feedId, ownerId).delete();
    return true;
  } catch (error) {
    const err = error as any;
    if (err?.code === 404 || err?.statusCode === 404) {
      return false;
    }
    throw error;
  }
}

export async function listCustomFeeds(
  ownerId: string,
  cursor?: string,
  limit?: number
): Promise<{ feeds: CustomFeedDefinition[]; nextCursor?: string }> {
  const resolvedLimit = clampLimit(limit);
  const queryCursor = decodeCursor(cursor);
  const parameters = [
    { name: '@ownerId', value: ownerId },
    { name: '@limit', value: resolvedLimit + 1 },
  ];

  const filterClauses = ['c.ownerId = @ownerId'];

  if (queryCursor) {
    filterClauses.push(
      '(c.createdAt < @cursorTs OR (c.createdAt = @cursorTs AND c.id < @cursorId))'
    );
    parameters.push({ name: '@cursorTs', value: queryCursor.ts });
    parameters.push({ name: '@cursorId', value: queryCursor.id });
  }

  const query = `
    SELECT * FROM c
    WHERE ${filterClauses.join(' AND ')}
    ORDER BY c.createdAt DESC, c.id DESC
    OFFSET 0 LIMIT @limit
  `;

  const container = await getCustomFeedsContainer();
  const { resources } = await container.items
    .query({ query, parameters }, { partitionKey: ownerId })
    .fetchAll();

  const hasMore = resources.length > resolvedLimit;
  const items = hasMore ? resources.slice(0, resolvedLimit) : resources;

  const nextCursor =
    hasMore && items.length
      ? encodeCursor({
          ts: items[items.length - 1].createdAt,
          id: items[items.length - 1].id,
        })
      : undefined;

  return {
    feeds: items.map(mapToDefinition),
    nextCursor,
  };
}

function buildPostFilters(feed: CustomFeedDocument): { clauses: string[]; parameters: Array<{ name: string; value: any }> } {
  const clauses: string[] = [`c.status = 'published'`];
  const parameters: Array<{ name: string; value: any }> = [];

  if (feed.contentType !== 'mixed') {
    clauses.push('c.contentType = @contentType');
    parameters.push({ name: '@contentType', value: feed.contentType });
  }

  if (feed.includeAccounts.length) {
    const includePlaceholders = feed.includeAccounts.map((_, index) => `@includeAccount${index}`);
    clauses.push(`c.authorId IN (${includePlaceholders.join(', ')})`);
    feed.includeAccounts.forEach((value, index) => {
      parameters.push({ name: `@includeAccount${index}`, value });
    });
  }

  if (feed.excludeAccounts.length) {
    const excludePlaceholders = feed.excludeAccounts.map((_, index) => `@excludeAccount${index}`);
    clauses.push(`NOT (c.authorId IN (${excludePlaceholders.join(', ')}))`);
    feed.excludeAccounts.forEach((value, index) => {
      parameters.push({ name: `@excludeAccount${index}`, value });
    });
  }

  if (feed.includeKeywords.length) {
    const keywordClauses = feed.includeKeywords.map((_, index) => `CONTAINS(LOWER(c.content), @includeKeyword${index})`);
    clauses.push(`(${keywordClauses.join(' OR ')})`);
    feed.includeKeywords.forEach((value, index) => {
      parameters.push({ name: `@includeKeyword${index}`, value });
    });
  }

  if (feed.excludeKeywords.length) {
    const keywordClauses = feed.excludeKeywords.map((_, index) => `CONTAINS(LOWER(c.content), @excludeKeyword${index})`);
    clauses.push(`NOT (${keywordClauses.join(' OR ')})`);
    feed.excludeKeywords.forEach((value, index) => {
      parameters.push({ name: `@excludeKeyword${index}`, value });
    });
  }

  return { clauses, parameters };
}

export async function getCustomFeedItems(
  ownerId: string,
  feedId: string,
  cursor?: string,
  limit?: number,
  viewerId?: string
): Promise<CursorPaginatedPostView> {
  const feedDoc = await readCustomFeedDocument(ownerId, feedId);
  if (!feedDoc) {
    throw notFoundError('Custom feed not found');
  }

  const resolvedLimit = clampLimit(limit);
  const cursorValue = decodeCursor(cursor);
  const { clauses, parameters } = buildPostFilters(feedDoc);

  if (cursorValue) {
    clauses.push('(c.createdAt < @cursorTs OR (c.createdAt = @cursorTs AND c.id < @cursorId))');
    parameters.push({ name: '@cursorTs', value: cursorValue.ts });
    parameters.push({ name: '@cursorId', value: cursorValue.id });
  }

  const finalQuery = `
    SELECT * FROM c
    WHERE ${clauses.join(' AND ')}
    ORDER BY c.createdAt DESC, c.id DESC
    OFFSET 0 LIMIT @limit
  `;

  parameters.push({ name: '@limit', value: resolvedLimit + 1 });

  const container = getTargetDatabase().posts;
  const { resources } = await container.items
    .query({ query: finalQuery, parameters }, { maxItemCount: resolvedLimit + 1 })
    .fetchAll();

  const hasMore = resources.length > resolvedLimit;
  const items = hasMore ? resources.slice(0, resolvedLimit) : resources;

  const enrichment = await Promise.all(
    items.map((item: PostDocumentInput) => postsService.enrichPost(item, viewerId))
  );

  const nextCursor =
    hasMore && items.length
      ? encodeCursor({
          ts: items[items.length - 1].createdAt,
          id: items[items.length - 1].id,
        })
      : undefined;

  return {
    items: enrichment,
    nextCursor,
  };
}
