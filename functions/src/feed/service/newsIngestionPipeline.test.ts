import { describe, it, expect } from '@jest/globals';
import {
  buildIngestInputFromEntry,
  inferFeedFormat,
  parseCuratedSourcesConfig,
  parseFeedEntries,
  type CuratedNewsSourceConfig,
} from './newsIngestionService';

describe('news ingestion pipeline helpers', () => {
  it('parses curated source configuration safely', () => {
    const sources = parseCuratedSourcesConfig(
      JSON.stringify([
        {
          id: 'source-1',
          name: 'Reuters',
          url: 'https://example.com/rss',
          format: 'rss',
          sourceType: 'partner',
          topics: ['policy', 'economy'],
          maxItems: 5,
        },
        { id: '', name: 'Invalid', url: 'https://invalid.local' },
      ])
    );

    expect(sources).toHaveLength(1);
    expect(sources[0]?.id).toBe('source-1');
    expect(sources[0]?.sourceType).toBe('partner');
    expect(sources[0]?.maxItems).toBe(5);
    expect(sources[0]?.topics).toEqual(['policy', 'economy']);
  });

  it('infers feed format from payload and headers', () => {
    expect(inferFeedFormat('{"items":[]}', 'application/json')).toBe('json');
    expect(inferFeedFormat('<feed><entry></entry></feed>', 'application/xml')).toBe('atom');
    expect(inferFeedFormat('<rss><channel><item></item></channel></rss>', 'application/xml')).toBe('rss');
  });

  it('parses RSS entries into normalized feed items', () => {
    const rss = `
      <rss version="2.0">
        <channel>
          <item>
            <title>Major update</title>
            <link>https://news.example.com/articles/1</link>
            <description><![CDATA[Policy change announced today.]]></description>
            <guid>article-1</guid>
            <pubDate>Sun, 08 Feb 2026 08:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>
    `;

    const entries = parseFeedEntries(rss, 'rss');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.title).toBe('Major update');
    expect(entries[0]?.url).toBe('https://news.example.com/articles/1');
    expect(entries[0]?.externalId).toBe('article-1');
    expect(entries[0]?.publishedAt).toBe('2026-02-08T08:00:00.000Z');
  });

  it('builds deterministic ingest input from parsed entry', () => {
    const source: CuratedNewsSourceConfig = {
      id: 'reuters',
      name: 'Reuters',
      url: 'https://www.reuters.com/world/rss',
      sourceType: 'partner',
      topics: ['world'],
      maxItems: 10,
      enabled: true,
    };

    const entries = parseFeedEntries(
      JSON.stringify({
        items: [
          {
            id: 'abc-123',
            title: 'World briefing',
            content: 'Summary line',
            url: 'https://www.reuters.com/world/abc-123',
            publishedAt: '2026-02-08T09:00:00.000Z',
          },
        ],
      }),
      'json'
    );

    const input = buildIngestInputFromEntry(
      source,
      entries[0]!,
      'system:curated-news-ingest',
      'fallback-user-id'
    );

    expect(input).not.toBeNull();
    expect(input?.sourceName).toBe('Reuters');
    expect(input?.authorId).toBe('fallback-user-id');
    expect(input?.sourceType).toBe('partner');
    expect(input?.externalId?.startsWith('reuters:')).toBe(true);
    expect(input?.content).toContain('World briefing');
  });
});
