const baseUrl = process.argv[2];
const iterations = Number(process.argv[3] ?? 10);
if (!baseUrl) {
  console.error('Usage: node scripts/benchmarks/native-endpoint-benchmark.mjs <base-url> [iterations]');
  process.exit(2);
}

const endpoints = [
  { name: 'A-health', method: 'GET', path: '/api/health' },
  { name: 'A-ready', method: 'GET', path: '/api/ready' },
  { name: 'B-discovery', method: 'GET', path: '/api/feed/discover' },
];
const samples = [];
for (const endpoint of endpoints) {
  for (let index = 0; index < iterations; index += 1) {
    const started = performance.now();
    let status = 0;
    let error = null;
    try {
      const response = await fetch(new URL(endpoint.path, baseUrl), { method: endpoint.method, headers: { accept: 'application/json' } });
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
  const values = samples.filter((sample) => sample.endpoint === endpoint.name).map((sample) => sample.durationMs).sort((a, b) => a - b);
  const errors = samples.filter((sample) => sample.endpoint === endpoint.name && (sample.error || sample.status >= 500)).length;
  const percentile = (ratio) => values[Math.min(values.length - 1, Math.floor(values.length * ratio))];
  report[endpoint.name] = { count: values.length, errorRate: errors / values.length, p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99) };
}
console.log(JSON.stringify({ baseUrl: new URL(baseUrl).origin, iterations, generatedAt: new Date().toISOString(), report }, null, 2));
