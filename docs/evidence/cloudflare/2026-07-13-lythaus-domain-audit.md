# Lythaus public-domain audit - 2026-07-13

## 1. Executive result

**NO-GO.** PR 453 now has successful immutable marketing and Flutter Pages previews, an ephemeral API gateway, exact preview CORS and OAuth callback configuration, target Access applications, control-panel preview protection, and Worker/Pages/Azure rollback exercises. Production DNS, custom domains, routes, redirects, and certificates were not changed.

Cutover remains forbidden because seven required Cloudflare reads still return HTTP 403; live OpenAPI acceptance fails on the documented error schema for `POST /moderation/appeals`; origin-token enforcement would currently block active legacy Asora HTTP paths; full browser token exchange/UserInfo/session/sign-out proof lacks an approved test identity; and the requested anonymous post, user, legal, and root route states redirect to login.

## 2. Cloudflare account and zone findings

The token verified active. Sanitized zone identifiers are retained below; raw responses remain gitignored.

| Zone | Authority and TLS | Security posture | Result |
|---|---|---|---|
| `lythaus.co` (`7bc5...9382`) | Active, full, authoritative, DNSSEC active, SSL Full, Universal SSL active | Minimum TLS 1.0; Always Use HTTPS off; HSTS off | NO-GO |
| `asora.co.za` (`55d3...c9e5`) | Active, full, authoritative, DNSSEC disabled, SSL Strict, Universal SSL active | Minimum TLS 1.0; Always Use HTTPS on; HSTS off | NO-GO |

Registrar state, account Bulk Redirect lists, and four managed-ruleset detail reads remain unavailable. The exact seven calls were rerun; all returned HTTP 403.

## 3. Current DNS matrix

| Host | Current routing | Migration action |
|---|---|---|
| `lythaus.co`, `www.lythaus.co` | No DNS/custom-domain binding | Do not bind until all gates pass |
| `app.lythaus.co` | No production binding | Future Flutter Pages custom domain |
| `api.lythaus.co` | No production binding | Future gateway custom domain |
| `admin.lythaus.co`, `admin-api.lythaus.co` | No DNS binding; Access apps prepared | Bind only after final Access and role proof |
| `status.lythaus.co`, `media.lythaus.co` | Not configured | Intentionally deferred |
| `asora.co.za`, `www.asora.co.za` | Existing proxied Azure-backed public surface | Retain until redirect plan is fully auditable |
| `app.lythaus.asora.co.za` | Existing `lythaus-web` Pages binding | Legacy compatibility |
| `control.asora.co.za` | Existing control-panel Pages binding and Access | Retain until admin cutover |
| `admin-api.asora.co.za` | Existing proxied Azure/Access surface | Retain as protected compatibility API |

No production DNS record or permanent custom domain was created in this pass.

## 4. Current Pages matrix

| Project | Purpose | Exact preview | Result |
|---|---|---|---|
| `lythaus-marketing` | Astro marketing site from `apps/marketing-site` | `b1e30d74.lythaus-marketing.pages.dev`; deployment `b1e3...e610`; SHA `dd2b386f8f630fd3585dbd864decaa475e6af3d5` | Ten routes, metadata, sitemap, robots, headers, and forbidden-domain scan pass |
| `lythaus-web` | Flutter web app | `7ca0cf37.lythaus-web.pages.dev`; deployment `7ca0...03a5`; same SHA | Eight direct paths return HTTP 200; rendered authorization gaps remain |
| `asora` | Control panel | `093ab684.asora-6bi.pages.dev` | HTTP 302 Access challenge; wildcard preview application covers `*.asora-6bi.pages.dev` |

Pages rollback was exercised on the preview branch by deploying prior commit `0bbc7cab` as `8a4863e1.lythaus-web.pages.dev`, verifying all eight direct paths, and restoring the current artifact. No production Pages deployment or custom-domain binding changed.

## 5. Current Worker matrix

The legacy Workers remain unchanged. PR 453 deployed `lythaus-api-gateway-preview` only to `workers.dev`.

| Worker | Version/route | Evidence |
|---|---|---|
| `feed-cache` | Existing `dev.asora.co.za/api/feed*` | Unchanged |
| `control-api-proxy` | Existing `control.asora.co.za/api/*` | Unchanged |
| `lythaus-api-gateway-preview` | Current version `efdf...1801`; `lythaus-api-gateway-preview.asora.workers.dev` | Health 200; exact CORS; origin concealed; cache contract proven |

The gateway has secret names `ORIGIN_AUTH_TOKEN` and `EMAIL_HASH_SALT`; values were never read or committed. `ORIGIN_BASE` targets the existing Azure MVP origin and has no development fallback.

## 6. Current Access matrix

