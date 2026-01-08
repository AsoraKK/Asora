/**
 * LYTHAUS FEED LOAD TEST
 * 
 * k6 load test script for /api/feed endpoint
 * Target: p95 response time < 200ms under load
 * 
 * Usage:
 *   k6 run scripts/load-tests/feed-load.k6.js
 *   k6 run --vus 100 --duration 5m scripts/load-tests/feed-load.k6.js
 *   K6_BASE_URL=https://asora-function-dev.azurewebsites.net k6 run scripts/load-tests/feed-load.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const feedLatency = new Trend('feed_latency_ms');
const feedP95 = new Trend('feed_p95_ms');
const feedErrorRate = new Rate('feed_errors');
const feedSuccessRate = new Rate('feed_success');

// Configuration
const BASE_URL = __ENV.K6_BASE_URL || 'https://asora-function-dev.azurewebsites.net';

export const options = {
  // Staged load test
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 VUs
    { duration: '1m', target: 50 },    // Ramp up to 50 VUs
    { duration: '2m', target: 100 },   // Ramp up to 100 VUs (peak)
    { duration: '1m', target: 50 },    // Ramp down
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  
  // Performance thresholds
  thresholds: {
    'http_req_duration': ['p(95)<200'],        // p95 < 200ms (target)
    'http_req_duration': ['p(99)<500'],        // p99 < 500ms
    'feed_latency_ms': ['p(95)<200'],          // Custom feed p95 < 200ms
    'feed_errors': ['rate<0.01'],              // Error rate < 1%
    'feed_success': ['rate>0.99'],             // Success rate > 99%
    'http_req_failed': ['rate<0.01'],          // k6 built-in failure rate
  },
  
  // Summary output
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Test scenarios
export function setup() {
  // Warm-up request
  const warmupRes = http.get(`${BASE_URL}/api/health`);
  console.log(`Warm-up health check: ${warmupRes.status}`);
  
  return {
    baseUrl: BASE_URL,
    startTime: new Date().toISOString(),
  };
}

export default function (data) {
  // Test feed endpoint with various pagination scenarios
  const scenarios = [
    { name: 'feed_default', url: `${data.baseUrl}/api/feed` },
    { name: 'feed_limit_10', url: `${data.baseUrl}/api/feed?limit=10` },
    { name: 'feed_limit_20', url: `${data.baseUrl}/api/feed?limit=20` },
    { name: 'feed_limit_50', url: `${data.baseUrl}/api/feed?limit=50` },
  ];
  
  // Pick a random scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Lythaus-LoadTest/1.0',
    },
    tags: { scenario: scenario.name },
  };
  
  const startTime = Date.now();
  const res = http.get(scenario.url, params);
  const duration = Date.now() - startTime;
  
  // Record custom metrics
  feedLatency.add(duration);
  feedP95.add(duration);
  
  // Check response
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has items': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.items) || Array.isArray(body.data) || Array.isArray(body);
      } catch {
        return false;
      }
    },
    'response time < 200ms': (r) => r.timings.duration < 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  feedSuccessRate.add(success);
  feedErrorRate.add(!success);
  
  // Small random sleep to simulate realistic traffic
  sleep(Math.random() * 0.5 + 0.1);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const report = {
    timestamp: timestamp,
    baseUrl: BASE_URL,
    duration: data.state.testRunDurationMs,
    metrics: {
      http_reqs: data.metrics.http_reqs?.values?.count || 0,
      http_req_duration_avg: data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0,
      http_req_duration_p95: data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0,
      http_req_duration_p99: data.metrics.http_req_duration?.values['p(99)']?.toFixed(2) || 0,
      feed_latency_p95: data.metrics.feed_latency_ms?.values['p(95)']?.toFixed(2) || 0,
      feed_errors: data.metrics.feed_errors?.values?.rate?.toFixed(4) || 0,
      feed_success: data.metrics.feed_success?.values?.rate?.toFixed(4) || 0,
      vus_max: data.metrics.vus?.values?.max || 0,
    },
    thresholds: {
      passed: Object.values(data.thresholds || {}).filter(t => t.ok).length,
      failed: Object.values(data.thresholds || {}).filter(t => !t.ok).length,
    },
    status: Object.values(data.thresholds || {}).every(t => t.ok) ? 'PASS' : 'FAIL',
  };
  
  console.log('\n========================================');
  console.log('LYTHAUS FEED LOAD TEST RESULTS');
  console.log('========================================');
  console.log(`Status: ${report.status}`);
  console.log(`Total Requests: ${report.metrics.http_reqs}`);
  console.log(`Avg Response Time: ${report.metrics.http_req_duration_avg}ms`);
  console.log(`P95 Response Time: ${report.metrics.http_req_duration_p95}ms`);
  console.log(`P99 Response Time: ${report.metrics.http_req_duration_p99}ms`);
  console.log(`Error Rate: ${(report.metrics.feed_errors * 100).toFixed(2)}%`);
  console.log(`Max VUs: ${report.metrics.vus_max}`);
  console.log(`Thresholds: ${report.thresholds.passed} passed, ${report.thresholds.failed} failed`);
  console.log('========================================\n');
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    [`scripts/load-tests/results/feed-load-${timestamp}.json`]: JSON.stringify(report, null, 2),
  };
}

// Helper for text summary
function textSummary(data, options) {
  let output = '';
  output += `\n     scenarios: (100.00%) 1 scenario, ${data.metrics.vus?.values?.max || 0} max VUs, ${Math.round(data.state.testRunDurationMs / 1000)}s max duration\n`;
  output += `         vus: ${data.metrics.vus?.values?.value || 0} (max: ${data.metrics.vus?.values?.max || 0})\n`;
  output += `    http_reqs: ${data.metrics.http_reqs?.values?.count || 0}\n`;
  output += `    http_req_duration: avg=${data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}ms p95=${data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0}ms\n`;
  return output;
}
