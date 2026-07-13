# Lythaus public-domain audit — 2026-07-13

## 1. Executive result

**NO-GO.** The required read-only Cloudflare token and account identifier were not present. The write token was not used. Provider state that cannot be proven is `UNKNOWN`, which triggers mandatory `NO-GO` conditions. No Cloudflare, Azure, DNS, Pages, Worker, Access, ruleset, certificate, CORS, OAuth, or email write was applied.

Safe repository preparation proceeded: public build values, OpenAPI/generated client, marketing canonicals, exact CORS, a separate fail-closed API gateway, opt-in constant-time Azure origin guard, audit/validation scripts, ADR, architecture, runbooks, and tests.

## 2. Cloudflare account and zones

| Field | `lythaus.co` | `asora.co.za` |
|---|---|---|
| Public delegation | `ryan.ns.cloudflare.com`, `vida.ns.cloudflare.com` | `jerome.ns.cloudflare.com`, `zelda.ns.cloudflare.com` |
| Provider zone ID/account/status/type/paused/plan | `UNKNOWN` | `UNKNOWN` |
| Cloudflare authoritative | Public NS delegation observed; API confirmation `UNKNOWN` | Public NS delegation observed; API confirmation `UNKNOWN` |
| Registrar/expiration/auto-renew | `UNKNOWN` | `UNKNOWN` |
| DNSSEC | No conclusive public DS evidence; API state `UNKNOWN` | No conclusive public DS evidence; API state `UNKNOWN` |
| SSL mode/minimum TLS/Universal SSL | `UNKNOWN` | `UNKNOWN` |
| HTTPS rewrites/HSTS/HTTP2/HTTP3/Brotli/security settings | `UNKNOWN` | `UNKNOWN` |
| CAA/provider certificate packs | `UNKNOWN` | `UNKNOWN` |

The token verification gate recorded `MISSING`; permissions are unavailable for all required provider resources.

## 3. Current DNS matrix

| Hostname | Public observation | Control mechanism | Proposed action |
|---|---|---|---|
| `lythaus.co` | Zone delegates to Cloudflare; apex did not resolve | `UNKNOWN` | Identify marketing Pages project, validate ownership/certificate, then attach |
| `www.lythaus.co` | Did not resolve | `UNKNOWN` | Add path/query-preserving permanent redirect only after audit |
| `app.lythaus.co` | Did not resolve | `UNKNOWN` | Attach identified Flutter Pages project after staging |
| `api.lythaus.co` | Did not resolve | `UNKNOWN` | Attach verified production gateway custom domain after staging |
| `admin.lythaus.co` | Did not resolve | `UNKNOWN` | Keep absent until UI and Access are ready |
| `admin-api.lythaus.co` | Did not resolve | `UNKNOWN` | Keep absent until API, Access, roles, and audience are ready |
| `status.lythaus.co` | Did not resolve | None observed | Do not configure |
| `media.lythaus.co` | Did not resolve | None observed | Do not configure |
| `asora.co.za` | Cloudflare anycast A/AAAA; HTTP 200 | DNS/Worker/ruleset identity `UNKNOWN` | Later redirect mapped public GET pages |
| `www.asora.co.za` | Cloudflare anycast A/AAAA; HTTP 200 | DNS/Worker/ruleset identity `UNKNOWN` | Later redirect to Lythaus apex |
| `lythaus.asora.co.za` | Did not resolve | `UNKNOWN` | Confirm provider inventory before adding redirect compatibility |
| `api.asora.co.za` | Did not resolve | `UNKNOWN` | If active elsewhere, use compatibility proxy, never mutation redirect |
| `admin-api.asora.co.za` | Cloudflare anycast; Access challenge | Access app/route details `UNKNOWN` | Preserve until audited and replacement proven |
| `lythaus-web.pages.dev` | Cloudflare Pages anycast | Pages project identity `UNKNOWN` | De-index/redirect only after custom domain works |

Duplicate records, wildcard records, proxied/unproxied conflicts, direct Azure targets, validation records, and hidden custom-domain ownership are `UNKNOWN` because the DNS API export was unavailable.

## 4. Pages matrix

| Surface | Observation | Project/source/build/custom domains/deployment SHA |
|---|---|---|
| Flutter web | `lythaus-web.pages.dev` returns 200 for `/`, `/login`, `/auth/callback`, post/user/invite/moderation/settings paths; SPA fallback is present in `web/_redirects` | `UNKNOWN` provider identity |
| Marketing | Repository Astro site exists; no serving `lythaus.co` host observed | `UNKNOWN` project |
| Admin UI | Repository Vite/React control panel exists; no `admin.lythaus.co` host observed | `UNKNOWN` project |

All Pages build commands, environment names, preview policy, domain validation, latest success/failure, deployment IDs, and source repository associations are `UNKNOWN`.

## 5. Worker matrix

