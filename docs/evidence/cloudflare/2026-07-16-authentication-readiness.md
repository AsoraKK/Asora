# Lythaus authentication readiness audit — 2026-07-16

## Executive result

**NO-GO.** Email/password implementation and its Azure provider foundation are
now prepared, but Google and email authentication still require immutable-preview
and gateway proof. No public Lythaus DNS/custom-domain cutover was performed.

## Scope and evidence method

- Branch: `codex/lythaus-domain-migration` (stacked draft PR #453).
- PR #452 is merged. The migration branch was fast-forwarded to the merged main
  head once; PR #453 remains draft pending this new commit and exact-head CI.
- GitHub secrets and variables were listed by **name only**. No value was
  read, printed, or included here.
- Azure app settings were classified by name and value state only
  (`empty`, `set-redacted`, or `key-vault-reference`).
- Public Lythaus host checks used unauthenticated `HEAD` requests only.

## Canonical contract

| Item | Required value | State |
| --- | --- | --- |
| Application origin | `https://app.lythaus.co` | Target only; DNS not published |
| API base | `https://api.lythaus.co/api` | Target only; DNS not published |
| Authorization endpoint | `https://api.lythaus.co/api/auth/authorize` | Target only; DNS not published |
| Token endpoint | `https://api.lythaus.co/api/auth/token` | Target only; DNS not published |
| UserInfo endpoint | `https://api.lythaus.co/api/auth/userinfo` | Target only; DNS not published |
| Web callback | `https://app.lythaus.co/auth/callback` | Enforced in source |
| Logout return | `https://app.lythaus.co/` | Not live-proven |

## Credential-rotation verification

| Item | Evidence | Result |
| --- | --- | --- |
| Former credential storage class | Repository variable named `CF_ACCESS_CLIENT_SECRET` | Variable absent |
| Approved replacement storage | Approved GitHub/Key Vault secret stores | Name-only presence confirmed |
| Workflow variable use | No `vars.CF_ACCESS_CLIENT_SECRET` reference found | Pass |
| Retired value | Not searched, printed, or reconstructed | Preserved safety boundary |
| Cloudflare audit token | Protected GitHub secret | Duplicate credential-like repository variable removed |

Credential-rotation storage verification now passes. No retired value was read.

## Live Azure MVP configuration inventory

The authorised MVP Function App is running with HTTPS-only transport. Relevant
setting names and states:

| Setting | State | Assessment |
| --- | --- | --- |
| `JWT_SECRET` | Key Vault reference | Approved storage class |
| `JWT_AUDIENCE` | Absent | Blocks a production deployment after this pass; source now fails closed |
| `EMAIL_HASH_SALT` | Key Vault reference | Approved storage class |
| `OAUTH_REDIRECT_URIS` | Set, redacted | Requires exact-value review before preview registration |
| `CORS_ALLOWED_ORIGINS` | Set, redacted | Requires exact-value review before preview registration |
| `ORIGIN_GATEWAY_TOKEN` | Set, redacted | Current token material is present |
| `ORIGIN_GATEWAY_AUTH_MODE` | Absent | Blocks observe/dual/enforce rehearsal |
| `ORIGIN_GATEWAY_TOKEN_NEXT` | Absent | Blocks token-rotation rehearsal |
| `ORIGIN_OPERATIONAL_TOKEN` | Absent | Blocks controlled direct-health proof |
| `ORIGIN_GATEWAY_DUAL_UNTIL` | Absent | Blocks bounded-dual rehearsal |
| `ORIGIN_GATEWAY_LEGACY_ALLOWLIST` | Absent | Blocks safe legacy exception review |
| Google provider configuration | No relevant setting name found | Google live proof blocked |
| `APP_ORIGIN` | Set public configuration | Canonical `https://app.lythaus.co` |
| `ACS_EMAIL_ENDPOINT` | Set public configuration | Europe Communication resource endpoint |
| `AUTH_EMAIL_FROM_ADDRESS` | Set public configuration | `no-reply@mail.lythaus.co` |
| `AUTH_EMAIL_FROM_NAME` | Set public configuration | `Lythaus` |
| `EMAIL_TOKEN_HMAC_SECRET` | Key Vault reference | Approved storage class |
| Email provider resources | Provisioned | Europe Email service, custom domain, and unlinked Communication service |

## Implementation inventory

| Surface | Observed implementation | Result |
| --- | --- | --- |
| `/api/auth/authorize` | OAuth code + S256 PKCE validation; currently resolves an existing upstream EasyAuth principal | Does not initiate or validate a Google OAuth exchange |
| `/api/auth/token` | Authorization-code and refresh grants; refresh rotation is implemented | Source-only evidence |
| `/api/auth/userinfo` | Protected endpoint | Source-only evidence |
| Google | Client sends a Google IdP hint | No configured Google handoff, issuer/JWKS/audience/nonce live proof |
| Email | Email/password registration, verification/resend, login, forgot/reset, Argon2id, token hashing, throttling and session revocation implemented | Unit/integration proof complete; live delivery pending DNS verification and deployment |
| Apple / World ID | Hidden in the MVP selector; client and backend reject them as unavailable | Unit-tested source hardening only |
| Browser callback | State and S256 verifier are cleared; nonce is generated; callback query is removed from browser history; errors are neutral | Not live-proven |
| Redirect policy | Canonical Lythaus callback accepted; obsolete Asora and Pages defaults removed; only exact configured non-production Pages callback allowed | Unit-tested |
| Web session | Session storage is used for the current browser token model | Cookie-based session and live refresh/logout/revocation remain unproven |
| Legacy browser auth service | The legacy B2C client remains reachable through the app service-provider graph | Must be retired or redirected through the approved gateway before gateway-only auth can be claimed |

## Repository changes in this pass

- Removed Apple and World ID from the MVP login selector.
- Added client and server provider gates returning a controlled unavailable
  result for Apple, World ID, and unknown provider hints.
- Added browser nonce generation and no-query callback history replacement.
- Made callback errors neutral; raw provider and HTTP failure text is no longer
  rendered by the callback screen.
- Removed obsolete public callback defaults and limited preview callbacks to
  one exact configured Pages URL outside production.
- Narrowed deployment CORS validation to fixed Lythaus origins plus one exact
  `MVP_PREVIEW_APP_ORIGIN` configuration value.
- Made `JWT_AUDIENCE` mandatory when the Functions process is production-like;
  missing audience validation can no longer silently deploy.
- Updated active documents that named Azure, obsolete Asora endpoints, or a
  Pages development hostname as canonical public endpoints.
- Added the six email/password API routes, database schema, official generated
  client, Azure Communication Services sender, and exact provider startup checks.
- Provisioned the approved Europe Email/Communication resources, disabled local
  ACS key authentication, stored the email-token HMAC key in Key Vault, and
  applied the additive empty email-auth database schema.

## Validation completed

| Check | Result |
| --- | --- |
| Functions TypeScript typecheck | Pass |
| Full Functions test suite | Pass (206 suites; 2,275 passed; 18 skipped) |
| Production-missing JWT audience regression test | Pass (fails closed) |
| Redirect/provider policy tests | Pass (12 tests) |
| Focused Flutter auth selector, callback, web PKCE tests | Pass (56 tests) |
| Full Flutter test suite | Pass |
| Flutter analysis | Pass |
| Flutter web release build with canonical Lythaus values | Pass |
| Marketing build | Pass (10 generated routes) |
| OpenAPI lint | Pass |
| Android signed release candidate | Blocked: approved local release-signing material is unavailable; no artifact was produced |
| CORS exact-origin validator smoke cases | Pass |
| Domain contract against fresh Flutter and marketing artifacts | Pass |
| Repository Git history secret scan | Pass (redacted scan; no leaks) |
| Fresh Flutter and marketing artifact secret scans | Pass (redacted scan; no leaks) |
| Public Lythaus host lookup | No DNS records found for application, API, or marketing host |
| Live Google browser flow | Not run: no immutable preview or provider handoff |
| Live email registration/delivery | Not run: no email backend/provider configuration |
| Origin observe/dual/enforce rehearsal | Not run: required Azure setting names absent |
| Access/admin proof | Not run: target Access applications and domains are not live |
| Rollback rehearsal | Not run: no reversible preview deployment exists |

## Required owner/provider actions

1. Run the protected ACS DNS workflow and wait for Domain/SPF/DKIM/DKIM2 verification;
   then link the verified domain and create the `no-reply` sender identity.
2. Select and configure the actual Google authentication control plane. The
   current Functions authorisation route expects an upstream principal, but no
   Google redirect/issuer/JWKS validation path is configured or proven.
3. Deploy the implemented email lifecycle and prove live delivery, verification,
   login, reset, refresh, logout, replay resistance, and rate limiting.
4. Create immutable Pages and Worker previews, register exactly one temporary
   callback and CORS origin, and perform supervised interactive login.
5. Populate the origin-auth mode, next-token, operational-token, dual-expiry,
   and reviewed legacy-allowlist settings from approved secret stores before
   rehearsing observe, dual, enforce, and rollback.
6. Configure the approved public JWT audience before deploying this source;
   the Function now intentionally rejects production startup without it.
7. Retire or redirect the reachable legacy B2C browser service through the
   approved gateway before asserting that public authentication has no direct
   legacy-origin dependency.
8. Run the canonical-domain Android release build in the approved signing
   environment, then scan the signed artifact. No local signing file was read
   or created during this audit.

## Conclusion

Repository safeguards may be committed to draft PR #453, but the MVP domain
cutover, origin enforcement, and authentication release remain **NO-GO** until
the provider, preview, live authentication, and rollback gates above are
evidenced.
