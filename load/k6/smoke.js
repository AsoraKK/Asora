import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: Number(__ENV.VUS || 1),
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200', 'p(99)<400'],
  },
  summaryTrendStats: ['min', 'avg', 'med', 'p(95)', 'p(99)'],
  tags: { test: 'smoke' },
};

const BASE = __ENV.BASE_URL;
if (!BASE) throw new Error('BASE_URL is required');

export default function () {
  const res = http.get(`${BASE}/health`, { tags: { endpoint: 'health' } });
  check(res, { 'health 200': (r) => r.status === 200 });
  sleep(1);
}

export function handleSummary(data) {
  return { 'load/k6/smoke-summary.json': JSON.stringify(data, null, 2) };
}
