# Lythaus public-domain audit - 2026-07-13

## 1. Executive result

**NO-GO.** The Cloudflare token verified as active and allowed enumeration of both zones, DNS, Pages, Workers, Worker routes/custom domains, Access, certificates, zone settings, email routing, Page Rules, and ruleset summaries. Required registrar, Bulk Redirect, and managed-ruleset detail endpoints returned HTTP 403, so the control plane is not fully auditable with this token.

Independent blockers also remain: no marketing Pages project exists, no Lythaus API gateway Worker is deployed, Lythaus has no DNS records, Azure CORS omits `https://app.lythaus.co`, origin authentication is absent, Flutter path routing was broken in the exact-SHA preview, Access is not configured for the target admin hosts, and rollback has not been rehearsed. No live traffic configuration or Azure provider write was applied.

## 2. Cloudflare account and zone findings

Account: `e5b7...1af0`.

| Zone | State | TLS/security | Certificate | Gate |
|---|---|---|---|---|
| `lythaus.co` (`7bc5...9382`) | Active, full, authoritative, not paused, Free Website, DNSSEC active | SSL Full; minimum TLS 1.0; TLS 1.3, HTTP/2, HTTP/3 and Brotli on; Always Use HTTPS off; HSTS off; WAF zone setting off | Universal wildcard active; backup issued | NO-GO |
| `asora.co.za` (`55d3...c9e5`) | Active, full, authoritative, not paused, Free Website, DNSSEC disabled | SSL Strict; minimum TLS 1.0; TLS 1.3, HTTP/2, HTTP/3 and Brotli on; Always Use HTTPS on; HSTS off; WAF zone setting off | Universal wildcard active; backup issued | NO-GO |

Nameservers match the public delegation: `ryan`/`vida` for Lythaus and `jerome`/`zelda` for Asora. Registrar status is `UNKNOWN` because both registrar reads returned HTTP 403. No CAA record exists in either zone.

Unavailable endpoints, with identifiers redacted:

- Registrar reads for both zones: HTTP 403.
- Account Bulk Redirect lists: HTTP 403.
- Four managed-ruleset detail reads across the two zones: HTTP 403.

## 3. Current DNS matrix

`lythaus.co` contains zero DNS records. Cloudflare and Google public resolvers agree that the intended Lythaus hosts have no address records.

| Host | Current control-plane route | Public observation | Proposed action |
|---|---|---|---|
| `lythaus.co`, `www.lythaus.co` | No DNS or Pages binding | Does not serve HTTPS | Attach proven marketing Pages project; configure path/query-preserving `www` redirect only after GO |
| `app.lythaus.co`, `api.lythaus.co` | No record, route, or custom domain | Does not resolve | Attach proven Flutter Pages project and new API gateway only after preview gates |
| `admin.lythaus.co`, `admin-api.lythaus.co` | No record, Pages binding, Worker route, or Access app | Does not resolve | Configure only after UI/API and Access isolation are proven |
| `status.lythaus.co`, `media.lythaus.co` | No records | Does not resolve | Intentionally leave unconfigured |
| `asora.co.za`, `www.asora.co.za` | Proxied CNAME to Azure Function origin | HTTP 200; no redirect, CSP, cache policy, or HSTS observed | Preserve until a reviewed compatibility redirect is ready |
| `app.lythaus.asora.co.za` | Proxied CNAME to `lythaus-web.pages.dev` and Pages custom domain | Existing Flutter application | Retain during compatibility window |
| `control.asora.co.za` | Proxied CNAME to `asora-6bi.pages.dev` and Pages custom domain | Existing Access-protected control panel | Retain until target admin migration is proven |
| `dev.asora.co.za` | Proxied CNAME to Azure; Worker route `dev.asora.co.za/api/feed*` | Legacy development/API surface | Do not treat as disposable once shared MVP traffic begins |
| `admin-api.asora.co.za` | Proxied CNAME to Azure | HTTP 302 Cloudflare Access challenge | Retain as legacy protected API during migration |
| `api.asora.co.za`, `lythaus.asora.co.za` | No DNS record | Does not resolve | No action unless compatibility traffic is proven |

