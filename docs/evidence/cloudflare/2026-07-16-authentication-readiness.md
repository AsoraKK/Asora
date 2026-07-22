# Lythaus authentication readiness evidence — 2026-07-16

## Executive result

**NO-GO.** Repository-controlled authentication hardening, immutable Flutter and
gateway previews, exact preview CORS/callback configuration, email provider
configuration and provider acceptance, and an exact backend deployment are
complete. Live Google login, mailbox-confirmed email account lifecycle,
authenticated contract acceptance, admin/legacy
token-injecting gateways, and enforcement rollback remain unproven. No public
Lythaus DNS or custom-domain cutover was performed.

## Release identity

| Item | Value |
| --- | --- |
| Branch | `codex/lythaus-domain-migration` |
| Draft PR | `#453` targeting `main` |
| Evidence parent head before this update | `a073c2b147042a5126b22ed1f8b64c44e6b605ba` |
| Deployed backend artifact SHA | `0c4e3367466eab45b437832a7bc6806e1bd7527b` |
| Exact artifact CI | GitHub Actions run `29534973990` — passed |
| Latest exact-head CI | GitHub Actions run `29536159758` — running when captured; no failed job observed |

## Canonical authentication contract

| Item | Required value | Current state |
| --- | --- | --- |
| Application origin | `https://app.lythaus.co` | Canonical configuration; public hostname not bound |
| API base | `https://api.lythaus.co/api` | Canonical production configuration; public hostname not bound |
| Authorization | `https://api.lythaus.co/api/auth/authorize` | Implemented behind preview gateway |
| Token | `https://api.lythaus.co/api/auth/token` | Implemented behind preview gateway |
| UserInfo | `https://api.lythaus.co/api/auth/userinfo` | Implemented behind preview gateway |
| Web callback | `https://app.lythaus.co/auth/callback` | Canonical production callback configured |
| Logout return | `https://app.lythaus.co/` | Canonical configuration; live lifecycle not proven |

## Credential storage and rotation verification

- The former credential-bearing repository variable `CF_ACCESS_CLIENT_SECRET`
  is absent. Its replacement exists as a GitHub secret; no value was read.
- No workflow references a credential-like `vars.*` name.
- Cloudflare credentials are GitHub secrets, not repository variables.
- Origin current, next, and operational credentials exist only as protected
  `dev` environment secrets and Azure Key Vault references.
- `JWT_SECRET` and `EMAIL_TOKEN_HMAC_SECRET` are Azure Key Vault references.
- The retired credential was not searched for, reconstructed, printed, or
  restored.
- Exact-head Gitleaks passed in run `29536159758` before the long-running build
  jobs completed; prior full exact-head run `29534973990` passed all scans.

## Provider state

| Provider | State | Evidence |
| --- | --- | --- |
| Google | **Blocked** | No Google client/provider setting or Azure EasyAuth provider is configured; no live issuer, audience, signature, nonce, callback, refresh, or logout proof exists |
| Email/password | **Provider ready, lifecycle not live-proven** | Six routes deployed; ACS domain/SPF/DKIM/DKIM2 are verified; sender and Function managed-identity authorization are active; one provider send was accepted; mailbox delivery and account lifecycle remain unconfirmed |
| Apple | **Disabled for MVP** | Hidden in Flutter; backend returns controlled unavailable result; unit/contract policy tests pass |
| World ID | **Disabled for MVP** | Hidden in Flutter; backend returns controlled unavailable result; unit/contract policy tests pass |

The dedicated test mailbox was not automated because its password may only be
entered interactively. No mailbox credential appears in repository files,
commands, logs, screenshots, artifacts, GitHub variables, or evidence.

The locked MVP email model is email/password only. Magic links and email OTPs
are not enabled. The exact visible choices are `Continue with Google` and
`Continue with email`.

## Immutable preview evidence

### API gateway

- URL: `https://lythaus-api-gateway-preview.asora.workers.dev`
- Initial deployment: `01310b83-8198-4b1c-8929-1892aa3f1243`
- Exact-preview-CORS deployment: `48b59e27-29d7-4f1e-b02f-0c3d8894acd0`
- Previous Worker version captured: `44ae3497-1bc4-4b06-8f09-d9cd265eccca`
- Worker proof run: `29534553157`
- Health returns HTTP 200 through Cloudflare.
- Exact preview CORS and preflight pass; a denied origin is rejected.
- Client-supplied internal origin headers are replaced by the Worker-held
  credential.
- Responses are `private, no-store`; no Azure hostname or Azure response header
  was observed.
- No production route, custom domain, or DNS record was changed.

### Flutter web

- Immutable URL: `https://396f64a3.lythaus-web.pages.dev`
- Pages project: `lythaus-web`
- Preview run: `29534316796`
- Routes `/`, `/login`, `/auth/callback`, `/invite/test`, `/post/test`,
  `/user/test`, `/privacy`, and `/terms` return HTTP 200 directly without hash
  routing or redirect loops.
- The release bundle contains no Azure hostname, obsolete Asora public API
  hostname, Pages development hostname leak, or credential.

### Exact temporary configuration

- Preview CORS origin: `https://396f64a3.lythaus-web.pages.dev`
- Preview callback: `https://396f64a3.lythaus-web.pages.dev/auth/callback`
- No wildcard Pages origin or callback was configured.
- The backend redirect policy permits only the exact configured Lythaus Pages
  project callback and rejects aliases, unrelated Pages projects, fragments,
  credentials, and obsolete public callbacks.

## Azure MVP origin state

