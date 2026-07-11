import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const latency = new Trend('alpha_feed_latency', true);
const errors = new Rate('alpha_feed_errors');

const BASE = (__ENV.ALPHA_API_BASE_URL || '').replace(/\/+$/, '');
const TOKEN = __ENV.ALPHA_SMOKE_TOKEN || '';
const TEST_SESSION_ID = __ENV.ALPHA_TEST_SESSION_ID || '';
const CUSTOM_FEED_ID = __ENV.ALPHA_CUSTOM_FEED_ID || '';
const EMPTY_PROFILE_ID = __ENV.ALPHA_EMPTY_PROFILE_ID || '';
const SMALL_PROFILE_ID = __ENV.ALPHA_SMALL_PROFILE_ID || '';
const POPULATED_PROFILE_ID = __ENV.ALPHA_POPULATED_PROFILE_ID || '';

for (const [name, value] of Object.entries({
  ALPHA_API_BASE_URL: BASE,
  ALPHA_SMOKE_TOKEN: TOKEN,
  ALPHA_TEST_SESSION_ID: TEST_SESSION_ID,
  ALPHA_CUSTOM_FEED_ID: CUSTOM_FEED_ID,
  ALPHA_EMPTY_PROFILE_ID: EMPTY_PROFILE_ID,
  ALPHA_SMALL_PROFILE_ID: SMALL_PROFILE_ID,
  ALPHA_POPULATED_PROFILE_ID: POPULATED_PROFILE_ID,
})) {
  if (!value) throw new Error(`${name} is required`);
}

const warmScenarios = [
  'discovery_warm',
  'following_warm',
  'custom_warm',
  'news_warm',
  'profile_empty_warm',
  'profile_small_warm',
  'profile_populated_warm',
  'pagination_warm',
  'refresh_warm',
];

const thresholds = {
  alpha_feed_errors: ['rate<0.01'],
};
for (const scenario of warmScenarios) {
  thresholds[`alpha_feed_latency{feed_scenario:${scenario}}`] = ['p(95)<200', 'p(99)<400'];
}

export const options = {
  scenarios: {
    cold_discovery: {
      executor: 'shared-iterations',
      exec: 'coldDiscovery',
      vus: 1,
      iterations: 1,
      maxDuration: '30s',
    },
    discovery_warm: scenario('discoveryWarm', '3s'),
    following_warm: scenario('followingWarm', '3s'),
    custom_warm: scenario('customWarm', '3s'),
    news_warm: scenario('newsWarm', '3s'),
    profile_empty_warm: scenario('profileEmptyWarm', '3s'),
    profile_small_warm: scenario('profileSmallWarm', '3s'),
    profile_populated_warm: scenario('profilePopulatedWarm', '3s'),
    pagination_warm: scenario('paginationWarm', '3s'),
    refresh_warm: scenario('refreshWarm', '3s'),
  },
  thresholds,
  summaryTrendStats: ['min', 'avg', 'med', 'p(75)', 'p(90)', 'p(95)', 'p(99)'],
};

function scenario(exec, startTime) {
  return {
    executor: 'constant-arrival-rate',
    exec,
    startTime,
    rate: Number(__ENV.ALPHA_FEED_RATE || 1),
    timeUnit: '1s',
    duration: __ENV.ALPHA_FEED_DURATION || '60s',
    preAllocatedVUs: 1,
    maxVUs: 3,
  };
}

function url(path) {
  return `${BASE}/${path.replace(/^\/+/, '')}`;
}

function request(feedScenario, path) {
  const response = http.get(url(path), {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
      'X-Test-Mode': 'true',
      'X-Test-Session-Id': TEST_SESSION_ID,
    },
    tags: { feed_scenario: feedScenario },
  });
  const ok = check(response, { [`${feedScenario} returns 200`]: (r) => r.status === 200 });
  latency.add(response.timings.duration, { feed_scenario: feedScenario });
  errors.add(!ok, { feed_scenario: feedScenario });
  return response;
}

export function coldDiscovery() {
  request('cold_discovery', 'feed/discover?limit=20');
}

export function discoveryWarm() {
  request('discovery_warm', 'feed/discover?limit=20');
  sleep(0.1);
}

export function followingWarm() {
  request('following_warm', 'feed?type=following&page=1&pageSize=20');
  sleep(0.1);
}

export function customWarm() {
  request('custom_warm', `custom-feeds/${encodeURIComponent(CUSTOM_FEED_ID)}/items?limit=20`);
  sleep(0.1);
}

export function newsWarm() {
  request('news_warm', 'feed/news?limit=20');
  sleep(0.1);
}

export function profileEmptyWarm() {
  request('profile_empty_warm', `feed/user/${encodeURIComponent(EMPTY_PROFILE_ID)}?limit=20`);
  sleep(0.1);
}

export function profileSmallWarm() {
  request('profile_small_warm', `feed/user/${encodeURIComponent(SMALL_PROFILE_ID)}?limit=20`);
  sleep(0.1);
}

export function profilePopulatedWarm() {
  request('profile_populated_warm', `feed/user/${encodeURIComponent(POPULATED_PROFILE_ID)}?limit=20`);
  sleep(0.1);
}

export function paginationWarm() {
  const first = request('pagination_warm', 'feed/discover?limit=10');
  let cursor;
  try {
    const body = first.json();
    cursor = body.nextCursor || body.meta?.nextCursor || body.data?.nextCursor || body.data?.meta?.nextCursor;
  } catch {
    cursor = undefined;
  }
  if (cursor) request('pagination_warm', `feed/discover?limit=10&cursor=${encodeURIComponent(cursor)}`);
  sleep(0.1);
}

export function refreshWarm() {
  const first = request('refresh_warm', 'feed/discover?limit=10');
  let cursor;
  try {
    const body = first.json();
    cursor = body.nextCursor || body.meta?.nextCursor || body.data?.nextCursor || body.data?.meta?.nextCursor;
  } catch {
    cursor = undefined;
  }
  if (cursor) request('refresh_warm', `feed/discover?limit=10&since=${encodeURIComponent(cursor)}`);
  sleep(0.1);
}

export function handleSummary(data) {
  return {
    'alpha-feed-performance-results.json': JSON.stringify(data, null, 2),
  };
}