| Application | Domain | Policy order | Result |
|---|---|---|---|
| Lythaus Admin UI | `admin.lythaus.co` | Explicit administrator allow; CI service token; deny all | No bypass or Everyone allow |
| Lythaus Admin API | `admin-api.lythaus.co` | Explicit administrator allow; CI service token; control-panel service token; deny all | No bypass or Everyone allow |
| Lythaus Control Panel Preview | `*.asora-6bi.pages.dev` | Explicit administrator allow; PR 453 CI service token; deny all | Unauthenticated preview returns Access challenge |

Audience tags were captured in sanitized form. Existing origin-side administrator-role checks remain in the Functions code. The public API has no Access application and does not inherit an admin policy.

## 7. Redirect and ruleset matrix

- Page Rules returned no active migration redirect.
- Existing Worker routes remain as listed above.
- Account Bulk Redirect inventory: HTTP 403.
- Lythaus and Asora registrar reads: HTTP 403.
- Four managed normalization/DDoS ruleset detail reads: HTTP 403.

Rule priority, shadowing, and hidden Bulk Redirect behavior therefore remain unproven. This is a mandatory NO-GO.

### 2026-07-15 permission recheck addendum

The seven denied reads were rerun through a GitHub Actions workflow using the separate `CLOUDFLARE_AUDIT_API_TOKEN` secret. The token was verified active and every rechecked call succeeded. The recheck found no account Bulk Redirect lists and captured safe aggregate details for the normalization and L7 DDoS rulesets in [the dated recheck report](2026-07-15-cloudflare-read-permission-recheck.md).

This resolves the audit-token permission blocker only. It does not change the overall NO-GO result, because origin enforcement, live OpenAPI acceptance, full browser authentication proof, public-route behavior, provider-side validation, and PR 452 sequencing remain unresolved.

## 8. Repository reference inventory

The `rg`-driven inventory contains 373 classified matches in [CSV](2026-07-13-domain-reference-inventory.csv) and [Markdown](2026-07-13-domain-reference-inventory.md). It separates runtime, preview, legacy compatibility, Azure infrastructure, generated output, historical evidence, and safe internal identifiers.

## 9. Marketing page inventory

The exact preview produces `/`, `/about`, `/ai-moderation`, `/contact`, `/features`, `/guidelines`, `/invite`, `/pricing`, `/privacy`, and `/terms`. All return HTTP 200 after the expected trailing-slash redirect. Canonical, Open Graph, structured data, sitemap, robots, security headers, and broken-link checks pass. Generated metadata contains no Azure hostname, Asora public domain, or Pages development hostname.

Manifesto, editorial, news, safety, transparency, waitlist, download, appeals, public post/user, and a custom 404 are still absent and must not be claimed as existing routes.

## 10. Web application route inventory

All required direct paths return HTTP 200 at the edge without hash routing. Browser rendering and refresh produced:

| Route | Rendered result |
|---|---|
| `/login` | Lythaus login screen |
| `/auth/callback` | Callback error state remains on the path; forged state displays CSRF rejection |
| `/invite/test` | Invite state remains on the path across refresh |
| `/post/test`, `/user/test` | Redirect to `/login` |
| `/privacy`, `/terms`, `/` | Redirect to `/login` |

The application bundle contains PKCE `S256`. Browser authorization initiation returns to the exact preview callback with state and an authenticated-session-required error. Full code exchange, UserInfo, session restore, one-time-code reuse rejection, and sign-out are UNKNOWN because no approved test identity was available.

## 11. API and authentication inventory

The intended public endpoints remain `https://api.lythaus.co/api/auth/authorize`, `/token`, `/userinfo`, and `https://app.lythaus.co/auth/callback`. No `auth.lythaus.co` was introduced.

Preview behavior:

- `/api/health`: HTTP 200 through the Worker.
- Anonymous `GET /api/feed/discover`: public cache policy; second request returns Cloudflare cache HIT.
- Credential-bearing discovery: private, no-store and dynamic.
- Auth, user, privacy, moderation, and admin paths: private, no-store and dynamic.
- Exact-origin preflight: HTTP 204 with the exact immutable origin.
- Wrong-origin preflight: HTTP 403 without an allow-origin header.
- Error body origin-leak scan: no Azure hostname.

Azure received the exact preview CORS list and OAuth callback. Candidate SHA `dd2b386f...` was deployed by run `29288372154`; health and basic acceptance passed, but the live OpenAPI contract failed because the moderation appeal error response does not match the documented object schema. The approved rollback artifact `0cb3ffde...` was restored by run `29288922941`; direct and Worker health are 200. The same contract drift remains.

The origin token is stored redacted in Azure and as a Worker secret. Enforcement was not enabled: the guard applies to every HTTP Function, while active Asora apex/admin/feed compatibility paths do not all inject the token. Enabling it now would break service continuity. Direct missing/invalid-token health requests therefore still return 200, and live boundary rejection is not proven.

## 12. Gap analysis against target architecture

