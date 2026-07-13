# Lythaus public-domain audit — 2026-07-13

## 1. Executive result

**NO-GO.** Azure is now positively audited as a single authorised **Lythaus MVP shared environment** using `asora-function-dev`. Cloudflare remains unauditable because no API token/account variable is loaded and the cached Wrangler login is expired. No provider write was performed.

Repository preparation now uses Local → exact Cloudflare Preview → MVP Live. It does not require or configure permanent staging domains, separate Azure staging/production Function Apps, or separate databases.

## 2. Cloudflare account and zone findings

| Zone | Public observation | Provider evidence | Gate |
|---|---|---|---|
| `lythaus.co` | Cloudflare NS `ryan`/`vida`; intended hosts did not resolve | `UNKNOWN` | NO-GO |
| `asora.co.za` | Cloudflare NS `jerome`/`zelda`; apex and `www` HTTP 200 | `UNKNOWN` | NO-GO |

Zone/account IDs, authoritative status, registrar, DNSSEC, SSL mode, universal certificates, TLS settings, HSTS, HTTP/2/3, Brotli, CAA, DNS records, email routing, and security settings remain `UNKNOWN`. The token file is absent and ignored by `*.env`; the Wrangler session is expired.

## 3. Current DNS matrix

| Host | Observation | Ownership/routing conclusion |
|---|---|---|
| `lythaus.co`, `www.lythaus.co` | No serving address/HTTPS observed | `UNKNOWN` |
| `app.lythaus.co`, `api.lythaus.co` | Did not resolve | Unconfigured publicly |
| `admin.lythaus.co`, `admin-api.lythaus.co` | Did not resolve | Unconfigured publicly |
| `asora.co.za`, `www.asora.co.za` | Cloudflare HTTP 200 | Azure audit shows these names bound to `asora-function-dev`; Cloudflare edge details unknown |
| `lythaus.asora.co.za`, `api.asora.co.za` | Did not resolve | No public route observed |
| `admin-api.asora.co.za` | Cloudflare Access challenge | Also bound to `asora-function-dev`; Access app/policy unknown |
| `lythaus-web.pages.dev` | HTTP 200 Flutter SPA | Pages project metadata unknown |

Duplicate/conflicting records, wildcards, validation records, Worker custom domains/routes, and hidden redirects require the Cloudflare API.

## 4. Current Pages matrix

`lythaus-web.pages.dev` serves the SPA publicly. The marketing, Flutter, and control-panel Pages projects, branches, repositories, build commands, variables, custom domains, validation state, deployments, and exact SHAs remain `UNKNOWN`.

## 5. Current Worker matrix

Cloudflare scripts, versions, deployments, routes, custom domains, bindings, secret names, and traffic remain `UNKNOWN`. The live relationship among `feed-cache-worker`, `cloudflare/worker.ts`, Asora workers.dev hosts, and `admin-api.asora.co.za` cannot be established. PR 453 prepares a separate fail-closed gateway without claiming it is live.

## 6. Current Access matrix

`admin-api.asora.co.za` presents an Access challenge. Applications, audience tags, IdPs, policy order, bypass rules, service tokens, and public-API isolation remain `UNKNOWN`. Azure App Service Authentication is disabled; admin security therefore depends on the unverified Access layer plus origin-side roles.

## 7. Redirect/ruleset matrix

Redirect, bulk redirect, Page, origin, transform, cache, configuration, WAF, rate-limit, bot, and Worker-route ordering remain `UNKNOWN`. Publicly, Asora apex and `www` return 200 rather than redirecting.

## 8. Repository reference inventory

The `rg`-driven inventory contains 359 classified matches and is committed as [CSV](2026-07-13-domain-reference-inventory.csv) and [Markdown](2026-07-13-domain-reference-inventory.md). It classifies runtime, preview, local, Cloudflare, Azure, CI/CD, OpenAPI, CORS/OAuth, public/internal documentation, tests, generated output, history, legacy compatibility, and safe internal identifiers.

## 9. Marketing page inventory

The Astro build produced ten routes: `/`, `/about`, `/ai-moderation`, `/contact`, `/features`, `/guidelines`, `/invite`, `/pricing`, `/privacy`, and `/terms`. Manifesto, editorial, news, safety, transparency, waitlist, download, appeals, public post/user, and an explicit custom 404 route are missing and are not claimed. Canonical, sitemap, robots, Open Graph, and structured URLs target `lythaus.co`.

## 10. Web application route inventory

GoRouter includes `/`, `/login`, `/auth/callback`, `/post/:postId`, `/user/:userId`, `/invite/:code`, moderation, and settings routes. `web/_redirects` supplies SPA fallback. Exact preview direct-load/refresh proof must be repeated on the final PR artifact.

## 11. API/auth configuration inventory

Canonical public values are `https://api.lythaus.co/api` and `https://app.lythaus.co/auth/callback`. OpenAPI exposes one MVP server. Preview URLs are required explicit inputs with no permanent hostname or fallback.

Azure audit confirms:

- `asora-function-dev` is running on Node 22 Flex Consumption and is the only authorised MVP origin.
- `/api/health` and `/api/ready` return 200; readiness confirms Cosmos.
- The deployed SHA matches PR 452, not PR 453.
- Platform CORS does not allow `https://app.lythaus.co`.
- Origin gateway authentication is absent/disabled.
- Rate limiting is enabled; test-user and chaos overrides are absent; purge defaults closed because `NODE_ENV` is absent.
- The Function App is directly public with an allow-all network rule.
- EasyAuth is disabled.

