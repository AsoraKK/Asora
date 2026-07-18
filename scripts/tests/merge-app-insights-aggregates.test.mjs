import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeApplicationInsightsAggregates } from '../merge-app-insights-aggregates.mjs';

function payload(columns, row) {
  return { tables: [{ columns, rows: [row] }] };
}

test('merges one-row aggregate payloads without changing the query API shape', () => {
  const merged = mergeApplicationInsightsAggregates([
    {
      source: 'reliability.json',
      payload: payload([{ name: 'totalRequests', type: 'long' }], [12]),
    },
    {
      source: 'feed.json',
      payload: payload([{ name: 'feedP95Ms', type: 'real' }], [45.5]),
    },
  ]);

  assert.deepEqual(merged.tables[0].columns, [
    { name: 'totalRequests', type: 'long' },
    { name: 'feedP95Ms', type: 'real' },
  ]);
  assert.deepEqual(merged.tables[0].rows, [[12, 45.5]]);
});

test('rejects duplicate aggregate fields', () => {
  assert.throws(
    () => mergeApplicationInsightsAggregates([
      { source: 'one.json', payload: payload([{ name: 'totalRequests' }], [1]) },
      { source: 'two.json', payload: payload([{ name: 'totalRequests' }], [2]) },
    ]),
    /Duplicate aggregate telemetry column: totalRequests/,
  );
});

test('rejects non-aggregate query responses', () => {
  assert.throws(
    () => mergeApplicationInsightsAggregates([
      { source: 'many-rows.json', payload: { tables: [{ columns: [], rows: [[], []] }] } },
    ]),
    /exactly one aggregate telemetry row/,
  );
});
