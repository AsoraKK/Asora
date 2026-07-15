# Lythaus domain audit update

Date: 2026-07-15

## Executive result

**NO-GO.** The marketing Pages preview is proven, but the current audit token cannot read account-ruleset detail. That leaves account-level hostname interception unproven. Origin-token enforcement, full browser authentication, and a live rollback rehearsal are also not proven in this pass.

No production DNS, custom-domain, redirect, Worker-route, Access-policy, Azure, or email-DNS change was made.

## Targeted Cloudflare audit

The audit token verified active. The targeted full inventory run was deliberately allowed to finish with a sanitized failure result so no raw API responses were retained.

| Check | Result |
|---|---|
| Zone-specific ruleset details for `lythaus.co` and `asora.co.za` | No target-host intersection detected. |
| Zone Page Rules and Worker routes | No target-host intersection detected. |
| Account Bulk Redirect lists | None. |
| Account ruleset details | **UNKNOWN**: `GET /accounts/{redacted}/rulesets/{redacted}` returned HTTP 403. |
| Required token grant | Account Rulesets, Account scope, Read. This is audit-only and blocks proof that no account-level rule intercepts a target hostname. |

The earlier seven endpoint recheck remains successful; this is a newly discovered detail-read requirement needed for the target-host conflict assertion.

## Current target state

| Surface | Sanitized finding | Gate effect |
|---|---|---|
| `lythaus.co` | Active, authoritative, DNSSEC active; minimum TLS 1.0; Always Use HTTPS off; zone HSTS off. | TLS and HSTS changes remain deferred. |
| `asora.co.za` | Active, authoritative; DNSSEC disabled; minimum TLS 1.0; Always Use HTTPS on; zone HSTS off. | Legacy domain retained; no redirect change. |
| Marketing Pages | Existing direct-upload project `lythaus-marketing`, production branch `main`, no custom domain. | Do not create a duplicate project. |
| Admin Access | Existing applications for `admin.lythaus.co` and `admin-api.lythaus.co`; explicit administrator allow, service-token policy, then deny-all. | No new application or policy required before hostname binding. |
| Control-panel preview | Unauthenticated request receives an Access login challenge. | Preview remains protected. |

No target Worker Custom Domain, target Pages custom domain, target Worker route, or target DNS record was found in the sanitized read.

## Marketing preview

Source: `apps/marketing-site`; project: `lythaus-marketing`; branch: `codex/lythaus-domain-migration`.

GitHub Actions [run 29413933842](https://github.com/AsoraKK/Asora/actions/runs/29413933842) succeeded for commit `07ee0594948e64ff0d2cdff0d353853139a5f170`.

- Immutable preview: `https://190a630b.lythaus-marketing.pages.dev`
- Ten generated routes returned final HTTP 200 after normal trailing-slash canonicalization.
- Canonical and Open Graph URLs remain `https://lythaus.co`.
- Generated metadata contains no `asora.co.za`, Azure hostname, or Pages-development hostname.
- Sitemap, robots, security headers, and broken-link validation passed.
- Preview HSTS is deliberately conservative: `max-age=300`, without `includeSubDomains`.
- The deployment changed no custom domain.

The existing project is direct-upload, so Cloudflare reports no source repository, build command, or output directory for it. The GitHub preview workflow supplies `npm ci && npm run build`, validates `dist`, and performs the direct upload; production branch remains `main`.

## Gateway and Azure MVP safety

Read-only Worker probes against the existing preview gateway succeeded:

| Probe | Result |
|---|---|
| `GET /api/health` | 200; `Cache-Control: private, no-store`; no Azure response header observed. |
| Anonymous `GET /api/feed/discover` | 200; approved public cache policy only. |
| Direct Azure request without origin token | 200. |
| Direct Azure request with invalid origin token | 200. |

The last two results prove that `ORIGIN_GATEWAY_AUTH_REQUIRED` is currently disabled or otherwise not active at the HTTP boundary. The source guard is registered and has constant-time comparison tests, but enabling it could break direct legacy traffic. Direct-origin traffic requirements and the emergency access path are **UNKNOWN**, so this pass did not write an Azure token, change the enforcement flag, or deploy a Worker version.

Local validation passed:

```text
functions: npm test -- --runInBand tests/gateway/cloudflare.api-gateway.test.ts src/shared/security/originGatewayAuth.test.ts
2 suites, 10 tests passed

npx --yes wrangler@4.110.0 deploy --dry-run --config cloudflare/api-gateway/wrangler.toml --env preview
passed
```

The public health payload also reports `environment: local` and an internal notification project label. Treat this as a public operational-information exposure to correct before public cutover.

## Browser, rollback, and email

- Full browser PKCE, token exchange, UserInfo, session restoration, one-time-code reuse, and sign-out remain **UNKNOWN**: no approved isolated preview identity was available.
- Current-pass Worker and Pages rollback rehearsal is **NOT RUN**. A real Worker rollback is supported, but must be performed only with the matching Azure guard token, exact Flutter preview, and documented direct-origin rollback path.
- Lythaus email is **DEFERRED** pending provider selection. No MX, SPF, DKIM, DMARC, or Email Routing record was created.

## Required next actions

1. Grant **Account Rulesets: Read** at Account scope to `CLOUDFLARE_AUDIT_API_TOKEN`; rerun the one blocked detail request and target-host assertion.
2. Document current direct Azure consumers and an emergency path, then conduct the flag-gated Worker/Azure origin-token rehearsal with a generated Worker secret and protected Azure app setting.
3. Build an exact current Flutter preview configured for the ephemeral Worker and temporarily allow only that immutable Pages origin and callback.
4. Provide an approved isolated test identity for browser PKCE proof.
5. Rehearse Worker, Pages, and Function rollback before any production hostname binding.

PR 453 remains stacked on PR 452 and draft. No final conflict reconciliation was attempted.
