/**
 * Feed workbook structural and KQL contract tests.
 *
 * These tests load `observability/workbooks/feed-latency.json` and assert the
 * workbook has the expected structure, required KQL queries, and no hard-coded
 * resource IDs.
 *
 * Run with: npx jest tests/feed/feed.workbook.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Load workbook fixture
// ─────────────────────────────────────────────────────────────────────────────

const WORKBOOK_PATH = path.resolve(__dirname, '../../../observability/workbooks/feed-latency.json');

type WorkbookItem =
  | { type: 'markdown'; content: { json: Record<string, unknown> } }
  | {
      type: 'query';
      content: {
        json: {
          title: string;
          subtitle?: string;
          visualization: string;
          query: string;
          resourceIds: string[];
          resourceType?: string;
        };
      };
    };

interface WorkbookDocument {
  version: string;
  metadata?: { displayName: string; description?: string };
  items: WorkbookItem[];
}

let workbook: WorkbookDocument;

beforeAll(() => {
  const raw = fs.readFileSync(WORKBOOK_PATH, 'utf-8');
  workbook = JSON.parse(raw) as WorkbookDocument;
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Top-level structure
// ─────────────────────────────────────────────────────────────────────────────

describe('workbook structure', () => {
  it('is a valid Notebook/1.0 document', () => {
    expect(workbook.version).toBe('Notebook/1.0');
  });

  it('has a displayName in metadata', () => {
    expect(workbook.metadata?.displayName).toBeTruthy();
  });

  it('has at least 5 items (1 markdown + 5 queries)', () => {
    expect(workbook.items.length).toBeGreaterThanOrEqual(5);
  });

  it('first item is a markdown intro cell', () => {
    expect(workbook.items[0]!.type).toBe('markdown');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Extract query items for assertion
// ─────────────────────────────────────────────────────────────────────────────

function queries() {
  return workbook.items.filter((i): i is Extract<WorkbookItem, { type: 'query' }> => i.type === 'query');
}

describe('workbook queries', () => {
  it('has at least 5 query items', () => {
    expect(queries().length).toBeGreaterThanOrEqual(5);
  });

  it('every query item has a non-empty title', () => {
    for (const q of queries()) {
      expect(q.content.json.title).toBeTruthy();
    }
  });

  it('every query item has a non-empty KQL query string', () => {
    for (const q of queries()) {
      expect(q.content.json.query.trim().length).toBeGreaterThan(10);
    }
  });

  it('every query has a resourceType set to Application Insights', () => {
    for (const q of queries()) {
      expect(q.content.json.resourceType).toBe('microsoft.insights/components');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Resource ID placeholder contract (no hard-coded IDs)
// ─────────────────────────────────────────────────────────────────────────────

describe('resource ID placeholders', () => {
  it('every query uses placeholder subscription/resource-group (no live IDs)', () => {
    for (const q of queries()) {
      for (const rid of q.content.json.resourceIds) {
        expect(rid).toContain('<SUBSCRIPTION_ID>');
        expect(rid).toContain('<RESOURCE_GROUP>');
        // Must not contain a real UUID-format subscription ID
        expect(rid).not.toMatch(/\/subscriptions\/[0-9a-f]{8}-[0-9a-f]{4}/i);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Required KQL queries by name/content
// ─────────────────────────────────────────────────────────────────────────────

describe('required KQL queries', () => {
  it('contains a latency percentile query for /api/feed requests', () => {
    const q = queries().find(
      item =>
        item.content.json.query.includes('percentile') &&
        item.content.json.query.includes('/api/feed'),
    );
    expect(q).toBeDefined();
    const kql = q!.content.json.query;
    expect(kql).toContain('percentile(duration,50)');
    expect(kql).toContain('percentile(duration,95)');
    expect(kql).toContain('percentile(duration,99)');
  });

  it('contains an error rate query for feed requests', () => {
    const q = queries().find(
      item =>
        item.content.json.query.includes('success') &&
        item.content.json.query.includes('/api/feed'),
    );
    expect(q).toBeDefined();
    const kql = q!.content.json.query;
    expect(kql).toMatch(/err_?rate|countif.*success/i);
  });

  it('contains a cosmos_ru_feed_page custom metric query', () => {
    const q = queries().find(item =>
      item.content.json.query.includes('cosmos_ru_feed_page'),
    );
    expect(q).toBeDefined();
    const kql = q!.content.json.query;
    expect(kql).toContain('customMetrics');
    expect(kql).toContain('cosmos_ru_feed_page');
  });

  it('contains a feed_page custom event query', () => {
    const q = queries().find(item =>
      item.content.json.query.includes('customEvents') &&
      item.content.json.query.includes('"feed_page"'),
    );
    expect(q).toBeDefined();
    const kql = q!.content.json.query;
    expect(kql).toContain('customEvents');
    expect(kql).toContain('feed_page');
  });

  it('feed_page query extracts feed.type and hasMore custom dimensions', () => {
    const q = queries().find(item =>
      item.content.json.query.includes('customEvents') &&
      item.content.json.query.includes('"feed_page"'),
    );
    expect(q).toBeDefined();
    const kql = q!.content.json.query;
    expect(kql).toContain('feed.type');
    expect(kql).toContain('hasMore');
  });

  it('contains a p95 vs ADR 200 ms target reference query', () => {
    const q = queries().find(
      item =>
        item.content.json.query.includes('target_ms') ||
        item.content.json.query.includes('200'),
    );
    expect(q).toBeDefined();
    const kql = q!.content.json.query;
    expect(kql).toContain('200');
    expect(kql).toContain('percentile(duration,95)');
  });

  it('p95 target query projects both p95 and target_ms columns', () => {
    const q = queries().find(item => item.content.json.query.includes('target_ms'));
    expect(q).toBeDefined();
    const kql = q!.content.json.query;
    expect(kql).toContain('target_ms');
    expect(kql).toContain('p95');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Visualization types
// ─────────────────────────────────────────────────────────────────────────────

describe('visualization types', () => {
  it('latency query uses linechart', () => {
    const q = queries().find(
      item =>
        item.content.json.query.includes('percentile(duration,50)'),
    );
    expect(q!.content.json.visualization).toBe('linechart');
  });

  it('feed_page distribution query uses barchart', () => {
    const q = queries().find(
      item =>
        item.content.json.query.includes('customEvents') &&
        item.content.json.query.includes('"feed_page"'),
    );
    expect(q!.content.json.visualization).toBe('barchart');
  });
});
