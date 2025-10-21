import http from 'k6/http';
import { check, sleep } from 'k6';
import { resolveUrl, resolveDurationThresholds } from './utils.js';

const durationThresholds = resolveDurationThresholds(__ENV, 'FEED_READ', {
  p95: 3000,  // 3 seconds - realistic for warm endpoints
  p99: 5000,  // 5 seconds - generous for 99th percentile
});

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 5),
      duration: __ENV.DURATION || '60s',
    },
  },
  thresholds: {
    'http_req_failed{endpoint:feed}': ['rate<0.01'],
    'http_req_duration{endpoint:feed}': [
      `p(95)<${durationThresholds.p95}`,
      `p(99)<${durationThresholds.p99}`,
    ],
  },
  summaryTrendStats: ['min', 'avg', 'med', 'p(95)', 'p(99)'],
  tags: { test: 'feed-read' },
};

const BASE = __ENV.K6_BASE_URL;
if (!BASE) throw new Error('K6_BASE_URL is required');

function buildFeedUrl() {
  const feedBase = resolveUrl(BASE, '/api/feed');
  const query = 'guest=1&limit=10';
  return `${feedBase}?${query}`;
}

export default function () {
  const res = http.get(buildFeedUrl(), { tags: { endpoint: 'feed' } });
  check(res, { 'status 200/204': (r) => r.status === 200 || r.status === 204 });
  sleep(1);
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const p95 = metrics['http_req_duration{endpoint:feed}']?.values?.['p(95)'] || 0;
  const p99 = metrics['http_req_duration{endpoint:feed}']?.values?.['p(99)'] || 0;
  const errorRate = metrics['http_req_failed{endpoint:feed}']?.values?.rate || 0;
  
  const textSummary = `Feed Read Test Results
=======================
p95: ${p95.toFixed(2)}ms
p99: ${p99.toFixed(2)}ms
error_rate: ${(errorRate * 100).toFixed(2)}%
iterations: ${metrics.iterations?.values?.count || 0}
`;

  return {
    'load/k6/feed-read-summary.json': JSON.stringify(data, null, 2),
    'load/k6/feed-read-summary.txt': textSummary,
  };
}
