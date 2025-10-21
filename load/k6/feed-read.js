import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { clamp, deterministicJitter, durationToMs, resolveUrl } from './utils.js';

const BASE = __ENV.BASE_URL;
if (!BASE) throw new Error('BASE_URL is required');

const FEED_PATH = __ENV.FEED_PATH || '/api/feed?guest=1&limit=10';
const FEED_URL = resolveUrl(BASE, FEED_PATH);

const WARMUP_DURATION = __ENV.FEED_WARMUP_DURATION || '15s';
const STEADY_DURATION = __ENV.DURATION || '60s';
const STEADY_VUS = Number(__ENV.VUS || 5);

const BASE_SLEEP_SECONDS = Number(__ENV.FEED_BASE_SLEEP || 1);
const JITTER_SECONDS = Number(__ENV.FEED_JITTER || 0.35);
const WARMUP_BASE_SLEEP = Number(__ENV.FEED_WARMUP_SLEEP || BASE_SLEEP_SECONDS);
const WARMUP_JITTER = Number(__ENV.FEED_WARMUP_JITTER || 0.2);

const SLOW_THRESHOLD_MS = Number(__ENV.FEED_SLOW_THRESHOLD_MS || 180);
const RECOVERY_RATIO = Number(__ENV.FEED_RECOVERY_RATIO || 0.003);
const MAX_RECOVERY_SECONDS = Number(__ENV.FEED_MAX_RECOVERY || 0.6);
const SAFETY_WINDOW = __ENV.FEED_SAFETY_WINDOW || '2500ms';

const STEADY_DURATION_MS = durationToMs(STEADY_DURATION);
const SAFETY_WINDOW_MS = durationToMs(SAFETY_WINDOW);

export const options = {
  scenarios: {
    warmup: {
      executor: 'constant-vus',
      exec: 'warmup',
      vus: 1,
      duration: WARMUP_DURATION,
      gracefulStop: '0s',
      tags: { test: 'feed-read', phase: 'warmup' },
    },
    steady: {
      executor: 'constant-vus',
      exec: 'steady',
      vus: STEADY_VUS,
      duration: STEADY_DURATION,
      startTime: WARMUP_DURATION,
      gracefulStop: '10s',
      tags: { test: 'feed-read', phase: 'steady' },
    },
  },
  thresholds: {
    'http_req_duration{scenario:steady,endpoint:feed}': ['p(95)<200', 'p(99)<400'],
    'http_req_failed{scenario:steady,endpoint:feed}': ['rate<0.01'],
  },
  summaryTrendStats: ['min', 'avg', 'med', 'p(95)', 'p(99)'],
  tags: { test: 'feed-read' },
};

function fetchFeed() {
  const res = http.get(FEED_URL, { tags: { endpoint: 'feed', phase: exec.scenario.name } });
  check(res, { 'status 200/204': (r) => r.status === 200 || r.status === 204 });
  return res;
}

function adaptiveSleep(baseSeconds, jitterSeconds, responseDurationMs, includeRecovery = true) {
  const jitter = deterministicJitter(exec.vu.idInTest, exec.vu.iterationInScenario, jitterSeconds);
  const recovery = includeRecovery && responseDurationMs > SLOW_THRESHOLD_MS
    ? clamp((responseDurationMs - SLOW_THRESHOLD_MS) * RECOVERY_RATIO, 0, MAX_RECOVERY_SECONDS)
    : 0;
  return clamp(baseSeconds + jitter + recovery, 0.2);
}

function steadyShouldSkipIteration() {
  const elapsedMs = exec.scenario.timeInScenario * 1000;
  const remainingMs = STEADY_DURATION_MS - elapsedMs;
  return remainingMs <= SAFETY_WINDOW_MS;
}

export function warmup() {
  const res = fetchFeed();
  sleep(adaptiveSleep(WARMUP_BASE_SLEEP, WARMUP_JITTER, res.timings.duration));
}

export function steady() {
  if (steadyShouldSkipIteration()) {
    const elapsedMs = exec.scenario.timeInScenario * 1000;
    const remainingMs = Math.max(0, STEADY_DURATION_MS - elapsedMs);
    if (remainingMs > 0) {
      sleep(remainingMs / 1000);
    }
    return;
  }

  const res = fetchFeed();
  sleep(adaptiveSleep(BASE_SLEEP_SECONDS, JITTER_SECONDS, res.timings.duration));
}

export function handleSummary(data) {
  return { 'load/k6/feed-read-summary.json': JSON.stringify(data, null, 2) };
}
