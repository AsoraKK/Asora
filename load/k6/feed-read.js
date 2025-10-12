import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    steady_feed: {
      executor: 'constant-vus',
      vus: Number(__ENV.K6_VUS || 20),
      duration: __ENV.K6_DURATION || '2m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{scenario:steady_feed}': ['p(95)<200', 'p(99)<400'],
  },
  summaryTrendStats: ['min', 'avg', 'med', 'p(95)', 'p(99)'],
};

const BASE = __ENV.K6_BASE_URL;
const TOKEN = __ENV.K6_SMOKE_TOKEN || '';

export default function () {
  const params = TOKEN ? { headers: { Authorization: `Bearer ${TOKEN}` } } : {};
  const res = http.get(`${BASE}/feed?guest=1&limit=25`, params);
  check(res, { '200': (r) => r.status === 200 });
  sleep(0.5 + Math.random() * 0.5);
}

export function handleSummary(data) {
  return {
    'load/k6/feed-read-summary.json': JSON.stringify(data, null, 2),
    'load/k6/feed-read-summary.txt': textSummary(data),
  };
}

function textSummary(data) {
  const d = data.metrics;
  const p95 = d.http_req_duration['p(95)'];
  const p99 = d.http_req_duration['p(99)'];
  const err = d.http_req_failed.rate;
  return `feed-read results
p95=${p95}ms
p99=${p99}ms
error_rate=${(err * 100).toFixed(2)}%
`;
}
