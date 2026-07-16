const test = require('node:test');
const assert = require('node:assert/strict');

function telemetryPayload(row) {
  const columns = Object.keys(row).map((name) => ({ name, type: 'dynamic' }));
  return { tables: [{ columns, rows: [Object.values(row)] }] };
}

test('daily report remains aggregate-only and flags failed gates', async () => {
  const { buildReport } = await import('../build-alpha-daily-report.mjs');
  const report = buildReport({
    telemetryPayload: telemetryPayload({
      totalRequests: 100,
      failedRequests: 2,
      apiErrorRatePct: 2,
      feedP50Ms: 100,
      feedP95Ms: 250,
      feedP99Ms: 300,
      dsrPoisonMessages: 0,
      dsrStuckRequests: 0,
      dsrFailedRequests: 0,
    }),
    configPayload: { payload: { alpha: { stage: 'technical_alpha', maxRegisteredAccounts: 50 } } },
    opsPayload: { success: true, data: {
      partial: false,
      cohort: { stage: 'technical_alpha', registeredAccounts: 25, capacity: 50, remaining: 25 },
      queues: { openFlags: 0, pendingAppeals: 0, audit24h: 3 },
      incident: { severity: 'normal' },
      errors: [],
    } },
    deploymentSha: 'a'.repeat(40),
    environment: 'staging',
    generatedAt: '2026-07-10T00:00:00.000Z',
  });

  assert.equal(report.privacy.aggregateOnly, true);
  assert.equal(report.privacy.rawPersonalDataIncluded, false);
  assert.equal(report.status, 'attention_required');
  assert.match(report.openBlockers.join(' '), /error rate/i);
  assert.match(report.openBlockers.join(' '), /Feed p95/i);
  assert.equal(JSON.stringify(report).includes('userId'), false);
});
