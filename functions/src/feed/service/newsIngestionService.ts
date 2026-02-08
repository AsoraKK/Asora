import { createHash } from 'crypto';
import type { InvocationContext } from '@azure/functions';
import { v7 as uuidv7 } from 'uuid';
import type { CreatePostRequest } from '@shared/types/openapi';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { postsService } from '@posts/service/postsService';
import { usersService } from '@auth/service/usersService';
import { moderatePostContent, buildModerationMeta } from '@posts/service/moderationUtil';

export type NewsSourceType = 'journalist' | 'curated' | 'partner' | 'wire';
export type NewsFeedFormat = 'rss' | 'atom' | 'json';

export interface NewsSourceMetadata {
  type: NewsSourceType;
  name: string;
  url?: string;
  feedUrl?: string;
  externalId?: string;
  publishedAt: string;
  ingestedAt: string;
  ingestedBy: string;
  ingestMethod: 'admin_api' | 'timer';
}

export interface NewsIngestInput {
  content: string;
  authorId: string;
  actorId: string;
  sourceType: NewsSourceType;
  sourceName: string;
  sourceUrl?: string;
  sourceFeedUrl?: string;
  externalId?: string;
  publishedAt?: string;
  mediaUrls?: string[];
  topics?: string[];
  ingestMethod: 'admin_api' | 'timer';
}

export interface NewsIngestResult {
  postId: string;
  ingested: boolean;
  duplicate: boolean;
  source: NewsSourceMetadata;
  reason?: 'duplicate' | 'blocked';
}

export interface CuratedNewsSourceConfig {
  id: string;
  name: string;
  url: string;
  format?: NewsFeedFormat;
  sourceType?: NewsSourceType;
  authorId?: string;
  topics?: string[];
  maxItems?: number;
  enabled?: boolean;
}

export interface CuratedFeedEntry {
  title?: string;
  content?: string;
  url?: string;
  externalId?: string;
  publishedAt?: string;
}

const VALID_SOURCE_TYPES = new Set<NewsSourceType>(['journalist', 'curated', 'partner', 'wire']);
const DEFAULT_SOURCE_TYPE: NewsSourceType = 'curated';
const DEFAULT_MAX_ITEMS = 10;
const MAX_CONTENT_LENGTH = 4000;

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => parseOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function parseSourceType(value: unknown): NewsSourceType {
  if (typeof value !== 'string') {
    return DEFAULT_SOURCE_TYPE;
  }
  const normalized = value.trim().toLowerCase() as NewsSourceType;
  return VALID_SOURCE_TYPES.has(normalized) ? normalized : DEFAULT_SOURCE_TYPE;
}

function sanitizeText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractTagValue(xmlBlock: string, tags: string[]): string | undefined {
  for (const tag of tags) {
    const pattern = new RegExp(`<${escapeRegex(tag)}[^>]*>([\\s\\S]*?)<\\/${escapeRegex(tag)}>`, 'i');
    const match = xmlBlock.match(pattern);
    if (match && match[1]) {
      const normalized = sanitizeText(match[1]);
      if (normalized.length > 0) {
        return normalized;
      }
    }
  }
  return undefined;
}

function extractAtomLink(entry: string): string | undefined {
  const hrefMatch = entry.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (hrefMatch && hrefMatch[1]) {
    return parseOptionalString(hrefMatch[1]);
  }
  return extractTagValue(entry, ['link']);
}

function toIsoDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
}

function buildExternalId(sourceId: string, entry: CuratedFeedEntry): string {
  const base =
    entry.externalId ||
    entry.url ||
    `${entry.title || ''}|${entry.publishedAt || ''}|${entry.content || ''}`;
  const digest = createHash('sha256').update(base).digest('hex').slice(0, 32);
  return `${sourceId}:${digest}`;
}

