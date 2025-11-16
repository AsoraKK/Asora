import http from 'k6/http';
import { check } from 'k6';
import { resolveUrl } from './utils.js';

const BASE = __ENV.K6_BASE_URL;
const AUTH_TOKEN = __ENV.K6_SMOKE_TOKEN;

if (!BASE) {
  throw new Error('K6_BASE_URL environment variable is required');
}

if (!AUTH_TOKEN) {
  throw new Error('K6_SMOKE_TOKEN is required to run chaos scenarios against authenticated endpoints');
}

const allowedStatuses = [200, 201, 202, 400, 403, 429, 503];
const chaosScenarioHeader = (scene) => ({
  'x-asora-chaos-enabled': 'true',
  'x-asora-chaos-scenario': scene,
});

const createHeaders = (scene) => ({
  ...chaosScenarioHeader(scene),
  Authorization: `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json',
});

const getContentType = (res) =>
  (res.headers['Content-Type'] || res.headers['content-type'] || '').toLowerCase();

const hasStructuredError = (res) => {
  if (res.status < 400) return true;
  try {
    const data = res.json();
    return typeof data === 'object' && Boolean(data?.error?.code) && Boolean(data?.error?.kind);
  } catch {
    return false;
  }
};

const scenarioCheck = (res) =>
  check(res, {
    'status in allowed set': (r) => allowedStatuses.includes(r.status),
    'json response': (r) => getContentType(r).includes('application/json'),
    'structured error': (r) => hasStructuredError(r),
  });

export const options = {
  scenarios: {
    chaos_hive_moderation: {
      executor: 'constant-vus',
      vus: Number(__ENV.CHAOS_HIVE_VUS || 1),
      duration: __ENV.CHAOS_HIVE_DURATION || '60s',
      exec: 'chaosHiveModeration',
    },
    chaos_feed_cosmos_reads: {
      executor: 'constant-vus',
      vus: Number(__ENV.CHAOS_FEED_VUS || 1),
      duration: __ENV.CHAOS_FEED_DURATION || '60s',
      exec: 'chaosFeedCosmosReads',
    },
    chaos_post_cosmos_writes: {
      executor: 'constant-vus',
      vus: Number(__ENV.CHAOS_POST_VUS || 1),
      duration: __ENV.CHAOS_POST_DURATION || '60s',
      exec: 'chaosPostCosmosWrites',
    },
  },
  thresholds: {
    'http_req_failed{scenario:chaos_hive_moderation}': ['rate<0.2'],
    'checks{scenario:chaos_hive_moderation}': ['rate>0.85'],
    'http_req_duration{scenario:chaos_hive_moderation}': ['p(95)<1500', 'p(99)<2500'],

    'http_req_failed{scenario:chaos_feed_cosmos_reads}': ['rate<0.1'],
    'checks{scenario:chaos_feed_cosmos_reads}': ['rate>0.8'],
    'http_req_duration{scenario:chaos_feed_cosmos_reads}': ['p(95)<2000', 'p(99)<3000'],

    'http_req_failed{scenario:chaos_post_cosmos_writes}': ['rate<0.15'],
    'checks{scenario:chaos_post_cosmos_writes}': ['rate>0.8'],
    'http_req_duration{scenario:chaos_post_cosmos_writes}': ['p(95)<1500', 'p(99)<2500'],
  },
  summaryTrendStats: ['min', 'avg', 'med', 'p(95)', 'p(99)'],
  tags: { test: 'chaos' },
};

const flagPayload = JSON.stringify({
  contentId: 'chaos-sample-content',
  contentType: 'post',
  reason: 'spam',
  urgency: 'low',
});

export function chaosHiveModeration() {
  const res = http.post(resolveUrl(BASE, '/api/moderation/flag'), flagPayload, {
    headers: createHeaders('hive_timeout'),
    tags: { scenario: 'chaos_hive_moderation', endpoint: 'moderation-flag' },
  });
  scenarioCheck(res);
}

export function chaosFeedCosmosReads() {
  const res = http.get(resolveUrl(BASE, '/api/feed?guest=1&limit=5'), {
    headers: createHeaders('cosmos_read_errors'),
    tags: { scenario: 'chaos_feed_cosmos_reads', endpoint: 'feed' },
  });
  scenarioCheck(res);
}

export function chaosPostCosmosWrites() {
  const res = http.post(resolveUrl(BASE, '/api/moderation/flag'), flagPayload, {
    headers: createHeaders('cosmos_write_errors'),
    tags: { scenario: 'chaos_post_cosmos_writes', endpoint: 'moderation-flag' },
  });
  scenarioCheck(res);
}

export function handleSummary(data) {
  return {
    'load/k6/chaos-summary.json': JSON.stringify(data, null, 2),
  };
}
