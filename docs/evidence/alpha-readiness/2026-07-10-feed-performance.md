# Feed Performance Baseline and Release Gate

Status: **failed Alpha gate; exact candidate not measured**
Measured: 2026-07-10
Target: representative warm path p95 below `200 ms`, p99 below `400 ms`, errors below `1%`

## Current reachable dev baseline

Target: `asora-function-dev.azurewebsites.net`
Release SHA: unknown; this deployment is not release evidence
Method: 30 sequential anonymous HTTPS requests per path from the operator workstation in South Africa. The run was read-only and did not seed representative data or measure Azure dependency/RU counters.

| Scenario | p50 | p75 | p90 | p95 | p99 | Errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Legacy guest `/api/feed?guest=1&limit=10` | 630.59 ms | 652.49 ms | 676.32 ms | 844.97 ms | 8126.58 ms | 0% |
| Discovery `/api/feed/discover?limit=10` | 600.38 ms | 610.70 ms | 642.27 ms | 658.73 ms | 694.02 ms | 0% |

Result: **failed**. No ADR lowers the target.

## Remediation implemented

- Removed the arbitrary 50-followee visibility ceiling.
- Replaced broad post selection with explicit feed-card fields.
- Added Cosmos composite indexes for ranked timestamp/ID retrieval.
- Batched enrichment and made expensive ranking opt-in for Alpha.
- Added stable cursor, cache privacy, timeout, and controlled 503 coverage.
- Added `load/k6/alpha-feed-matrix.js` for cold/warm discovery, following, custom, News Board, profile, empty/small/populated, pagination, and refresh scenarios.
- Added `alpha-feed-performance.yml`, which verifies exact successful CI before running the matrix.

## Required release measurement

Run the matrix against the exact deployed SHA with representative seeded identities and record p50, p75, p90, p95, p99, error rate, Cosmos RU, PostgreSQL time, reputation time, Function duration, cache hit ratio, cold starts, payload size, and network region. Cold-start results must be separate. A result above `200 ms` p95 requires further remediation or an approved ADR amendment; an interim threshold may not exceed `400 ms` p95 without explicit approval.
