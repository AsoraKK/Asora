# Pre-cutover state — 2026-07-13

## Decision

`NO-GO`. The Azure MVP origin was captured read-only, but no Cloudflare provider snapshot could be completed because `CLOUDFLARE_AUDIT_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` were absent. Raw local observations are under the gitignored `.artifacts/cloudflare-audit/` directory.

## Repository

- Base branch: `codex/alpha-release-candidate`
- Base SHA: `0cb3ffdeca506e891553c74b9e8b66de8f60890b`
- Migration branch: `codex/lythaus-domain-migration`
- PR 452: open draft, migration stacked on its head
- Migration scope: 136 files relative to the stacked base
- Conflict map: 52 migration paths overlap PR 452

## Azure MVP origin

- Function App: `asora-function-dev` in `asora-psql-flex`, North Europe
- State/runtime: running, Node 22, Flex Consumption FC1
- Deployment: immutable package SHA matches PR 452, not the unmerged PR 453 candidate
- Health/readiness: `/api/health` and `/api/ready` returned HTTP 200; Cosmos readiness passed
- Platform CORS: does not allow `https://app.lythaus.co`
- Gateway origin authentication: absent or disabled
- Direct-origin access: public network access remains enabled
- Provider writes: none

The sanitized setting-name/state and resource snapshot is in `2026-07-13-azure-mvp-audit.md` and `.json`.

## Public observations

| Hostname | DNS/TLS/HTTP observation |
|---|---|
| `lythaus.co` and intended subdomains | Cloudflare nameservers observed for the zone; target hosts do not resolve; TLS/HTTP unavailable |
| `asora.co.za` | Cloudflare-proxied, HTTP 200, Google Trust Services certificate valid through 2026-08-15; no HSTS observed |
| `www.asora.co.za` | Cloudflare-proxied, HTTP 200; not redirected |
| `admin-api.asora.co.za` | Cloudflare-proxied; HTTP 302 Access challenge; HSTS and no-store observed |
| `lythaus-web.pages.dev` | Cloudflare Pages host; HTTP 200 on SPA routes; HSTS and no-store observed |
| `lythaus.asora.co.za`, `api.asora.co.za` | Did not resolve from the execution environment |

Cloudflare zone settings, DNS record inventory, Pages project identity, Worker routes/custom domains, Access policies/audience, rulesets, DNSSEC API state, Universal SSL state, and provider rollback versions are `UNKNOWN`.
