import http from 'k6/http';
import { check, sleep } from 'k6';
import { resolveUrl, resolveDurationThresholds } from './utils.js';

const durationThresholds = resolveDurationThresholds(__ENV, 'SMOKE', {
  p95: 5000,  // 5 seconds - generous for cold start
  p99: 10000, // 10 seconds - very generous for cold start
});

export const options = {
  vus: Number(__ENV.VUS || 1),
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: [
      `p(95)<${durationThresholds.p95}`,
      `p(99)<${durationThresholds.p99}`,
    ],
  },
  summaryTrendStats: ['min', 'avg', 'med', 'p(95)', 'p(99)'],
  tags: { test: 'smoke' },
};

const BASE = __ENV.K6_BASE_URL;
if (!BASE) throw new Error('K6_BASE_URL is required');

export default function () {
  const res = http.get(resolveUrl(BASE, '/api/health'), {
    tags: { endpoint: 'health' },
  });
  check(res, { 'health 200': (r) => r.status === 200 });
  sleep(1);
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const p95 = metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99 = metrics.http_req_duration?.values?.['p(99)'] || 0;
  const errorRate = metrics.http_req_failed?.values?.rate || 0;
  
  const textSummary = `Smoke Test Results
====================
p95: ${p95.toFixed(2)}ms
p99: ${p99.toFixed(2)}ms
error_rate: ${(errorRate * 100).toFixed(2)}%
iterations: ${metrics.iterations?.values?.count || 0}
`;

  return {
    'load/k6/smoke-summary.json': JSON.stringify(data, null, 2),
    'load/k6/smoke-summary.txt': textSummary,
  };
}
