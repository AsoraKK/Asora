import { app, type InvocationContext, type Timer } from '@azure/functions';
import { usersService } from '@auth/service/usersService';
import {
  buildIngestInputFromEntry,
  inferFeedFormat,
  ingestNewsItem,
  parseCuratedSourcesConfig,
  parseFeedEntries,
  type CuratedNewsSourceConfig,
} from '@feed/service/newsIngestionService';

const DEFAULT_ACTOR_ID = 'system:curated-news-ingest';
const FETCH_TIMEOUT_MS = 12000;

interface SourceRunStats {
  sourceId: string;
  fetched: number;
  ingested: number;
  duplicates: number;
  blocked: number;
  errors: number;
}

function resolveFallbackAuthorId(): string | undefined {
  const configured = process.env.CURATED_NEWS_AUTHOR_ID;
  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }
  return undefined;
}

async function fetchSourcePayload(
  source: CuratedNewsSourceConfig,
  context: InvocationContext
): Promise<{ payload: string; contentType: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(source.url, {
      method: 'GET',
      headers: { Accept: 'application/rss+xml, application/atom+xml, application/json, text/xml, application/xml' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return {
      payload: await response.text(),
      contentType: response.headers.get('content-type'),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function curatedNewsIngestTimer(
  _timer: Timer,
  context: InvocationContext
): Promise<void> {
  const sources = parseCuratedSourcesConfig(process.env.CURATED_NEWS_SOURCES_JSON);
  if (sources.length === 0) {
    context.log('news.ingest.timer.no_sources_configured');
    return;
  }

  const fallbackAuthorId = resolveFallbackAuthorId();
  if (!fallbackAuthorId) {
    context.warn('news.ingest.timer.no_fallback_author', {
      envVar: 'CURATED_NEWS_AUTHOR_ID',
    });
    return;
  }

  const fallbackAuthor = await usersService.getUserById(fallbackAuthorId);
  if (!fallbackAuthor) {
    context.warn('news.ingest.timer.invalid_fallback_author', { fallbackAuthorId });
    return;
  }

  const stats: SourceRunStats[] = [];

  for (const source of sources.filter((item) => item.enabled !== false)) {
    const sourceStats: SourceRunStats = {
      sourceId: source.id,
      fetched: 0,
      ingested: 0,
      duplicates: 0,
      blocked: 0,
      errors: 0,
    };

    try {
      const { payload, contentType } = await fetchSourcePayload(source, context);
      const format = source.format || inferFeedFormat(payload, contentType || undefined);
      const entries = parseFeedEntries(payload, format)
        .slice(0, source.maxItems ?? 10);

      sourceStats.fetched = entries.length;

      for (const entry of entries) {
        const ingestInput = buildIngestInputFromEntry(
          source,
          entry,
          DEFAULT_ACTOR_ID,
          fallbackAuthorId
        );
        if (!ingestInput) {
          continue;
        }

        try {
          const result = await ingestNewsItem(ingestInput, context);
          if (result.ingested) {
            sourceStats.ingested += 1;
          } else if (result.duplicate) {
            sourceStats.duplicates += 1;
          } else if (result.reason === 'blocked') {
            sourceStats.blocked += 1;
          } else {
            sourceStats.errors += 1;
          }
        } catch (error) {
          sourceStats.errors += 1;
          context.warn('news.ingest.timer.entry_failed', {
            sourceId: source.id,
            error: (error as Error).message,
          });
        }
      }
    } catch (error) {
      sourceStats.errors += 1;
      context.warn('news.ingest.timer.source_failed', {
        sourceId: source.id,
        error: (error as Error).message,
      });
    }

    stats.push(sourceStats);
  }

  const totals = stats.reduce(
    (acc, item) => ({
      fetched: acc.fetched + item.fetched,
      ingested: acc.ingested + item.ingested,
      duplicates: acc.duplicates + item.duplicates,
      blocked: acc.blocked + item.blocked,
      errors: acc.errors + item.errors,
    }),
    { fetched: 0, ingested: 0, duplicates: 0, blocked: 0, errors: 0 }
  );

  context.log('news.ingest.timer.complete', {
    sourceCount: stats.length,
    ...totals,
    perSource: stats,
  });
}

app.timer('curatedNewsIngest', {
  schedule: '0 */15 * * * *',
  handler: curatedNewsIngestTimer,
});
