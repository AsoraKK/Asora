# Lythaus authentication readiness audit — 2026-07-16

## Executive result

**NO-GO.** Repository hardening is partially complete, but Google and email
authentication cannot be proven through an immutable preview or the Lythaus
gateway. No production DNS, custom domain, Cloudflare Access policy, CORS,
OAuth callback, Worker secret, or Azure setting was changed in this audit.

## Scope and evidence method

- Branch: `codex/lythaus-domain-migration` (stacked draft PR #453).
- Base PR #452 remains open; no rebase or large conflict reconciliation was
  performed.
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
| Former credential storage class | Repository variable named `CF_ACCESS_CLIENT_SECRET` | Non-compliant residual exists |
| Approved replacement storage | GitHub repository secret with the same name exists | Name-only presence confirmed |
| Workflow variable use | No `vars.CF_ACCESS_CLIENT_SECRET` reference found | Pass |
| Retired value | Not searched, printed, or reconstructed | Preserved safety boundary |

The residual credential-named repository variable prevents a clean rotation
attestation. Its value was deliberately not read. The variable must be removed
after confirming no approved workflow depends on it; workflows already use the
GitHub Actions secret form.

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
| Email provider/sender configuration | No relevant setting name found | Email delivery proof blocked |

## Implementation inventory

| Surface | Observed implementation | Result |
| --- | --- | --- |
| `/api/auth/authorize` | OAuth code + S256 PKCE validation; currently resolves an existing upstream EasyAuth principal | Does not initiate or validate a Google OAuth exchange |
| `/api/auth/token` | Authorization-code and refresh grants; refresh rotation is implemented | Source-only evidence |
| `/api/auth/userinfo` | Protected endpoint | Source-only evidence |
| Google | Client sends a Google IdP hint | No configured Google handoff, issuer/JWKS/audience/nonce live proof |
| Email | Flutter still references an `authEmail` path | No corresponding Functions email registration/login/verification/reset route found |
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

1. Remove the residual repository variable named `CF_ACCESS_CLIENT_SECRET`;
   retain the GitHub Actions secret only.
2. Select and configure the actual Google authentication control plane. The
   current Functions authorisation route expects an upstream principal, but no
   Google redirect/issuer/JWKS validation path is configured or proven.
3. Supply an approved email provider, sender identity, and secret-store
   configuration, then implement and review the missing email auth lifecycle.
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
