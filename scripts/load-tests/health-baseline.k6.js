/**
 * LYTHAUS API BASELINE LOAD TEST
 * 
 * Tests /api/health endpoint to establish infrastructure baseline
 * 
 * Usage:
 *   k6 run scripts/load-tests/health-baseline.k6.js
 *   k6 run --out json=results/baseline.json scripts/load-tests/health-baseline.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const healthLatency = new Trend('health_latency_ms');
const healthSuccess = new Rate('health_success');

const BASE_URL = __ENV.K6_BASE_URL || 'https://asora-function-dev.azurewebsites.net';

export const options = {
  stages: [
    { duration: '15s', target: 10 },  // Warm-up
    { duration: '30s', target: 20 },  // Baseline load
    { duration: '30s', target: 50 },  // Medium load
    { duration: '15s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],  // 1s baseline (cold starts)
    'health_latency_ms': ['p(95)<1000'],
    'health_success': ['rate>0.95'],
    'http_req_failed': ['rate<0.05'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export function setup() {
  const warmup = http.get(`${BASE_URL}/api/health`);
  console.log(`Warm-up: ${warmup.status} in ${warmup.timings.duration}ms`);
  return { baseUrl: BASE_URL };
}

export default function (data) {
  const start = Date.now();
  const res = http.get(`${data.baseUrl}/api/health`, {
    headers: { 'Accept': 'application/json' },
  });
  const duration = Date.now() - start;
  
  healthLatency.add(duration);
  
  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'has status field': (r) => {
      try { return JSON.parse(r.body).status === 'healthy'; }
      catch { return false; }
    },
  });
  
  healthSuccess.add(ok);
  sleep(Math.random() * 0.3 + 0.1);
}

export function handleSummary(data) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const report = {
    timestamp: ts,
    baseUrl: BASE_URL,
    duration_ms: data.state.testRunDurationMs,
    metrics: {
      requests: data.metrics.http_reqs?.values?.count || 0,
      avg_ms: data.metrics.http_req_duration?.values?.avg?.toFixed(2),
      p95_ms: data.metrics.http_req_duration?.values['p(95)']?.toFixed(2),
      p99_ms: data.metrics.http_req_duration?.values['p(99)']?.toFixed(2),
      error_rate: (data.metrics.http_req_failed?.values?.rate * 100)?.toFixed(2) + '%',
    },
    thresholds_passed: Object.entries(data.metrics)
      .filter(([k, v]) => v.thresholds)
      .every(([k, v]) => Object.values(v.thresholds).every(t => t.ok)),
  };
  
  console.log('\n=== BASELINE RESULTS ===');
  console.log(`Requests: ${report.metrics.requests}`);
  console.log(`Avg: ${report.metrics.avg_ms}ms`);
  console.log(`P95: ${report.metrics.p95_ms}ms`);
  console.log(`P99: ${report.metrics.p99_ms}ms`);
  console.log(`Error Rate: ${report.metrics.error_rate}`);
  console.log(`Thresholds: ${report.thresholds_passed ? 'PASS' : 'FAIL'}`);
  
  return {
    'stdout': JSON.stringify(report, null, 2),
    [`results/baseline-${ts}.json`]: JSON.stringify(report, null, 2),
  };
}
