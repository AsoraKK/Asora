import http from 'k6/http';
import { check, sleep } from 'k6';
import { resolveUrl } from './utils.js';

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 5),
      duration: __ENV.DURATION || '60s',
    },
  },
  thresholds: {
    'http_req_duration{endpoint:feed}': ['p(95)<200', 'p(99)<400'],
    'http_req_failed{endpoint:feed}': ['rate<0.01'],
  },
  summaryTrendStats: ['min', 'avg', 'med', 'p(95)', 'p(99)'],
  tags: { test: 'feed-read' },
};

const BASE = __ENV.BASE_URL;
if (!BASE) throw new Error('BASE_URL is required');

const FEED_PATH = __ENV.FEED_PATH || '/api/feed?guest=1&limit=10';
const FEED_URL = resolveUrl(BASE, FEED_PATH);

export default function () {
  const res = http.get(FEED_URL, { tags: { endpoint: 'feed' } });
  check(res, { 'status 200/204': (r) => r.status === 200 || r.status === 204 });
  sleep(1);
}

export function handleSummary(data) {
  return { 'load/k6/feed-read-summary.json': JSON.stringify(data, null, 2) };
}
