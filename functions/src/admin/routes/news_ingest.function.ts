import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import {
  ingestNewsItem,
  type NewsIngestInput,
  type NewsSourceType,
} from '@feed/service/newsIngestionService';
import { requireActiveAdmin } from '../adminAuthUtils';
import { recordAdminAudit } from '../auditLogger';

interface NewsIngestBody {
  content?: string;
  authorId?: string;
  sourceType?: NewsSourceType;
  sourceName?: string;
  sourceUrl?: string;
  sourceFeedUrl?: string;
  externalId?: string;
  publishedAt?: string;
  mediaUrls?: string[];
  topics?: string[];
}

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseMediaUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => parseOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function parseTopics(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => parseOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function parseBody(body: NewsIngestBody | null, actorId: string): NewsIngestInput | null {
  if (!body) {
    return null;
  }

  const content = parseOptionalString(body.content);
  const sourceName = parseOptionalString(body.sourceName);
  if (!content || !sourceName) {
    return null;
  }

  return {
    content,
    authorId: parseOptionalString(body.authorId) || actorId,
    actorId,
    sourceType: (parseOptionalString(body.sourceType) as NewsSourceType | undefined) || 'curated',
    sourceName,
    sourceUrl: parseOptionalString(body.sourceUrl),
    sourceFeedUrl: parseOptionalString(body.sourceFeedUrl),
    externalId: parseOptionalString(body.externalId),
    publishedAt: parseOptionalString(body.publishedAt),
    mediaUrls: parseMediaUrls(body.mediaUrls),
    topics: parseTopics(body.topics),
    ingestMethod: 'admin_api',
  };
}

export async function ingestNewsHandler(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const actorId = (req as HttpRequest & { principal: { sub: string } }).principal.sub;
  const body = (await req.json().catch(() => null)) as NewsIngestBody | null;
  const input = parseBody(body, actorId);

  if (!input) {
    return createErrorResponse(400, 'invalid_request', 'content and sourceName are required');
  }

  try {
    const result = await ingestNewsItem(input, context);
    if (!result.ingested && result.reason === 'blocked') {
      return createErrorResponse(400, 'content_blocked', 'news content violates policy');
    }

    await recordAdminAudit({
      actorId,
      action: 'NEWS_INGEST',
      subjectId: result.postId,
      targetType: 'content',
      reasonCode: 'news_ingest',
      correlationId: context.invocationId,
      metadata: {
        authorId: input.authorId,
        sourceType: input.sourceType,
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl ?? null,
        sourceFeedUrl: input.sourceFeedUrl ?? null,
        externalId: input.externalId ?? null,
      },
      after: {
        status: result.ingested ? 'published' : 'existing',
        isNews: true,
        duplicate: result.duplicate,
      },
    });

    return createSuccessResponse({
      postId: result.postId,
      ingested: result.ingested,
      duplicate: result.duplicate,
      source: result.source,
    }, {}, result.ingested ? 201 : 200);
  } catch (error) {
    return createErrorResponse(400, 'ingest_failed', (error as Error).message);
  }
}

app.http('admin_news_ingest', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/news/ingest',
  handler: requireActiveAdmin(ingestNewsHandler),
});
