/**
 * k6 load & smoke test for GET /api/feed
 *
 * Scenarios
 * ─────────────────────────────────────────────────────────────────────────────
 * smoke       – 1 VU for 30 s, basic health check
 * guest_ramp  – anonymous discovery feed, ramps to 50 VU over 2 min
 * cursor_page – 3-page cursor pagination walk (1 VU, validates deduplication)
 * auth_home   – authenticated home feed (requires K6_JWT env var)
 *
 * Usage
 * ─────────────────────────────────────────────────────────────────────────────
 *   # Smoke run (default)
 *   BASE_URL=https://func-asora-dev.azurewebsites.net k6 run scripts/k6/feed-load.js
 *
 *   # Named scenario
 *   BASE_URL=https://func-asora-dev.azurewebsites.net \
 *     k6 run --env SCENARIO=guest_ramp scripts/k6/feed-load.js
 *
 *   # Authenticated (home feed)
 *   BASE_URL=https://func-asora-dev.azurewebsites.net \
 *   K6_JWT=<bearer-token> \
 *     k6 run --env SCENARIO=auth_home scripts/k6/feed-load.js
 *
 * ADR-001 Thresholds
 * ─────────────────────────────────────────────────────────────────────────────
 *   http_req_duration{scenario:guest_ramp}  p(95) < 200 ms
 *   http_req_duration{scenario:auth_home}   p(95) < 200 ms
 *   http_req_failed                         rate  < 0.01  (< 1 % errors)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:7072';
const JWT = __ENV.K6_JWT || '';
const SCENARIO = __ENV.SCENARIO || 'smoke';

const FEED_URL = `${BASE_URL}/api/feed`;

// ─────────────────────────────────────────────────────────────────────────────
// Custom metrics
// ─────────────────────────────────────────────────────────────────────────────

const feedLatency = new Trend('feed_latency_ms', true);
const dedupeErrors = new Rate('feed_dedupe_errors');

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds – ADR-001: p95 < 200 ms, < 1 % errors
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { scenario: 'smoke' },
      exec: 'guestFeed',
    },
    guest_ramp: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '60s', target: 50 },
        { duration: '30s', target: 0 },
      ],
      tags: { scenario: 'guest_ramp' },
      exec: 'guestFeed',
    },
    cursor_page: {
      executor: 'constant-vus',
      vus: 1,
      iterations: 20,
      tags: { scenario: 'cursor_page' },
      exec: 'paginationWalk',
    },
    auth_home: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '60s', target: 30 },
        { duration: '30s', target: 0 },
      ],
      tags: { scenario: 'auth_home' },
      exec: 'authFeed',
    },
  },

  thresholds: {
    'http_req_duration{scenario:guest_ramp}': ['p(95)<200'],
    'http_req_duration{scenario:auth_home}': ['p(95)<200'],
    'http_req_failed': ['rate<0.01'],
    feed_latency_ms: ['p(95)<200'],
    feed_dedupe_errors: ['rate==0'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function guestHeaders() {
  return { 'Accept': 'application/json' };
}

function authHeaders() {
  if (!JWT) {
    return guestHeaders();
  }
  return {
    'Accept': 'application/json',
    'Authorization': `Bearer ${JWT}`,
  };
}

/** Assert the canonical feed response shape. Returns the parsed body or null. */
function assertFeedShape(res) {
  const ok = check(res, {
    'HTTP 200': r => r.status === 200,
    'Content-Type is JSON': r => r.headers['Content-Type']?.includes('application/json'),
    'body.success is true': r => {
      try { return JSON.parse(r.body).success === true; } catch { return false; }
    },
    'body.data.items is array': r => {
      try { return Array.isArray(JSON.parse(r.body).data?.items); } catch { return false; }
    },
    'body.data.meta.count is number': r => {
      try {
        const count = JSON.parse(r.body).data?.meta?.count;
        return typeof count === 'number';
      } catch { return false; }
    },
    'Vary: Authorization header present': r => r.headers['Vary']?.includes('Authorization'),
    'X-Feed-Type header present': r => Boolean(r.headers['X-Feed-Type']),
    'X-Request-Duration is numeric': r => {
      const d = r.headers['X-Request-Duration'];
      return d !== undefined && Number.isFinite(Number(d));
    },
  });

  if (!ok) return null;

  try {
    return JSON.parse(res.body);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenarios
// ─────────────────────────────────────────────────────────────────────────────

/** Guest anonymous discovery feed */
export function guestFeed() {
  const start = Date.now();
  const res = http.get(FEED_URL, { headers: guestHeaders(), tags: { name: 'feed_guest' } });
  feedLatency.add(Date.now() - start);

  assertFeedShape(res);

  check(res, {
    'guest: Cache-Control has public': r =>
      r.headers['Cache-Control']?.includes('public') ?? false,
    'guest: Cache-Control has max-age': r =>
      r.headers['Cache-Control']?.includes('max-age') ?? false,
  });

  sleep(Math.random() * 1 + 0.5); // 0.5–1.5 s think time
}

/** 3-page cursor walk – verifies no duplicate post IDs across pages */
export function paginationWalk() {
  const seenIds = new Set();
  let cursor = null;
  let dupeFound = false;

  for (let page = 1; page <= 3; page++) {
    const url = cursor ? `${FEED_URL}?cursor=${encodeURIComponent(cursor)}&limit=10` : `${FEED_URL}?limit=10`;
    const res = http.get(url, { headers: guestHeaders(), tags: { name: `feed_page_${page}` } });

    const body = assertFeedShape(res);
    if (!body) break;

    const items = body.data?.items ?? [];

    check(res, {
      [`page ${page}: item count ≤ 10`]: () => items.length <= 10,
      [`page ${page}: items are objects`]: () => items.every(i => typeof i === 'object' && i !== null),
    });

    // Deduplication check
    for (const item of items) {
      if (seenIds.has(item.id)) {
        dupeFound = true;
        break;
      }
      seenIds.add(item.id);
    }

    dedupeErrors.add(dupeFound ? 1 : 0);

    cursor = body.data?.meta?.nextCursor;
    if (!cursor) break; // reached last page

    sleep(0.2); // short pause between pages
  }

  sleep(0.5);
}

/** Authenticated home feed (requires K6_JWT) */
export function authFeed() {
  const start = Date.now();
  const res = http.get(FEED_URL, { headers: authHeaders(), tags: { name: 'feed_auth' } });
  feedLatency.add(Date.now() - start);

  assertFeedShape(res);

  if (JWT) {
    check(res, {
      'auth: Cache-Control is private': r =>
        r.headers['Cache-Control']?.includes('private') ?? false,
      'auth: Cache-Control no-store': r =>
        r.headers['Cache-Control']?.includes('no-store') ?? false,
    });
  }

  sleep(Math.random() * 1.5 + 0.5); // 0.5–2 s think time
}
