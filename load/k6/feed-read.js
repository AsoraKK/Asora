import http from 'k6/http';
import { check, sleep } from 'k6';

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
    'http_req_duration{endpoint:feed}': ['p(95)<200', 'p(99)<400'],
  },
  summaryTrendStats: ['min', 'avg', 'med', 'p(95)', 'p(99)'],
  tags: { test: 'feed-read' },
};

const BASE = __ENV.BASE_URL;
if (!BASE) throw new Error('BASE_URL is required');

export default function () {
  const res = http.get(`${BASE}/feed?guest=1&limit=10`, { tags: { endpoint: 'feed' } });
  check(res, { 'status 200/204': (r) => r.status === 200 || r.status === 204 });
  sleep(1);
}

export function handleSummary(data) {
  return { 'load/k6/feed-read-summary.json': JSON.stringify(data, null, 2) };
}
