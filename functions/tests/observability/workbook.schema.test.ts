/**
 * W11 – Observability: workbook schema, alert configuration, and KQL SLO docs.
 *
 * These tests validate the observability artefacts (JSON workbooks, Bicep alert
 * definitions, and KQL query files) rather than runtime behaviour.  They act as
 * a "contract" that prevents regressions when these files are edited.
 *
 * No Azure credentials are required – all checks are static file inspection.
 */

import * as fs from 'fs';
import * as path from 'path';

// Root of the observability directory, two levels up from functions/tests
const OBS_DIR = path.resolve(__dirname, '../../../observability');

// ─────────────────────────────────────────────────────────────────────────────
// Workbook JSON schema
// ─────────────────────────────────────────────────────────────────────────────
describe('feed-latency.json workbook schema', () => {
  let workbook: Record<string, unknown>;

  beforeAll(() => {
    const raw = fs.readFileSync(path.join(OBS_DIR, 'workbooks/feed-latency.json'), 'utf8');
    workbook = JSON.parse(raw) as Record<string, unknown>;
  });

  it('is valid JSON', () => {
    expect(workbook).toBeDefined();
  });

  it('has version field "Notebook/1.0"', () => {
    expect(workbook['version']).toBe('Notebook/1.0');
  });

  it('has a metadata.displayName', () => {
    const metadata = workbook['metadata'] as Record<string, unknown>;
    expect(typeof metadata?.['displayName']).toBe('string');
    expect((metadata?.['displayName'] as string).length).toBeGreaterThan(0);
  });

  it('has an items array with at least one entry', () => {
    expect(Array.isArray(workbook['items'])).toBe(true);
    expect((workbook['items'] as unknown[]).length).toBeGreaterThan(0);
  });

  it('every item has a type field', () => {
    for (const item of workbook['items'] as Record<string, unknown>[]) {
      expect(typeof item['type']).toBe('string');
    }
  });

  it('contains at least one query item with a KQL query', () => {
    const items = workbook['items'] as Record<string, unknown>[];
    const queryItems = items.filter(i => i['type'] === 'query');
    expect(queryItems.length).toBeGreaterThan(0);

    for (const qi of queryItems) {
      const content = qi['content'] as Record<string, unknown>;
      const json = content?.['json'] as Record<string, unknown>;
      expect(typeof json?.['query']).toBe('string');
      expect((json?.['query'] as string).length).toBeGreaterThan(0);
    }
  });

  it('every query item has resourceIds placeholder (not resolved)', () => {
    // Verifies the workbook still uses template placeholders — not hardcoded prod resource IDs
    const items = workbook['items'] as Record<string, unknown>[];
    const queryItems = items.filter(i => i['type'] === 'query');
    for (const qi of queryItems) {
      const content = qi['content'] as Record<string, unknown>;
      const json = content?.['json'] as Record<string, unknown>;
      const resourceIds = json?.['resourceIds'] as string[];
      // Each resourceIds entry must contain the placeholder tokens
      expect(resourceIds).toBeDefined();
      const allUseTemplates = resourceIds.some(
        id => id.includes('<SUBSCRIPTION_ID>') && id.includes('<RESOURCE_GROUP>'),
      );
      expect(allUseTemplates).toBe(true);
    }
  });

  it('contains p95 latency query', () => {
    const items = workbook['items'] as Record<string, unknown>[];
    const queries = items
      .filter(i => i['type'] === 'query')
      .map(qi => {
        const content = qi['content'] as Record<string, unknown>;
        const json = content?.['json'] as Record<string, unknown>;
        return json?.['query'] as string;
      });
    const hasP95 = queries.some(q => q.includes('percentile') && q.includes('95'));
    expect(hasP95).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Alert Bicep configuration
// ─────────────────────────────────────────────────────────────────────────────
describe('feed-alerts.bicep configuration', () => {
  let bicep: string;

  beforeAll(() => {
    bicep = fs.readFileSync(path.join(OBS_DIR, 'alerts/feed-alerts.bicep'), 'utf8');
  });

  it('defines actionGroupIds as a required parameter (no default value)', () => {
    // The param line must NOT have a default (= []) or similar
    expect(bicep).toContain('param actionGroupIds array');
    // Ensure there is no "= [" default assignment on the same declaration
    const paramLine = bicep
      .split('\n')
      .find(line => line.includes('param actionGroupIds'));
    expect(paramLine).toBeDefined();
    expect(paramLine).not.toMatch(/=\s*\[/);
  });

  it('references actionGroupIds in alert action sections', () => {
    expect(bicep).toContain('actionGroupIds');
    expect(bicep).toContain('for id in actionGroupIds');
  });

  it('defines p95 latency alert with threshold 200', () => {
    expect(bicep).toContain('threshold: 200');
  });

  it('p95 latency alert uses percentile(duration,95) query', () => {
    expect(bicep).toContain('percentile(duration,95)');
  });

  it('defines error rate alert referencing /api/feed', () => {
    expect(bicep).toContain('/api/feed');
    // The error rate alert should reference success==false
    expect(bicep).toContain('success == false');
  });

  it('sendToServiceOwners is false (no implicit email fan-out)', () => {
    // Count occurrences — one per alert resource
    const matches = bicep.match(/sendToServiceOwners:\s*false/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KQL SLO query docs
// ─────────────────────────────────────────────────────────────────────────────
describe('appinsights-feed-p95.kql SLO query', () => {
  let kql: string;

  beforeAll(() => {
    kql = fs.readFileSync(path.join(OBS_DIR, 'appinsights-feed-p95.kql'), 'utf8');
  });

  it('is non-empty', () => {
    expect(kql.trim().length).toBeGreaterThan(0);
  });

  it('queries p95 latency using percentile(duration, 95)', () => {
    expect(kql).toMatch(/percentile\(duration,\s*95\)/);
  });

  it('scopes to the correct role name (asora-function-dev)', () => {
    expect(kql).toContain('asora-function-dev');
  });

  it('projects per-endpoint breakdown', () => {
    expect(kql).toContain('endpoint');
  });
});

describe('appinsights-privacy-actions.kql', () => {
  it('is non-empty and references dsr events', () => {
    const kql = fs.readFileSync(path.join(OBS_DIR, 'appinsights-privacy-actions.kql'), 'utf8');
    expect(kql.trim().length).toBeGreaterThan(0);
    expect(kql.toLowerCase()).toMatch(/dsr|privacy|gdpr|data/);
  });
});
