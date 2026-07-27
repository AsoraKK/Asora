# PlanetScale region and tier benchmark

The benchmark must be run only against synthetic development branches and
cache-disabled Hyperdrive configurations. It must not use production tokens or
production records.

Measure Frankfurt (`eu-central`), Dublin (`eu-west`), and London
(`aws-eu-west-2`) with the same PostgreSQL 18 patch, schema, synthetic data,
role grants, and Worker build. Compare PS-5 ARM HA and PS-10 ARM HA where the
organization plan permits both.

Run from Johannesburg fixed broadband and mobile connections where available.
Record p50, p95, p99, error rate, timeout rate, transaction duration,
read-after-write correctness, retry behaviour, rollback correctness, queue
completion latency, and cost estimate for endpoint classes A–E. Benchmark the
public API placed and unplaced; placement is not assumed for Queue/Cron jobs.

The harness is `scripts/benchmarks/native-endpoint-benchmark.mjs`. It emits a
sanitised JSON report containing URLs, status codes, timings, and correctness
flags only.