function composeContent(title?: string, body?: string): string {
  const parts = [parseOptionalString(title), parseOptionalString(body)].filter(
    (value): value is string => Boolean(value)
  );
  const combined = parts.join('\n\n').trim();
  return combined.length > MAX_CONTENT_LENGTH
    ? combined.slice(0, MAX_CONTENT_LENGTH)
    : combined;
}

async function findExistingByExternalId(externalId: string): Promise<string | null> {
  const db = getTargetDatabase();
  const { resources } = await db.posts.items
    .query(
      {
        query: `
          SELECT TOP 1 c.id
          FROM c
          WHERE c.isNews = true
            AND IS_DEFINED(c.source)
            AND IS_DEFINED(c.source.externalId)
            AND c.source.externalId = @externalId
          ORDER BY c.createdAt DESC
        `,
        parameters: [{ name: '@externalId', value: externalId }],
      },
      { maxItemCount: 1 }
    )
    .fetchAll();

  const existingId = resources[0]?.id;
  return typeof existingId === 'string' ? existingId : null;
}

function createSourceMetadata(input: NewsIngestInput): NewsSourceMetadata {
  return {
    type: parseSourceType(input.sourceType),
    name: input.sourceName,
    url: input.sourceUrl,
    feedUrl: input.sourceFeedUrl,
    externalId: input.externalId,
    publishedAt: toIsoDate(input.publishedAt) || new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    ingestedBy: input.actorId,
    ingestMethod: input.ingestMethod,
  };
}

export async function ingestNewsItem(
  input: NewsIngestInput,
  context: InvocationContext
): Promise<NewsIngestResult> {
  const content = parseOptionalString(input.content);
  if (!content) {
    throw new Error('content is required');
  }

  const sourceName = parseOptionalString(input.sourceName);
  if (!sourceName) {
    throw new Error('sourceName is required');
  }

  const author = await usersService.getUserById(input.authorId);
  if (!author) {
    throw new Error('authorId does not match an existing user');
  }

  const source = createSourceMetadata(input);
  if (source.externalId) {
    const existingId = await findExistingByExternalId(source.externalId);
    if (existingId) {
      return {
        postId: existingId,
        ingested: false,
        duplicate: true,
        source,
        reason: 'duplicate',
      };
    }
  }

  const postId = uuidv7();
  const { result, error } = await moderatePostContent(
    content,
    input.authorId,
    postId,
    context,
    context.invocationId
  );
  const moderationMeta = buildModerationMeta(result, error);
  if (moderationMeta.status === 'blocked') {
    return {
      postId,
      ingested: false,
      duplicate: false,
      source,
      reason: 'blocked',
    };
  }

  const createRequest: CreatePostRequest = {
    content,
    contentType: (input.mediaUrls?.length ?? 0) > 0 ? 'image' : 'text',
    mediaUrls: input.mediaUrls && input.mediaUrls.length > 0 ? input.mediaUrls : undefined,
    topics: input.topics && input.topics.length > 0 ? input.topics : undefined,
    visibility: 'public',
    isNews: true,
    aiLabel: 'human',
  };

  const post = await postsService.createPost(
    input.authorId,
    createRequest,
    postId,
    moderationMeta,
    undefined,
    { aiLabel: 'human', aiDetected: false }
  );

  const db = getTargetDatabase();
  await db.posts.item(post.id, post.id).patch([
    { op: 'set' as const, path: '/source', value: source },
    { op: 'set' as const, path: '/isNews', value: true },
  ]);

  return {
    postId: post.id,
    ingested: true,
    duplicate: false,
    source,
  };
}