The Asora zone has 20 records: 6 CNAME, 5 MX, and 9 TXT. No duplicate A/AAAA/CNAME conflict or wildcard record was observed. Four `asuid` TXT records are Azure ownership validation records and are retained. TXT values are represented only by SHA-256 hashes in sanitized evidence.

## 4. Current Pages matrix

Four account projects were enumerated; two are unrelated Nite Owl projects.

| Project | Proven purpose | Production branch/build | Domains | Rollback deployment |
|---|---|---|---|---|
| `lythaus-web` | Flutter web app, proven by repository/build/output and response content | `main`; `bash scripts/cf-pages-build.sh`; `build/web` | `lythaus-web.pages.dev`, `app.lythaus.asora.co.za` | `7155...91ee`, commit `d2d251edcfc8742649fdc9a09860e2c92f5f60e3` |
| `asora` | Lythaus control panel, proven by repository/build/output and response content | `main`; `npm run build`; `dist` | `asora-6bi.pages.dev`, `control.asora.co.za` | `8bfd...c7e2`, commit `d2d251edcfc8742649fdc9a09860e2c92f5f60e3` |
| Marketing | **Missing** | `UNKNOWN` | None | None |

Exact PR 453 previews succeeded at commit `c6d7bc718887f6fcd827d2bb5e54edc7037581f9`: Flutter deployment `57f2...7736` and control-panel deployment `d59f...77e2`. Browser testing found that Flutter direct paths were interpreted as hash routes and collapsed to `#/login`. The control-panel preview was publicly reachable without an Access challenge. A repository path-strategy fix is now prepared but is not yet proven on a new immutable preview.

## 5. Current Worker matrix

Five account Workers were enumerated; two belong to Nite Owl. No Worker custom domain exists for an Asora or Lythaus hostname.

| Worker | Deployment | Binding/secret state | Live route and behavior |
|---|---|---|---|
| `feed-cache` | `caa3...fd40`; 10 versions | Plain `ORIGIN_BASE`; no Worker secret | `dev.asora.co.za/api/feed*`; Azure-backed; caches anonymous discovery, bypasses credentials, logs origin fetch metadata |
| `control-api-proxy` | `4b6c...4f4e`; 3 versions | No bindings or secrets reported | `control.asora.co.za/api/*`; Azure-backed; forwards Cloudflare Access headers |
| `asora-feed-edge-development` | `538f...476c`; 4 versions | Plain `ORIGIN_URL`; no Worker secret | No zone route/custom domain observed; configured-origin feed proxy |
| Lythaus API gateway | **Not deployed** | Repository code requires origin URL and secret token | No route or custom domain |

Downloaded deployed bundles were inspected without committing source: SHA-256 `67bcd0...a353` (`feed-cache`), `764d62...2d30` (`control-api-proxy`), and `ab8279...b4a4` (`asora-feed-edge-development`). The repository legacy wrapper `workers/feed-cache` imports `cloudflare/worker.ts`; that legacy implementation still has a development-origin fallback and is not suitable as the target API gateway. The separate `cloudflare/api-gateway` implementation is the prepared fail-closed gateway.

## 6. Current Access matrix

Five applications, two identity providers, and two service tokens were enumerated. Relevant applications are:

| Application | Protected route | Session | Policies |
|---|---|---:|---|
| Asora Control Panel | `control.asora.co.za` | 30m | Owner email allow, then deny everyone |
| Asora Control Panel API | `control.asora.co.za/api/*` | 12h | Service-token policy |
| Asora Admin API | `admin-api.asora.co.za` | 24h | Owner email allow, then two service-token policies |

Identity providers are One-time PIN and Google. Service-token names are `asora-dev-admin-api-st` and `control-panel-to-admin-api`; values were not read. No bypass policy was observed. No Access application exists for `admin.lythaus.co` or `admin-api.lythaus.co`. The public API has no Access application, so it does not currently inherit the legacy administrator policy.

## 7. Redirect and ruleset matrix

- No active Page Rule was returned for either zone.
- No custom ruleset was returned; only managed normalization, managed free WAF, and DDoS summaries were visible.
- Zone Worker routes are limited to the two legacy Asora routes described above.
- Bulk Redirect inventory and four managed-ruleset detail reads returned HTTP 403.
- Public observations show Asora apex and `www` returning HTTP 200, not redirects.

