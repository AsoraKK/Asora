const baseUrl = process.argv[2];
const iterations = Number(process.argv[3] ?? 10);
if (!baseUrl) {
  console.error('Usage: node scripts/benchmarks/native-endpoint-benchmark.mjs <base-url> [iterations]');
  process.exit(2);
}

if (!Number.isInteger(iterations) || iterations < 1 || iterations > 1000) {
  console.error('iterations must be an integer between 1 and 1000');
  process.exit(2);
}

const accessToken = process.env.NATIVE_BENCHMARK_ACCESS_TOKEN;
const writesEnabled = process.env.NATIVE_BENCHMARK_ENABLE_WRITES === 'true';
const asyncPath = process.env.NATIVE_BENCHMARK_ASYNC_PATH;
const placement = process.env.NATIVE_BENCHMARK_PLACEMENT ?? 'unspecified';
const region = process.env.NATIVE_BENCHMARK_REGION ?? 'unspecified';
const commonHeaders = { accept: 'application/json' };
if (accessToken) commonHeaders.authorization = `Bearer ${accessToken}`;

const endpoints = [
  { name: 'A-health', method: 'GET', path: '/api/health', expectedStatuses: [200] },
  { name: 'A-ready', method: 'GET', path: '/api/ready', expectedStatuses: [200] },
  { name: 'B-discovery', method: 'GET', path: '/api/feed/discover', expectedStatuses: [200] },
  {
    name: 'C-transactional-write',
    method: 'POST',
    path: '/api/posts',
    enabled: Boolean(accessToken && writesEnabled),
    skipReason: accessToken ? 'set NATIVE_BENCHMARK_ENABLE_WRITES=true to enable writes' : 'NATIVE_BENCHMARK_ACCESS_TOKEN is not set',
    expectedStatuses: [201],
    init: () => ({
      headers: { ...commonHeaders, 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({ body: `benchmark-${crypto.randomUUID()}`, declaredCreationMode: 'human', geoScope: 'none' }),
    }),
  },
  {
    name: 'D-personal-feed',
    method: 'GET',
    path: '/api/feed',
    enabled: Boolean(accessToken),
    skipReason: 'NATIVE_BENCHMARK_ACCESS_TOKEN is not set',
    expectedStatuses: [200],
  },
  {
    name: 'E-async-completion',
    method: 'GET',
    path: asyncPath,
    enabled: Boolean(asyncPath),
    skipReason: 'set NATIVE_BENCHMARK_ASYNC_PATH to a protected completion probe',
    expectedStatuses: [200, 202],
  },
].map((endpoint) => ({ ...endpoint, enabled: endpoint.enabled !== false && Boolean(endpoint.path) }));
const samples = [];
for (const endpoint of endpoints) {
  if (!endpoint.enabled) {
    samples.push({ endpoint: endpoint.name, skipped: true, skipReason: endpoint.skipReason });
    continue;
  }
  for (let index = 0; index < iterations; index += 1) {
    const started = performance.now();
    let status = 0;
    let error = null;
    let correct = false;
    try {
      const init = endpoint.init?.() ?? { headers: commonHeaders };
      const response = await fetch(new URL(endpoint.path, baseUrl), { method: endpoint.method, ...init });
      status = response.status;
      correct = endpoint.expectedStatuses?.includes(status) ?? status < 500;
      await response.body?.cancel();
    } catch (cause) {
      error = cause instanceof Error ? cause.name : 'request_failed';
    }
    samples.push({ endpoint: endpoint.name, status, correct, error, durationMs: Number((performance.now() - started).toFixed(2)) });
  }
}
const report = {};
for (const endpoint of endpoints) {
  const endpointSamples = samples.filter((sample) => sample.endpoint === endpoint.name);
  if (endpointSamples[0]?.skipped) {
    report[endpoint.name] = { status: 'skipped', reason: endpointSamples[0].skipReason };
    continue;
  }
  const values = endpointSamples.map((sample) => sample.durationMs).sort((a, b) => a - b);
  const errors = endpointSamples.filter((sample) => sample.error || sample.status >= 500).length;
  const incorrect = endpointSamples.filter((sample) => !sample.correct).length;
  const percentile = (ratio) => values[Math.min(values.length - 1, Math.floor(values.length * ratio))];
  report[endpoint.name] = {
    status: 'measured',
    count: values.length,
    errorRate: errors / values.length,
    incorrectRate: incorrect / values.length,
    correctness: incorrect === 0,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
  };
}
console.log(JSON.stringify({
  baseUrl: new URL(baseUrl).origin,
  iterations,
  placement,
  region,
  writesEnabled,
  generatedAt: new Date().toISOString(),
  report,
}, null, 2));