export function parseCuratedSourcesConfig(raw: string | undefined): CuratedNewsSourceConfig[] {
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const item = entry as Record<string, unknown>;
      const id = parseOptionalString(item.id);
      const name = parseOptionalString(item.name);
      const url = parseOptionalString(item.url);
      if (!id || !name || !url) {
        return null;
      }
      const maxItemsRaw = Number(item.maxItems);
      const maxItems = Number.isFinite(maxItemsRaw) && maxItemsRaw > 0
        ? Math.min(Math.floor(maxItemsRaw), 30)
        : DEFAULT_MAX_ITEMS;
      return {
        id,
        name,
        url,
        format: parseOptionalString(item.format) as NewsFeedFormat | undefined,
        sourceType: parseSourceType(item.sourceType),
        authorId: parseOptionalString(item.authorId),
        topics: parseStringArray(item.topics),
        maxItems,
        enabled: item.enabled !== false,
      } as CuratedNewsSourceConfig;
    })
    .filter((entry): entry is CuratedNewsSourceConfig => Boolean(entry));
}

export function inferFeedFormat(payload: string, contentTypeHeader?: string): NewsFeedFormat {
  const contentType = (contentTypeHeader || '').toLowerCase();
  const trimmed = payload.trim();
  if (contentType.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }
  if (trimmed.includes('<feed') || contentType.includes('atom')) {
    return 'atom';
  }
  return 'rss';
}

function parseJsonFeedEntries(payload: string): CuratedFeedEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return [];
  }

  const items =
    Array.isArray(parsed) ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).items)
      ? (parsed as Record<string, unknown>).items as unknown[]
      : [];

  return items
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const item = entry as Record<string, unknown>;
      return {
        title: parseOptionalString(item.title ?? item.headline),
        content: parseOptionalString(item.content ?? item.description ?? item.summary),
        url: parseOptionalString(item.url ?? item.link),
        externalId: parseOptionalString(item.id ?? item.guid ?? item.externalId),
        publishedAt: parseOptionalString(item.publishedAt ?? item.pubDate ?? item.date_published),
      } as CuratedFeedEntry;
    })
    .filter((entry): entry is CuratedFeedEntry => Boolean(entry));
}

function parseRssEntries(payload: string): CuratedFeedEntry[] {
  const matches = payload.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return matches.map((item) => ({
    title: extractTagValue(item, ['title']),
    content: extractTagValue(item, ['content:encoded', 'description']),
    url: extractTagValue(item, ['link']),
    externalId: extractTagValue(item, ['guid', 'id']),
    publishedAt: extractTagValue(item, ['pubDate', 'published', 'updated']),
  }));
}

function parseAtomEntries(payload: string): CuratedFeedEntry[] {
  const matches = payload.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  return matches.map((entry) => ({
    title: extractTagValue(entry, ['title']),
    content: extractTagValue(entry, ['content', 'summary']),
    url: extractAtomLink(entry),
    externalId: extractTagValue(entry, ['id']),
    publishedAt: extractTagValue(entry, ['updated', 'published']),
  }));
}

export function parseFeedEntries(payload: string, format: NewsFeedFormat): CuratedFeedEntry[] {
  const entries =
    format === 'json' ? parseJsonFeedEntries(payload)
    : format === 'atom' ? parseAtomEntries(payload)
    : parseRssEntries(payload);

  return entries
    .map((entry) => ({
      ...entry,
      title: entry.title ? sanitizeText(entry.title) : undefined,
      content: entry.content ? sanitizeText(entry.content) : undefined,
      publishedAt: toIsoDate(entry.publishedAt),
    }))
    .filter((entry) => Boolean(entry.title || entry.content));
}

export function buildIngestInputFromEntry(
  source: CuratedNewsSourceConfig,
  entry: CuratedFeedEntry,
  actorId: string,
  fallbackAuthorId: string
): NewsIngestInput | null {
  const composed = composeContent(entry.title, entry.content);
  if (!composed) {
    return null;
  }

  return {
    content: composed,
    authorId: source.authorId || fallbackAuthorId,
    actorId,
    sourceType: source.sourceType || DEFAULT_SOURCE_TYPE,
    sourceName: source.name,
    sourceUrl: entry.url,
    sourceFeedUrl: source.url,
    externalId: buildExternalId(source.id, entry),
    publishedAt: entry.publishedAt,
    topics: source.topics ?? [],
    ingestMethod: 'timer',
  };
}
