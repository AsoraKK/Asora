# Pre-cutover state — 2026-07-13

## Decision

`NO-GO`. No provider-side snapshot could be completed because `CLOUDFLARE_AUDIT_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` were absent. Raw local observations are under the gitignored `.artifacts/cloudflare-audit/` directory.

## Repository

- Base branch: `codex/alpha-release-candidate`
- Base SHA: `0cb3ffdeca506e891553c74b9e8b66de8f60890b`
- Migration branch: `codex/lythaus-domain-migration`
- PR 452: open draft, migration stacked on its head
- Conflict map: 30 of the initial 64 migration files overlap PR 452

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
