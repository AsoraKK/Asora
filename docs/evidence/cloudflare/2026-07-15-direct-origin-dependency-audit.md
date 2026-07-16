# Direct-origin dependency audit — 2026-07-15

## Result

**NO-GO for Azure origin-token enforcement.** This is a read-only audit. No Azure, Cloudflare, DNS, CORS, OAuth, Access, or routing configuration was changed.

The Azure Function App is running with HTTPS-only enabled. Its default hostname is `asora-function-dev.azurewebsites.net`, and an unauthenticated `GET /api/health` to that hostname returned HTTP 200 without `X-Lythaus-Origin-Token`. `ORIGIN_GATEWAY_TOKEN` exists as a redacted application-setting state, but `ORIGIN_GATEWAY_AUTH_REQUIRED` is absent. Azure App Service Health Check is not configured, so no platform health-check exception is currently required.

The Functions source has a global HTTP pre-invocation guard with constant-time token comparison, but the current boolean flag only supports disabled/enforced states. It has no observe mode, expiring dual-accept mode, or narrowly scoped legacy exceptions.

## Current direct-origin consumers

| Consumer | Direct host/path | Environment | Production critical | Can inject origin token now? | Required migration action | Rollback dependency |
|---|---|---|---|---|---|---|
| Legacy public Azure bindings | `asora.co.za`, `www.asora.co.za` | Public legacy | Yes | No; browsers cannot hold the token | Move public pages to Pages redirects and method-preserving legacy API traffic to a token-injecting compatibility Worker before enforcement | Preserve legacy Worker/redirect configuration and Azure custom-host bindings |
| Legacy admin API | `admin-api.asora.co.za/api/*` | Protected legacy admin | Yes | No current Worker injection is proven | Route through a dedicated Access-protected admin gateway that injects the token; retain server-side roles | Preserve the existing Access application and direct binding until the replacement passes service-token and role checks |
| Legacy feed Worker | `dev.asora.co.za/api/feed*` to Azure origin | Legacy edge | Yes for existing feed traffic | No; `cloudflare/worker.ts` has a direct-origin fallback and does not set the token | Replace or refactor the Worker to require an origin, hold the token as a Worker secret, strip client spoofing, and inject the token | Record the current Worker version and route before deployment |
| Control-panel proxy | `control.asora.co.za/api/*` via `control-api-proxy` | Protected legacy admin | Yes | **UNKNOWN**; deployed Worker source was not in the repository audit | Export and inspect the deployed Worker version; add token injection or move the path to the admin gateway | Preserve the current route and Access service-token configuration |
| Legacy Flutter Pages deployment | `lythaus-web.pages.dev` and `app.lythaus.asora.co.za` | Public legacy web | Yes | No; browser code cannot hold the token | Rebuild/deploy only with gateway URLs, then scan the immutable bundle before moving traffic | Retain the prior immutable Pages deployment identifier |
| Native mobile release build | Azure `/api/*`, including auth calls | Android/iOS release | Yes | No | The release workflow must supply `ENVIRONMENT=production`, `API_BASE_URL`, and `AUTH_URL` for the gateway; replace Azure pin assumptions with gateway-host pin lifecycle | Retain the previous signed artifact; do not enable enforcement until the released-client population is assessed |
| Backend deployment acceptance | Azure `/api/health`, `/api/__bogus__`, notification checks | GitHub Actions deployment | Yes | Not currently | Add a dedicated deployment-only origin-token secret/header for application API probes; keep SCM operations separate | Azure configuration must return to dual/observe before restoring a Worker version without injection |
| Live contracts, admin metrics, and DSR drill | Azure `/api/*`, including `_admin/ops/metrics` | GitHub Actions release validation | Yes | Not currently | Add the deployment-only header to these approved operational requests; never log it | Preserve the approved release artifact and validation workflow revision |
| E2E integration workflow | Azure `/api/*`; Function host admin endpoints | GitHub Actions E2E | Yes | Application probes: not currently. Host-admin endpoints: not proven to pass through the Functions guard | Add the header to application endpoint checks; re-test Function host administrative endpoints with Function keys after enabling enforcement | Keep the OIDC deployment path and Function-key procedure documented |
| Daily operations and approved load checks | Azure value in `ALPHA_API_BASE_URL` and `K6_BASE_URL` | GitHub Actions operations | Yes for monitoring; load is explicitly gated | Not currently | Move monitoring to the gateway/admin gateway; require a dedicated header only for tightly approved direct diagnostics | Preserve rate-limit/load-test guardrails and disable jobs during transition if necessary |
| Manual admin, DSR, smoke, E2E, and load scripts | Azure `/api/*` defaults | Operator tooling | Operationally important | Not currently | Remove direct-origin defaults or require an explicit secure operational header; route ordinary smoke/load tests through the gateway | Retain a reviewed emergency procedure, never a token in local defaults |
| Marketing invite build input | `PUBLIC_API_BASE_URL` build input | CI/marketing | Potentially | Not established | The repository default is Lythaus, but the current GitHub variable classification contains an Azure origin while the build consumes a same-named secret. Inspect the immutable production artifact before declaring it safe | Retain the prior marketing deployment and build metadata |