Because Bulk Redirect and managed-rule detail reads are unavailable, rule priority, shadowing, and hidden redirect behavior cannot be fully proven. This is a mandatory NO-GO condition.

## 8. Repository reference inventory

The `rg`-driven inventory contains 359 classified matches and is committed as [CSV](2026-07-13-domain-reference-inventory.csv) and [Markdown](2026-07-13-domain-reference-inventory.md). It distinguishes runtime, preview, local, Cloudflare, Azure, CI/CD, OpenAPI, CORS/OAuth, public/internal documentation, tests, generated output, historical evidence, explicit compatibility, and safe internal identifiers.

## 9. Marketing page inventory

The Astro build produces `/`, `/about`, `/ai-moderation`, `/contact`, `/features`, `/guidelines`, `/invite`, `/pricing`, `/privacy`, and `/terms`. Manifesto, editorial, news, safety, transparency, waitlist, download, appeals, public post/user, and an explicit custom 404 route are missing. Canonical, sitemap, robots, Open Graph, and structured URLs target `lythaus.co`, but no marketing Pages project exists in Cloudflare.

## 10. Web application route inventory

GoRouter defines `/`, `/login`, `/auth/callback`, `/post/:postId`, `/user/:userId`, `/invite/:code`, `/moderation`, and settings subroutes. Pages returns HTTP 200 for direct SPA paths. The exact-SHA preview failed the application-level path contract because Flutter used hash routing. PR 453 now configures `usePathUrlStrategy()` through a web-only conditional implementation. An optimized local browser build preserves `/auth/callback?error=access_denied` across refresh and `/invite/ABCD-1234` with an empty hash. Source-map diagnosis also fixed a release-only disposed-state `ref` read in the invite screen; both routes now render without console errors. A new immutable Pages preview is still required before the blocker can close.

Only callback and invite routes are explicitly anonymous in current redirect logic. Public post/user share behavior therefore remains unproven and is a product-routing gap.

## 11. API and authentication inventory

Canonical public values remain `https://api.lythaus.co/api` and `https://app.lythaus.co/auth/callback`; OpenAPI exposes one MVP server. No `auth.lythaus.co` was introduced.

Azure evidence confirms `asora-function-dev` is running as the only authorised MVP origin; `/api/health` and `/api/ready` return HTTP 200. However, Azure CORS does not allow `https://app.lythaus.co`, origin-token enforcement is absent/disabled, the origin is directly public, EasyAuth is disabled, and the deployed Function package matches PR 452 rather than PR 453.

## 12. Gap analysis against target architecture

| Target | Current gap |
|---|---|
| Marketing apex | No marketing Pages project or domain binding |
| Flutter app | Project proven; target domain absent; path fix not preview-proven |
| Public API | Target gateway Worker is not deployed; no domain binding; CORS and origin token absent |
| Admin UI/API | Legacy resources proven; target Access apps/domains absent |
| TLS/security | Lythaus wildcard issued, but minimum TLS is 1.0, Always Use HTTPS/HSTS off, and no target binding exists |
| Legacy compatibility | Active legacy routes proven; redirect inventory incomplete due HTTP 403 |
| Email | Asora has Google MX/SPF/DKIM/DMARC; Lythaus has no mail records |
| Rollback | Pages and legacy Worker versions identified; full rehearsal and target Worker rollback absent |

## 13. Security findings

- **Critical:** required Cloudflare registrar, Bulk Redirect, and ruleset-detail endpoints return HTTP 403.
- **Critical:** no Lythaus API gateway is deployed and origin authentication is absent.
- **High:** Lythaus Azure CORS and OAuth callback registration are unproven.
- **High:** `lythaus.co` minimum TLS is 1.0; Always Use HTTPS and HSTS are off.
- **High:** Access does not protect target admin hosts, and the control-panel preview is public.
- **High:** direct Azure origin access remains public.
- **High:** public post/user route behavior is not proven for anonymous share links.
- **High:** production cutover and rollback rehearsal are incomplete.
- **Prepared:** repository gateway controls, origin guard, exact CORS, cache restrictions, correlation IDs, secret handling, path strategy, invite lifecycle guard, and load/chaos approval gates are implemented or staged.