| Worker | Repository state | Live state |
|---|---|---|
| `feed-cache-worker` / `feed-cache` | `cloudflare/worker.ts` contains a development-origin fallback; legacy wrapper route targets `dev.asora.co.za` | Script/version/routes/custom domains/traffic `UNKNOWN` |
| Prepared Lythaus gateway | Separate `cloudflare/api-gateway/worker.ts`; exact hostname/CORS, origin token, correlation ID, header stripping, no-store default, discovery-only cache, endpoint-class limits, controlled errors | Not deployed |
| Redirect/compatibility Workers | No verified provider inventory | `UNKNOWN` |
| Pages Functions | No verified provider inventory | `UNKNOWN` |

The unknown live identity prevents modification or deployment of the existing feed worker. The prepared gateway has no route/custom-domain declaration and cannot receive traffic accidentally.

## 6. Access matrix

| Surface | Evidence | Unknowns |
|---|---|---|
| `admin-api.asora.co.za` | HTTP 302 to a Cloudflare Access login host; no-store and HSTS observed | App name, audience, IdPs, policy order, bypasses, service tokens, session duration, origin JWT match |
| Admin UI/API target hosts | No DNS/HTTP surface | All provider policy state |
| Public API | No target host | Must prove it does not inherit admin Access |

The Access API inventory is unavailable, so administration migration is blocked.

## 7. Redirect/ruleset matrix

No provider ruleset, Page Rule, Bulk Redirect, Origin Rule, Transform Rule, Cache Rule, WAF, rate-limit rule, or Worker-route ordering could be enumerated. Publicly, `asora.co.za` and `www.asora.co.za` both return 200 rather than redirecting. Shadowed or contradictory rules are `UNKNOWN`.

## 8. Repository reference inventory

The required `rg`-driven inventory contains 529 classified matches:

- [CSV](2026-07-13-domain-reference-inventory.csv)
- [Markdown](2026-07-13-domain-reference-inventory.md)

High-risk active references included the feed-worker development fallback, Flutter staging/production API defaults, OAuth defaults, OpenAPI server, generated client, Pages release values, marketing canonical/sitemap/robots, admin CORS/proxy defaults, workflow smoke defaults, and active architecture/branding documents. Azure deployment, SCM, IaC, pinning, monitoring, historical evidence, explicit tests, and internal Asora identifiers are classified separately rather than globally suppressed.

## 9. Marketing page inventory

| Intended surface | Repository route | Status |
|---|---|---|
| Home | `/` | Exists |
| About | `/about` | Exists |
| Manifesto | — | Missing |
| Editorial | — | Missing |
| News | — | Missing |
| Safety | `/ai-moderation` is related but not an exact safety route | Missing exact route |
| Transparency | — | Missing |
| Waitlist | `/#waitlist` anchor | Partial; no standalone route |
| Download | — | Missing |
| Privacy | `/privacy` | Exists |
| Terms | `/terms` | Exists |
| Community guidelines | `/guidelines` | Exists |
| Appeals | — | Missing marketing route |
| Contact | `/contact` | Exists |
| Invite links | `/invite` plus `_redirects` for `/invite/*` | Exists |
| Public post links | — | Missing marketing route; app route exists |
| Public user links | — | Missing marketing route; app route exists |
| 404 | — | Missing custom page |

Additional existing routes are `/features` and `/pricing`. Marketing canonicals, Open Graph URLs, Astro `site`, robots, and sitemap are prepared for `lythaus.co`; built output must still be validated before deployment.

## 10. Web application routes

| Route | Source status | Refresh status |
|---|---|---|
| `/` | Exists | SPA fallback configured |
| `/login` | Exists | SPA fallback configured |
| `/auth/callback` | Exists | SPA fallback configured |
| `/post/:postId` | Exists | SPA fallback configured |
| `/user/:userId` | Exists | SPA fallback configured |
| `/invite/:code` | Exists | SPA fallback configured |
| `/moderation` and `/moderation/appeal` | Exists | SPA fallback configured |
| `/settings/notifications` | Exists | SPA fallback configured |

Source and existing Pages-host probes support the SPA claim. `app.lythaus.co` itself cannot be tested because it does not resolve.

## 11. API/auth configuration

Prepared values use `https://api.lythaus.co/api` and staging equivalents. OAuth endpoints and callback conform to ADR-005. OpenAPI production/staging servers were updated and the Dart client regenerated. Exact CORS replaces implicit Pages/legacy fallbacks. The admin CORS boundary allows exact production/staging admin origins and omits credentials for unknown origins.

The production Azure Function origin, deployed CORS, platform CORS, OAuth callback allowlists, Access audience validation, and safe staging authentication exercise remain `UNKNOWN`. No production client is intentionally configured to use the development Function App after the preparation patch; internal dev, deployment, monitoring, pinning, and historical references remain classified.

## 12. Gap analysis

| Target | Gap |
|---|---|
| Marketing/app/admin Pages | Projects and custom-domain validation unidentified |
| API/admin API | Origins, deployed Workers, routes/custom domains, Access, rate-limit binding unidentified |
| TLS/DNSSEC | Provider state and ownership validation unavailable |
| Email | `lythaus.co` MX/SPF/DKIM/DMARC/provider readiness not established |
| Auth/CORS | Deployed values and safe staging auth not verified |
| Legacy continuity | Active provider routes/rules and traffic cannot be enumerated |
| Rollback | Provider snapshots and rehearsal absent |

