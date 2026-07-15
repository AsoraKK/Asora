# Origin-enforcement remediation status — 2026-07-15

## Result

**NO-GO for origin enforcement and public-domain cutover.**

This evidence records repository-only remediation after the direct-origin
dependency audit. No Azure application setting, Key Vault value, Cloudflare
Worker, Pages project, Access application, DNS record, custom domain, CORS
setting, OAuth callback, email DNS record, or production route was changed.

## Repository remediation completed

- Replaced the Boolean origin guard design with `off`, `observe`, `dual`, and
  `enforce` modes, constant-time comparisons, current/next token rotation,
  health-only operational-token access, strict legacy allowlists, controlled
  `403`/`503` responses, and privacy-safe aggregate telemetry.
- Prepared public, legacy-compatibility, and admin Worker definitions that
  strip client-supplied internal headers, inject Worker-held origin tokens, and
  keep credential-bearing traffic out of cache.
- Changed ordinary public, admin, DSR, E2E, contract, canary, and load-test
  tooling to require gateway URL configuration. Direct Azure application URLs
  are rejected by active operator scripts and no longer used by the active E2E
  workflow.
- Updated rollback ordering so Azure enforcement is relaxed before restoring a
  Worker version that may not inject the origin token.

## Security blocker

A credential-type configuration value was present in a GitHub repository
**variable** rather than being exclusively protected as a GitHub secret. Its
value is intentionally not recorded here. Treat it as exposed:

1. Revoke or rotate the affected credential using the approved provider
   procedure.
2. Delete the repository variable after the replacement secret is confirmed.
3. Confirm every workflow consumes only the replacement GitHub secret or an
   Azure Key Vault reference.
4. Record only the completion state and rotation identifier in future
   sanitized evidence.

No remediation write was attempted because credential rotation was not an
approved rotation procedure in this pass.

## Required provider configuration before rehearsal

| Item | Required state | Owner | Status |
|---|---|---|---|
| `MVP_PUBLIC_API_BASE_URL` | Exact public API Worker preview URL ending in `/api`; never an Azure origin | Platform | Missing/unknown |
| `MVP_ADMIN_API_BASE_URL` | Exact Access-protected admin gateway URL ending in `/api` | Platform | Missing/unknown |
| Azure origin mode | Candidate code deployed with `observe` and distinct Key Vault-backed current, next, and operational tokens | Platform | Not started |
| Worker preview | Immutable preview Worker secret matches Azure current token; no production custom domain | Platform | Not proven |
| Legacy compatibility | Existing feed and control proxy versions exported, then token injection verified | Platform | Control proxy snapshot incomplete for behaviour proof |
| Access | Explicit administrator and CI service-token policies for target admin hosts; no bypass/Everyone policy | Security | Not proven |
| Browser auth | Exact Pages preview CORS/callback values and isolated PKCE test identity | Product/Security | Not proven |
| Rollback | Azure observe/dual → prior Worker → Pages candidate restoration rehearsal | Platform | Not proven |

## Acceptance evidence still required

- Worker health, discovery, authenticated, cache, spoofed-header, and origin
  concealment results through an immutable Worker preview.
- Azure direct-origin missing-token and invalid-token `403` results, plus
  health-only operational-token success, after controlled `enforce` rehearsal.
- Immutable Flutter, marketing, and signed mobile artifact scans with no Azure
  or obsolete public Asora API hostnames.
- Browser PKCE, callback, refresh, invite, post, profile, privacy, and terms
  proof against the deployed preview.
- Access policy and backend-role proof for the control panel and admin API.
- Exact Worker, Pages, and Azure package rollback identifiers with successful
  restoration tests.

## Evidence handling

Raw provider responses and Worker source exports remain under ignored local or
CI artifact storage. This document contains no token, secret, Access client
credential, raw TXT value, cookie, JWT, user data, or Azure application-setting
value.