No API token, TXT value, Access secret, JWT, cookie, Azure secret, database credential, user data, or raw provider response is committed.

## 14. Migration conflict map

PR 452 remains the stacked base at `0cb3ffdeca506e891553c74b9e8b66de8f60890b`. The migration contains 136 paths relative to that base; 52 overlap paths changed by PR 452. PR 453 must remain stacked until PR 452 merges, then be retargeted to `main`, reconciled, regenerated, and fully retested.

## 15. Proposed exact changes

No provider write is approved by this audit. The smallest route to GO is:

1. Grant read access for registrar, Bulk Redirect, and ruleset details; rerun the audit.
2. Create or identify a real marketing Pages project and prove its exact artifact.
3. Deploy the repository API gateway to an ephemeral Worker preview with the origin token configured as a secret; do not bind production DNS.
4. Deploy a new immutable Flutter preview and prove path routing, callback handling, invite links, and public post/user behavior.
5. Protect control-panel previews and create target Access applications only after audience/policy review.
6. Prove exact Azure CORS, OAuth callback, origin authentication, monitoring, and rollback.
7. Obtain separate authorization before any target DNS, custom-domain, Access, or Azure write.

## 16. Rollback plan

Known rollback references are the current Function package at PR 452 SHA `0cb3ffdeca506e891553c74b9e8b66de8f60890b`, Flutter Pages production deployment `7155...91ee`, control-panel Pages production deployment `8bfd...c7e2`, and legacy Worker deployments `caa3...fd40`, `4b6c...4f4e`, and `538f...476c`.

Required reversal order remains: Worker version/bindings, Function package, Pages deployment/bindings, DNS/redirects, Azure CORS/OAuth/origin enforcement, then health/auth/cache/Access/split-brain checks. This sequence is documented but not rehearsed.

## 17. Evidence locations and validation

- Raw Cloudflare responses: `.artifacts/cloudflare-audit/` (gitignored).
- Sanitized machine result: `.artifacts/cloudflare-audit/sanitized-cloudflare-audit.json` (gitignored source for this report).
- Azure evidence: [Markdown](2026-07-13-azure-mvp-audit.md) and [JSON](2026-07-13-azure-mvp-audit.json).
- Domain inventory: [CSV](2026-07-13-domain-reference-inventory.csv) and [Markdown](2026-07-13-domain-reference-inventory.md).
- Conflict map: [2026-07-13-migration-conflict-map.md](2026-07-13-migration-conflict-map.md).

Previously completed validation remains valid at commit `c6d7bc7`: Functions typecheck/build/tests, gateway tests, Wrangler dry-runs, marketing build/output contract, control-panel tests/build, OpenAPI checks, route guards, domain contract, and repository secret scanning. Current changes pass Flutter analysis, the full Flutter suite (`3,624` passed and `5` intentionally skipped), focused routing/invite tests, an exact production web build, security-header validation, the domain contract, the repository secret scan, `git diff --check`, and optimized local browser tests for callback refresh and invite routing with no console errors. Token-prefix scans found zero matches in tracked files and raw audit artifacts. A new immutable Pages preview is still required before the path-routing blocker can close.

## 18. Unknowns and blockers

| Severity | Owner | Required action |
|---|---|---|
| Critical | Cloudflare owner | Grant registrar, Bulk Redirect, and ruleset-detail read permissions |
| Critical | Platform owner | Deploy/prove the API gateway preview and origin token |
| Critical | Product/web owner | Provide a real marketing Pages project/artifact |
| High | Web owner | Prove path routing plus anonymous callback/invite/post/user behavior on immutable preview |
| High | Identity owner | Prove target Access audiences/policies, OAuth callback, and service-token flows |
| High | Azure owner | Approve exact CORS/origin-auth transition and rollback path |
| High | Release owner | Rehearse Function/Worker/Pages rollback on the exact candidate SHA |
| Medium | Security owner | Raise minimum TLS and decide HSTS/Always Use HTTPS after target-host validation |
| Medium | Mail owner | Select and provide approved Lythaus MX/SPF/DKIM/DMARC values |

Smallest recommendation: continue repository and ephemeral-preview work only. Production domain cutover is forbidden.