| Target | Remaining gap |
|---|---|
| Marketing apex | Preview proven; production binding/certificate not applied |
| Flutter app | Preview proven; public post/user/legal/root states fail requested browser behavior |
| Public API | Gateway preview proven; origin enforcement and authenticated identity flow unproven |
| Admin UI/API | Access apps proven; target DNS/bindings and live role/service-token flow not exercised |
| Rules/redirects | Seven required provider reads remain HTTP 403 |
| Azure MVP | Rolled back to prior package; live appeal schema drift persists |
| Email | Lythaus mail provider values remain unknown; no records guessed |

## 13. Security findings

- **Critical:** required Cloudflare registrar, Bulk Redirect, and ruleset-detail reads remain forbidden.
- **Critical:** origin enforcement cannot be enabled without first tokenizing or proxying every active legacy HTTP path.
- **High:** live OpenAPI acceptance fails on the moderation appeal error schema.
- **High:** full browser authentication lacks an approved test identity.
- **High:** anonymous post/user/legal/root route states do not meet the requested contract.
- **High:** target DNS, certificates, custom domains, and post-cutover rollback remain untested because production writes were prohibited.
- **Medium:** `lythaus.co` minimum TLS is 1.0; Always Use HTTPS and HSTS remain off.

No API token, TXT value, Access secret, JWT, cookie, Azure secret, origin secret, database credential, or user data is committed.

## 14. Migration conflict map

PR 452 remains open and draft at `0cb3ffdeca506e891553c74b9e8b66de8f60890b`. PR 453 remains stacked and draft; the validated code candidate is `dd2b386f8f630fd3585dbd864decaa475e6af3d5`. The previously captured 52-file overlap is retained without repeated reconciliation while PR 452 is open. Reconcile once after PR 452 merges and PR 453 is retargeted to `main`.

## 15. Proposed exact changes

1. Grant read access for registrar, Bulk Redirect, and managed-ruleset details; rerun only those seven calls.
2. Correct the moderation appeal error response or OpenAPI schema and pass live contracts.
3. Put every active Asora HTTP path behind a token-injecting compatibility Worker, or design a host/path-scoped origin guard, before enabling enforcement.
4. Provide an approved isolated test identity and prove code exchange, UserInfo, restore, reuse rejection, and sign-out.
5. Resolve public post/user/legal/root route behavior.
6. After PR 452 merges, retarget, reconcile once, run the complete suite, and review the final diff.
7. Only then schedule production DNS/custom-domain/certificate changes.

## 16. Rollback plan

- Worker rollback proven: `efdf...1801` to `8b15...aff2` and back; health 200 after each transition.
- Pages rollback proven on the preview branch: prior `0bbc7cab` artifact deployed and all eight direct paths returned 200; current exact-head artifact restored.
- Azure package rollback proven: candidate `dd2b386f...` deployed, then prior `0cb3ffde...` restored from CI run `29171558490`; direct and Worker health are 200.
- Full Azure rollback acceptance is **not proven** because the pre-existing moderation appeal contract drift fails on both candidate and restored packages.
- Local emergency package reference: gitignored `.artifacts/cloudflare-audit/azure-rollback-0cb3ffde.zip`, SHA-256 `04b0a5d0ac9e3400bdfd9c625a843737bf947a71c6ebd99342a71785344da4e4`.

## 17. Evidence locations and validation

- Exact-head CI: [run 29287761322](https://github.com/AsoraKK/Asora/actions/runs/29287761322), success.
- Candidate deploy: [run 29288372154](https://github.com/AsoraKK/Asora/actions/runs/29288372154), package/health success; contract failure.
- Azure rollback: [run 29288922941](https://github.com/AsoraKK/Asora/actions/runs/29288922941), restore/health success; same contract failure.
- Gateway tests: 11/11 pass.
- Domain contract: pass.
- Wrangler preview dry-run: pass.
- Marketing output contract: 10/10 routes pass.
- Worker live CORS/cache/origin-leak probes: pass, except live origin-boundary rejection intentionally blocked.
- Browser route and forged-state proof: partial; full identity flow unavailable.
- Raw responses: gitignored `.artifacts/cloudflare-audit/`.

## 18. Unknowns and blockers

| Severity | Owner | Required action |
|---|---|---|
| Critical | Cloudflare owner | Grant the seven missing read permissions |
| Critical | Platform owner | Preserve legacy traffic while adding origin-token enforcement |
| High | API owner | Fix moderation appeal error-schema drift |
| High | Identity owner | Provide an approved isolated preview identity |
| High | Web owner | Resolve public post/user/legal/root route behavior |
| High | Release owner | Reconcile once after PR 452 merges and rerun full validation |
| Medium | Security owner | Raise minimum TLS and decide HSTS/Always Use HTTPS |
| Medium | Mail owner | Select approved mail provider values |

Production cutover remains forbidden.
