const baseUrl = process.argv[2];
const iterations = Number(process.argv[3] ?? 10);
if (!baseUrl) {
  console.error('Usage: node scripts/benchmarks/native-endpoint-benchmark.mjs <base-url> [iterations]');
  process.exit(2);
}

const accessToken = process.env.NATIVE_BENCHMARK_ACCESS_TOKEN;
const writesEnabled = process.env.NATIVE_BENCHMARK_ENABLE_WRITES === 'true';
const asyncPath = process.env.NATIVE_BENCHMARK_ASYNC_PATH;
const commonHeaders = { accept: 'application/json' };
if (accessToken) commonHeaders.authorization = `Bearer ${accessToken}`;

const endpoints = [
  { name: 'A-health', method: 'GET', path: '/api/health' },
  { name: 'A-ready', method: 'GET', path: '/api/ready' },
  { name: 'B-discovery', method: 'GET', path: '/api/feed/discover' },
  {
    name: 'C-transactional-write',
    method: 'POST',
    path: '/api/posts',
    enabled: Boolean(accessToken && writesEnabled),
    skipReason: accessToken ? 'set NATIVE_BENCHMARK_ENABLE_WRITES=true to enable writes' : 'NATIVE_BENCHMARK_ACCESS_TOKEN is not set',
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
  },
  {
    name: 'E-async-completion',
    method: 'GET',
    path: asyncPath,
    enabled: Boolean(asyncPath),
    skipReason: 'set NATIVE_BENCHMARK_ASYNC_PATH to a protected completion probe',
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
    try {
      const init = endpoint.init?.() ?? { headers: commonHeaders };
      const response = await fetch(new URL(endpoint.path, baseUrl), { method: endpoint.method, ...init });
      status = response.status;
      await response.arrayBuffer();
    } catch (cause) {
      error = cause instanceof Error ? cause.name : 'request_failed';
    }
    samples.push({ endpoint: endpoint.name, status, error, durationMs: Number((performance.now() - started).toFixed(2)) });
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
  const percentile = (ratio) => values[Math.min(values.length - 1, Math.floor(values.length * ratio))];
  report[endpoint.name] = { status: 'measured', count: values.length, errorRate: errors / values.length, p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99) };
}
console.log(JSON.stringify({
  baseUrl: new URL(baseUrl).origin,
  iterations,
  writesEnabled,
  generatedAt: new Date().toISOString(),
  report,
}, null, 2));