See [Azure MVP evidence](2026-07-13-azure-mvp-audit.md).

## 12. Gap analysis against target architecture

| Target | Gap |
|---|---|
| Marketing/app Pages mappings | Cloudflare project identity unknown |
| API Worker/custom domain | Worker inventory and bindings unknown |
| Shared MVP origin | Proven, but CORS/origin token/rollback incomplete |
| Admin Pages/API | Access mapping/audience/service tokens unknown |
| TLS/DNSSEC | Ownership and issuance unknown |
| Legacy compatibility | Existing Cloudflare routes/rules unknown |
| Email | Lythaus provider/records unknown; no MX observed |
| Preview proof | Exact Pages/Worker preview and rollback not completed |

## 13. Security findings

- **Critical:** Cloudflare control plane cannot be audited.
- **Critical:** Gateway origin token is not configured or enforced.
- **High:** Future Lythaus app CORS is absent; current Azure CORS contains legacy/local origins.
- **High:** Direct Azure origin and data services use public network access.
- **High:** PostgreSQL has seven-day backups but no HA or geo-redundant backup.
- **High:** Access applications/policies and admin isolation are unknown.
- **High:** Rollback from PR 453 to the current PR 452 Function package is unproven.
- **Medium:** Key Vault purge protection was not observed enabled.
- **Prepared:** Gateway cache/header/origin controls, constant-time origin guard, explicit preview inputs, and load/chaos workflow approval gates are implemented in repository code.

No secret value, TXT value, access token, JWT, cookie, database credential, user data, or raw provider export is committed.

## 14. Migration conflict map

PR 452 remains the stacked base at `0cb3ffdeca506e891553c74b9e8b66de8f60890b`. The migration contains 136 paths relative to that base; 52 overlap paths changed by PR 452. The overlap is expected because domain values touch the same release workflows, runtime configuration, generated client, and launch documentation. The exact paths are recorded in [the conflict map](2026-07-13-migration-conflict-map.md). PR 453 must remain stacked until PR 452 merges; then retarget it to `main`, reconcile all 52 overlap paths, regenerate artifacts, and rerun every check.

## 15. Proposed exact changes

1. Load a replacement Cloudflare token through environment variables and audit both exact zones/account resources.
2. Identify exact Pages, Worker, Access, DNS, ruleset, email, and certificate resources.
3. Deploy exact PR artifacts to Pages/Worker previews using the existing MVP origin; no permanent preview DNS.
4. Prove CORS, OAuth, auth, cache, header stripping, monitoring, and rollback.
5. After separate approval, attach official Lythaus domains, configure exact Azure CORS/OAuth/origin token, and preserve Asora compatibility.

## 16. Rollback plan

Restore Worker version/bindings, Function package, Pages deployment/bindings, DNS/redirects, then Azure CORS/OAuth/origin enforcement. Run health, readiness, discovery, auth, protected-cache, Access, and split-brain tests. Rollback is documented but not proven.

## 17. Evidence locations

Executed repository validation:

- `flutter analyze`: passed.
- `flutter test`: 3,623 passed; 5 launch-gate tests skipped by design.
- Functions typecheck/build and Jest: passed; 2,254 tests passed and 18 skipped.
- OpenAPI lint/examples/contract, gateway tests, 129-route guard, control-panel tests/build, and both Wrangler dry-runs: passed.
- Marketing Astro build: 10 routes; document-shell, canonical, Open Graph, sitemap, robots, internal-link, CSS, and forbidden-host contract passed.
- Flutter preview and MVP production builds: passed; built artifacts contain no forbidden Azure, Asora public, or Pages-development hostname.
- Repository secret scanner: passed. `gitleaks` and `actionlint` binaries are unavailable locally; workflow YAML parsing passed and CI remains required.
- Cloudflare preview deployment, browser auth smoke, and rollback rehearsal: not run because Cloudflare authentication is unavailable.

- `.artifacts/cloudflare-audit/` — ignored local observations
- `docs/evidence/cloudflare/2026-07-13-azure-mvp-audit.md`
- `docs/evidence/cloudflare/2026-07-13-azure-mvp-audit.json`
- `docs/evidence/cloudflare/2026-07-13-pre-cutover-state.md`
- `docs/evidence/cloudflare/2026-07-13-post-cutover-state.md`
- `docs/evidence/cloudflare/2026-07-13-domain-reference-inventory.csv`
- `docs/evidence/cloudflare/2026-07-13-domain-reference-inventory.md`
- `docs/evidence/cloudflare/2026-07-13-migration-conflict-map.md`
- `scripts/cloudflare/audit-domains.ps1`
- `scripts/cloudflare/validate-domain-contract.ps1`

## 18. Unknowns and blockers

| Severity | Owner | Required action |
|---|---|---|
| Critical | Cloudflare owner | Load replacement audit token/account ID and permit complete read-only inventory |
| Critical | Platform owner | Configure/prove Worker origin token without blocking SCM/emergency access |
| High | Platform owner | Identify Pages/Worker/custom domains/routes and exact preview deployment |
| High | Identity owner | Prove OAuth callback and Access audience/service-token isolation |
| High | Azure/data owner | Approve shared-MVP backup/rollback posture and exact CORS transition |
| High | Release owner | Rehearse Function/Worker/Pages rollback on the exact candidate SHA |
| Medium | Mail owner | Select/confirm Lythaus email provider and records |

Smallest path to GO: complete the Cloudflare audit, resolve the Azure gateway/CORS/Access blockers, prove exact preview and rollback, then obtain separate authorization for provider writes.
