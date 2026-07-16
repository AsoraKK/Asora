# Cloudflare read-permission recheck

Date: 2026-07-15

Source: [GitHub Actions run 29394873512](https://github.com/AsoraKK/Asora/actions/runs/29394873512) at commit `f5eff759c1c7710b0bce4b1088de53a20fb5e7a4`.

## Result

**PASS — audit-token permission blocker resolved.** The separate GitHub secret `CLOUDFLARE_AUDIT_API_TOKEN` verified active. All seven formerly denied GET requests returned successfully; `unavailablePermissions` and `blockers` were empty.

The workflow has GitHub `contents: read` permission and calls no Cloudflare mutation endpoint. Raw API responses remained in the gitignored runner artifact directory and were not uploaded. Only this sanitized aggregate result was retained.

## Rechecked calls

| Calls | Result | Purpose |
|---:|---|---|
| 2 × Registrar domain detail | Pass | Registrar expiry, renewal and lock audit for `lythaus.co` and `asora.co.za`. |
| 1 × Account redirect-list inventory | Pass | Identify account Bulk Redirect lists. |
| 2 × Normalization ruleset detail | Pass | Inspect `http_request_sanitize` on both zones. |
| 2 × L7 DDoS ruleset detail | Pass | Inspect `ddos_l7` on both zones. |

## Registrar and redirect findings

| Surface | Sanitized result |
|---|---|
| `lythaus.co` | Expiry 2027-07-12; auto-renew enabled; transfer lock enabled. |
| `asora.co.za` | Registrar status, expiry, renewal and lock values were not returned by the legacy registrar endpoint; record as **UNKNOWN**. |
| Account Bulk Redirect lists | None returned. |

## Ruleset aggregate findings

| Zone | Ruleset phase | Rules | Enabled | Actions |
|---|---|---:|---:|---|
| `lythaus.co` | `http_request_sanitize` | 4 | 1 | `rewrite`: 4 |
| `lythaus.co` | `ddos_l7` | 148 | 147 | `block`: 108; `ddos_dynamic`: 37; `log`: 3 |
| `asora.co.za` | `http_request_sanitize` | 4 | 1 | `rewrite`: 4 |
| `asora.co.za` | `ddos_l7` | 148 | 147 | `block`: 108; `ddos_dynamic`: 37; `log`: 3 |

## Gate effect

The Cloudflare read-permission blocker reported in the 2026-07-13 domain audit is resolved. This is not a production-cutover approval. The overall result remains **NO-GO** until the independent Azure origin-protection, API-contract, browser-authentication, public-route, provider-side validation, rollback, and PR-sequencing gates pass.