## 13. Security findings

- **Critical:** Cloudflare provider state cannot be proven with the missing audit token.
- **High:** The existing repository feed worker has a silent development-origin fallback; live deployment identity is unknown, so it was not modified or deployed.
- **High:** Production origin, CORS, OAuth, Access policies, certificate state, and rollback versions are unknown.
- **Medium:** `asora.co.za` and `www.asora.co.za` are live 200 surfaces without observed HSTS or migration redirects.
- **Medium:** `lythaus.co` email readiness is unproven; no guessed mail records were created.
- **Prepared control:** New gateway fails closed without origin/token/rate-limit binding, strips spoofable headers, conceals origin headers, and caches only anonymous credential-free discovery.

No credential value, TXT value, JWT, cookie, raw provider export, user data, or origin token is committed.

## 14. Migration conflict map

PR 452 remains open/draft at `0cb3ffdeca506e891553c74b9e8b66de8f60890b`. The migration branch is based on that exact head. The final map found 36 overlaps among 84 migration files, primarily `.env.example`, the Azure deployment workflow, OpenAPI bundle/source, startup validation, shared HTTP tests, Flutter environment config, generated client server docs/API, `.gitignore`, README files, and smoke tooling.

This is acceptable for a stacked draft PR but must be reconciled and retested when retargeting to `main` after PR 452 merges.

## 15. Proposed exact changes

1. Restore read-only Cloudflare audit access and export both zones/account resources.
2. Positively identify Pages projects and current Worker/Access/ruleset ownership.
3. Identify non-development staging and production Azure origins.
4. Configure gateway origins/secrets/KV and matching Azure token/CORS/OAuth settings in staging.
5. Attach staging domains, deploy exact SHA, run auth/moderation/DSR/browser/API/cache tests, and rehearse rollback.
6. Repeat the gated sequence for production, then enable reviewed legacy redirects/compatibility proxying.

## 16. Rollback plan

The required order is Worker version, Worker binding, Pages deployment/binding, DNS/redirect rules, Azure CORS/OAuth/origin enforcement, then health/auth/split-brain verification. See [cutover runbook](../../runbooks/lythaus-domain-cutover.md). The plan is documented but not proven because no provider snapshot or staging change was possible.

## 17. Evidence locations

- `.artifacts/cloudflare-audit/` — ignored local DNS/HTTP/reference observations and sanitized audit state
- `docs/evidence/cloudflare/2026-07-13-pre-cutover-state.md`
- `docs/evidence/cloudflare/2026-07-13-post-cutover-state.md`
- `docs/evidence/cloudflare/2026-07-13-domain-reference-inventory.csv`
- `docs/evidence/cloudflare/2026-07-13-domain-reference-inventory.md`
- `scripts/cloudflare/audit-domains.ps1`
- `scripts/cloudflare/validate-domain-contract.ps1`

Repository validation passed for Flutter analysis and 3,623 tests (5 skipped), the Flutter production web build, Astro's 10-page production build and control-panel tests (21), Functions typecheck/build and 204 suites (2,254 passed, 18 skipped), route guards (129 routes, no guard violations), OpenAPI lint/examples/contracts, both gateway Wrangler dry-runs, the domain contract, `git diff --check`, the documentation/config secret scan, and gitleaks across 1,406 commits. The root `npm run lint-check` command is unavailable because the Functions package has no `lint` script; `actionlint` is not installed. Provider-side browser/auth/CORS/cache/rollback tests were not run because the live audit gate failed.

## 18. Unknowns and blockers

| Severity | Owner | Required action |
|---|---|---|
| Critical | Cloudflare account owner | Provide `CLOUDFLARE_AUDIT_API_TOKEN` with all required read permissions and `CLOUDFLARE_ACCOUNT_ID` via environment variables |
| Critical | Cloudflare account owner | Permit zones, DNS, Pages, Workers/routes/custom domains, Access/policies, rulesets, certificates, settings, registrar, and email audit |
| Critical | Azure owner | Identify staging/production Function Apps and export redacted CORS/OAuth/app-setting state |
| High | Identity owner | Prove staging auth code/PKCE/token/userinfo and callback allowlists safely |
| High | Platform owner | Capture restorable provider snapshots and complete rollback rehearsal |
| High | Release owner | Reconcile the 36-file PR 452 overlap when retargeting |
| Medium | Mail owner | Select/confirm mail provider and approved MX/SPF/DKIM/DMARC values |
| Medium | Product/content owner | Decide whether missing marketing routes are required before public launch |

Smallest path to `GO`: restore audit-only Cloudflare access, identify every provider resource and both Azure origins, resolve any DNS/certificate conflicts, then complete exact-SHA staging plus rollback evidence. Until then, production cutover is forbidden.
