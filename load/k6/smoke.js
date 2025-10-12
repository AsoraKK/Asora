import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const options = {
  vus: Number(__ENV.K6_VUS || 5),
  duration: __ENV.K6_DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],                 // error_rate < 1%
    http_req_duration: ['p(95)<200', 'p(99)<400'],  // p95/p99
  },
  summaryTrendStats: ['min','avg','med','p(95)','p(99)'],
};

const BASE = __ENV.K6_BASE_URL;
if (!BASE || /your-staging\.example\.com/.test(BASE)) {
  throw new Error('K6_BASE_URL is missing or still a placeholder. Set a real URL in env/vars.');
}
const TOKEN = __ENV.K6_SMOKE_TOKEN || '';

export default function () {
  const params = TOKEN ? { headers: { Authorization: `Bearer ${TOKEN}` } } : {};

  const r1 = http.get(`${BASE}/health`, params);
  check(r1, { 'health 200': (res) => res.status === 200 });

  const r2 = http.get(`${BASE}/feed?guest=1&limit=10`, params);
  check(r2, {
    'feed 200': (res) => res.status === 200,
    'feed JSON': (res) => res.headers['Content-Type']?.includes('application/json'),
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'load/k6/smoke-summary.json': JSON.stringify(data, null, 2),
    'load/k6/smoke-summary.txt': textSummary(data),
  };
}

// Minimal text summary to file
function textSummary(data) {
  const d = data.metrics;
  const p95 = d.http_req_duration['p(95)'];
  const p99 = d.http_req_duration['p(99)'];
  const err = d.http_req_failed.rate;
  return `smoke results
p95=${p95}ms
p99=${p99}ms
error_rate=${(err*100).toFixed(2)}%
`;
}
