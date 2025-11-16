## Chaos Testing with k6

The `canary-k6` workflow now includes an additional `canary-k6-chaos` job that injects controlled dependency failures and validates graceful degradation before deploying to `asora-dev`.

### How chaos works

- `CHAOS_ENABLED=true` (set automatically in the chaos job) enables the code paths.
- Requests must send `x-asora-chaos-enabled: true` plus `x-asora-chaos-scenario` with one of:
  - `hive_timeout`
  - `hive_5xx`
  - `cosmos_read_errors`
  - `cosmos_write_errors`
  - `pg_connection_errors`
- The chaos helpers wrap Hive and Cosmos calls and throw structured `ChaosError` objects that Surface 4xx/503 responses instead of crashing or leaking stack traces.

### Running chaos tests locally

1. Install k6, e.g. `brew install k6` or `docker run -it --rm -e K6_BASE_URL -e K6_SMOKE_TOKEN -v "$PWD":/work -w /work grafana/k6`
2. Provide a valid bearer token in `K6_SMOKE_TOKEN` that can call protected endpoints (the workflow already does this via secrets).
3. Set the base URL (default `https://asora-function-dev.azurewebsites.net`) via `K6_BASE_URL`.
4. Run the chaos script:

   ```bash
   CHAOS_ENABLED=true \
   K6_BASE_URL="${K6_BASE_URL:-https://asora-function-dev.azurewebsites.net}" \
   K6_SMOKE_TOKEN="${K6_SMOKE_TOKEN}" \
   k6 run load/k6/chaos.js
   ```

   The script contains three scenarios:
   - `chaos_hive_moderation`: exercise `/api/moderation/flag` with Hive timeout/5xx.
   - `chaos_feed_cosmos_reads`: reads `/api/feed` while Cosmos read errors are simulated.
   - `chaos_post_cosmos_writes`: exercises the flag endpoint under Cosmos write failures.

The chaos job enforces looser thresholds (higher tolerances for failures) while still requiring structured JSON responses, bounded latency, and error rates below the configured limits. Failures block the workflow just like the standard k6 job.
