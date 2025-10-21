import http from 'k6/http';
import { check, sleep } from 'k6';
import { resolveUrl } from './utils.js';

const BASE = __ENV.BASE_URL;
if (!BASE) throw new Error('BASE_URL is required');

const HEALTH_PATH = __ENV.HEALTH_PATH || '/api/health';
const HEALTH_URL = resolveUrl(BASE, HEALTH_PATH);
const WARMUP_DURATION = __ENV.WARMUP_DURATION || '10s';
const TEST_VUS = Number(__ENV.VUS || 1);
const TEST_DURATION = __ENV.DURATION || '30s';

export const options = {
  scenarios: {
    warmup: {
      executor: 'constant-vus',
      exec: 'warmup',
      vus: 1,
      duration: WARMUP_DURATION,
      gracefulStop: '0s',
      tags: { test: 'smoke', phase: 'warmup' },
    },
    steady: {
      executor: 'constant-vus',
      exec: 'steady',
      vus: TEST_VUS,
      duration: TEST_DURATION,
      startTime: WARMUP_DURATION,
      gracefulStop: '0s',
      tags: { test: 'smoke', phase: 'steady' },
    },
  },
  thresholds: {
    'http_req_failed{scenario:steady}': ['rate<0.01'],
    'http_req_duration{scenario:steady}': ['p(95)<200', 'p(99)<400'],
  },
  summaryTrendStats: ['min', 'avg', 'med', 'p(95)', 'p(99)'],
};

function hitHealth() {
  const res = http.get(HEALTH_URL, { tags: { endpoint: 'health' } });
  check(res, { 'health 200': (r) => r.status === 200 });
  sleep(1);
}

export function warmup() {
  hitHealth();
}

export function steady() {
  hitHealth();
}

export function handleSummary(data) {
  return { 'load/k6/smoke-summary.json': JSON.stringify(data, null, 2) };
}
