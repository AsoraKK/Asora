# Live Contract Report — 2026-07-10

Status: **not passed for release**

Local command: `npm run openapi:test:contract`
Local result: 26 non-live contracts passed; 11 live contracts skipped because the previously configured regional staging hostname did not resolve. This is not release validation.

The suite now uses the canonical `ALPHA_API_BASE_URL`, supports an isolated private write/delete contract, and requires `REQUIRE_LIVE_CONTRACTS=true` in release workflows. Missing URL, missing token, unreachable TLS/DNS, or any required skip fails the release. Exact-SHA live evidence will be emitted by the protected deployment workflow; it has not run for this candidate.