| Setting | Sanitized state |
| --- | --- |
| `ORIGIN_GATEWAY_AUTH_MODE` | Set to observe during this evidence pass |
| `ORIGIN_GATEWAY_TOKEN` | Key Vault reference |
| `ORIGIN_GATEWAY_TOKEN_NEXT` | Key Vault reference |
| `ORIGIN_OPERATIONAL_TOKEN` | Key Vault reference |
| `ORIGIN_GATEWAY_LEGACY_ALLOWLIST` | Set; value not recorded |
| `ORIGIN_GATEWAY_DUAL_UNTIL` | Absent because dual mode was not entered |
| `APP_ORIGIN` | Set public configuration |
| `ACS_EMAIL_ENDPOINT` | Set public configuration |
| `AUTH_EMAIL_FROM_ADDRESS` | Set public configuration |
| `AUTH_EMAIL_FROM_NAME` | Set public configuration |
| `AUTH_EMAIL_CLIENT_ID` | Set public configuration |
| `EMAIL_TOKEN_HMAC_SECRET` | Key Vault reference |
| `JWT_SECRET` | Key Vault reference |
| Google provider/client settings | Missing |
| Unsafe test-user override | Missing |

The GitHub OIDC identity has `Contributor` at subscription and resource-group
scope, which is sufficient for Communication resources and Function settings,
but it has no Key Vault secret data action or role-assignment write capability.
The Function managed identity already has `Communication and Email Service
Owner` scoped to the exact Communication service.

The protected `AZURE_CLIENT_ID` secret is the active deployment source. A stale
same-name repository variable resolves to a different enabled Entra application
with no direct RBAC assignment. All branch workflows now use the protected
secret. Delete the obsolete variable only after this change reaches `main`, so
the current default-branch workflows are not broken mid-review.

Direct Azure health remains available in observe mode. Enforce mode was not
entered because public authenticated traffic, the admin gateway, legacy
compatibility gateways, and rollback restoration have not all passed.

## Deployment and live acceptance

Backend workflow `29536173007` deployed the exact immutable artifact and passed:

- exact-SHA/CI provenance;
- Azure OIDC login;
- exact application and platform CORS configuration;
- immutable Flex package publication;
- Key Vault reference validation;
- app-setting validation;
- direct-origin health diagnostic;
- public gateway health and 404 checks;
- unauthenticated protected-route rejection;
- Function host-admin registration through the Azure platform endpoint.

The subsequent live OpenAPI step passed 31 of 37 tests and failed six
authenticated cases. The protected fallback smoke credential received HTTP 401
from the MVP boundary; later repeated traffic also reached rate limiting. No
auth bypass was added. This proves the gateway and auth rejection path, but not
an authenticated session.

Safe live email probes confirmed that register and login routes exist and return
controlled HTTP 400 for empty input with exact CORS and `private, no-store`.
Repeated invalid verification/reset requests returned HTTP 429. No account was
created and no password or token was submitted.

The ACS data-plane accepted one minimal message from the approved sender to the
dedicated test mailbox. This proves provider acceptance, not inbox delivery.
Application telemetry now records only message class and attempted, accepted,
or failed outcome. No ACS delivery/bounce/suppression Event Grid subscription is
configured. A resource-filtered monthly budget warns at $10 and becomes critical
at $25; current spend was $0 when captured.

## Repository validation

| Check | Result |
| --- | --- |
| Functions typecheck/tests | Typecheck passed; focused provider/email telemetry 13/13 and broader auth suite 365/365 passed locally |
| Flutter full tests and coverage | Passed; 3,644 tests, 5 skipped, 90.04% line coverage |
| Focused Flutter auth tests | Passed; 23 tests including active labels, email screens, and deferred-provider visibility |
| OpenAPI lint/generation/drift | Passed on exact-head workflows |
| Local OpenAPI lint/contracts | Lint passed; 20 local examples passed and 17 live-only cases skipped |
| Flutter web artifact scan | Passed |
| Android/iOS artifact guards | Passed on prior exact-head CI; current exact-head jobs pending when captured |
| Workflow lint | Passed on exact-head run `29536159758` |
| Gitleaks | Passed on exact-head run `29536159758` |
| Current local secret scan | Passed; 1,457 commits scanned, no leaks found |
| Immutable route refresh | Passed for eight routes |
| Live unauthenticated gateway contracts | Passed |
| Live authenticated contracts | Failed: protected smoke credential rejected |
| Live Google browser lifecycle | Not run: provider configuration absent |
| Live email lifecycle | Not run: interactive credential entry required |
| ACS provider acceptance | Passed; inbox delivery confirmation pending |
| Access + backend-role proof | Not complete |
| Observe/dual/enforce/rollback | Observe only; dual/enforce/rollback withheld |

## Mandatory blockers

1. An administrator must configure an approved Google OAuth client/provider for
   the exact Lythaus production and immutable preview callbacks, storing any
   secret in an approved provider/Azure secret store.
2. A supervised interactive browser session must complete Google and email
   registration, verification, login, UserInfo, refresh, logout, revocation,
   reset, replay, state, nonce, and PKCE acceptance using the dedicated mailbox.
3. Create an MVP-valid protected smoke session/identity; the existing fallback
   staging credential is correctly rejected by the deployed MVP boundary.
4. Prove token injection and Access/backend-role isolation for the admin gateway
   and token injection for every legacy API compatibility gateway.
5. Rehearse observe, bounded dual, enforce, rollback-first relaxation, Worker and
   Pages restoration, candidate restoration, and post-restore authentication.
6. Finish exact-head CI after this evidence commit and require every check to
   pass.

## Decision

The repository and immutable previews are materially closer to cutover, but the
mandatory live authentication and safe enforcement gates are not satisfied.
Keep PR #453 draft. Do not bind production Lythaus domains, enable Azure enforce
mode, retire Asora routes, or claim the domain migration is complete.