### Explicitly not active or not proven as direct consumers

- Payment webhook configuration is not a current exception: no payment provider adapter is wired and the endpoint is a documented `501` placeholder.
- The OAuth redirect policy contains native schemes, `app.lythaus.asora.co.za`, Pages, and target Lythaus callbacks; it does not itself call Azure. The deployed `OAUTH_REDIRECT_URIS` value was not read, so additional configured callbacks are **UNKNOWN**.
- TLS pin checks and Azure SCM endpoints are operational dependencies, not application HTTP consumers. SCM is outside the Functions HTTP pre-invocation guard; Function host-admin endpoints must be re-tested after enforcement rather than assumed exempt.
- `api.asora.co.za` was not an Azure custom-host binding in the live Azure resource inventory; no active direct consumer was established for it.

## Evidence sources

- Azure resource metadata: Function App is running, HTTPS-only, with direct custom host bindings for `asora.co.za`, `www.asora.co.za`, `dev.asora.co.za`, and `admin-api.asora.co.za`.
- Azure application-setting names only: `ORIGIN_GATEWAY_TOKEN` present; `ORIGIN_GATEWAY_AUTH_REQUIRED` absent; CORS and OAuth settings exist but their values were not read.
- Direct anonymous origin health request: HTTP 200 without the token.
- Cloudflare evidence: active legacy `feed-cache` route `dev.asora.co.za/api/feed*` and `control-api-proxy` route `control.asora.co.za/api/*`; the temporary Lythaus gateway is preview-only.
- Immutable legacy Flutter Pages bundle scan: HTTP 200 and contains the Azure hostname.
- Repository and GitHub workflow inventory: release mobile build has no public API Dart defines; deployment, E2E, contract, DSR, monitoring, and load workflows contain direct Azure calls.

## Proposed flag-gated enforcement plan

This design requires a small reviewed implementation change. It must not be approximated by setting the current boolean flag until all direct consumers have been migrated.

1. **Observe mode** — introduce `ORIGIN_GATEWAY_AUTH_MODE=observe`. Validate a configured Key Vault-backed `ORIGIN_GATEWAY_TOKEN`, calculate valid/missing/invalid outcomes, and emit only aggregate route-class and host-class telemetry. Never log header values, request bodies, identities, tokens, cookies, or URLs with query strings. Run for a defined observation window and reconcile every direct consumer above.
2. **Dual-accept mode** — introduce `ORIGIN_GATEWAY_AUTH_MODE=dual` with an explicit UTC expiry and a reviewed exception registry. Valid gateway-token requests are accepted. Headerless requests are permitted only for a short, measurable transition window while the legacy public/API paths are moved behind token-injecting Workers. Do not use a host-header-only bypass: it can be spoofed at the direct origin.
3. **Enforced Lythaus mode** — bind the production Lythaus gateway/custom domains only after preview and rollback gates pass, move legacy API compatibility through a token-injecting Worker, then set `ORIGIN_GATEWAY_AUTH_MODE=enforce`. Missing or invalid tokens must return the existing controlled `403` response; a missing configured token must fail closed with `503`.
4. **Explicit legacy exceptions** — limit exceptions to platform management surfaces proven outside application invocation (SCM, and only after re-test Function host-admin endpoints). Public pages, public APIs, admin APIs, mobile clients, web clients, and webhooks must not receive a permanent headerless exception. No payment-webhook exception is needed until a provider is actually configured.
5. **Emergency bypass** — require an incident identifier, on-call approval, and a bounded expiry. First switch the reviewed mode from `enforce` to `dual` or `observe`; verify direct health and the gateway; then remediate or restore the Worker. Revert to `enforce` before closing the incident and preserve aggregate access evidence. Never disclose or rotate the token during incident handling unless an approved rotation procedure requires it.
6. **Rollback order** — for a Worker rollback that would remove token injection, first move Azure out of enforced mode, then restore the previous Worker version, Pages artifact, and any routing/custom-domain state. Re-run gateway and direct health/auth checks, confirm no split-brain state, and only then decide whether to re-enable enforcement.

## Enforcement gates

- Every public and admin path reaches Azure through a token-injecting Worker or an approved platform-management surface.
- The legacy `feed-cache` and `control-api-proxy` Worker versions have been exported, changed, and tested with the token.
- Current legacy Pages and native mobile traffic has been retired, migrated, or measured to zero for the approved compatibility window.
- Deployment, E2E, contract, DSR, monitoring, and load tooling have an approved secure header path or are deliberately disabled.
- A real browser OAuth flow, authenticated API path, Access admin path, and rollback exercise pass through the intended gateways.
- Direct origin without a token returns `403`; invalid token returns `403`; Worker-originated request succeeds; no Azure hostname leaks.
