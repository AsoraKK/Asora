# Lythaus domain cutover runbook

## Gate

Do not perform provider writes unless both zones, Pages, Workers, custom domains/routes, Access, rulesets, production Azure origin, CORS, OAuth callbacks, certificates, secrets, and rollback snapshots are verified. Any `UNKNOWN` is `NO-GO` for the affected write.

## Pre-cutover capture

Store raw exports only under `.artifacts/cloudflare-audit/` and commit sanitized summaries. Capture DNS, Pages domains/deployments, Worker routes/custom domains/version, Access apps/policies, redirect/rulesets, Azure app-setting names/redacted presence, platform CORS, and OAuth callbacks. Record exact repository SHA and provider deployment IDs.

## Staging sequence

1. Re-run `scripts/cloudflare/audit-domains.ps1`; require a verified read-only token and zero required-permission failures.
2. Identify the marketing, Flutter, and control-panel Pages projects by source, build output, response content, and deployment SHA.
3. Identify the production and staging Azure Function Apps; reject any ambiguous or development origin.
4. Configure the gateway staging `ORIGIN_BASE`, secret `ORIGIN_AUTH_TOKEN`, rate-limit KV binding, logs, and `api.staging.lythaus.co` custom domain.
5. Set the matching Azure `ORIGIN_GATEWAY_TOKEN`, exact staging CORS origins, and OAuth callback; keep `ORIGIN_GATEWAY_AUTH_REQUIRED=false` initially.
6. Deploy immutable exact-SHA marketing, Flutter, gateway, Functions, and control-panel artifacts.
7. Verify DNS/TLS, `/api/health`, discovery, preflight, auth code/PKCE/token/userinfo, protected reads, controlled writes, moderation, and DSR-safe operations.
8. Verify Azure hostnames are absent from browser assets, redirects, errors, and OpenAPI.
9. Enable `ORIGIN_GATEWAY_AUTH_REQUIRED=true`; repeat health, auth, monitoring, deployment, and emergency-access checks.
10. Exercise rollback, restore staging, and repeat all smoke tests.

Do not attach staging admin domains unless the UI, API, Access policies, audience validation, and service-token smoke path are all ready.

## Production sequence

1. Require a successful staging/rollback packet on the exact production SHA.
2. Attach `lythaus.co` to the identified marketing Pages project and verify canonical/sitemap output.
3. Configure `www.lythaus.co` permanent path/query-preserving redirect.
4. Attach `app.lythaus.co` to the identified Flutter Pages project; verify SPA refresh and OAuth callback allowlist.
5. Attach `api.lythaus.co` to the verified production gateway/origin; verify CORS, auth, cache bypass, controlled writes, and origin concealment.
6. Attach administration domains only after Access and origin-role checks pass.
7. Begin legacy web redirects and API compatibility proxying; do not delete legacy bindings.
8. Record post-cutover DNS, certificate, Pages, Worker, Access, CORS, OAuth, monitoring, and exact deployment identifiers.

## Rollback order

1. Restore the previous Worker deployment version.
2. Restore previous Worker custom-domain/route bindings.
3. Restore the previous Pages deployments and custom-domain bindings.
4. Restore previous DNS and redirect/ruleset configuration.
5. Restore prior Azure CORS, OAuth callbacks, and origin-token enforcement state.
6. Run health, discovery, auth, protected-cache, and Access tests.
7. Compare authoritative DNS and edge routing to the pre-cutover snapshot and eliminate split-brain state.

Rollback must use exported, still-existing resources. Initial cutover does not delete old DNS, bindings, versions, Access applications, or compatibility routes.

## Current execution

On 2026-07-13 no staging or production provider change was applied. Rollback is documented but not proven.
