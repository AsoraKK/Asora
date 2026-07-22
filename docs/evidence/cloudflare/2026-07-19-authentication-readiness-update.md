# Lythaus authentication readiness update — 2026-07-19

## Result

**NO-GO.** Provider control-plane configuration and the legacy admin
service-token/backend-role proof are now complete. Live Google and email
lifecycle proof, authenticated API contracts, origin enforcement rehearsal, and
rollback restoration remain mandatory before a public-domain cutover.

## Exact candidate

| Item | State |
| --- | --- |
| Branch | `codex/lythaus-domain-migration` |
| Draft PR | `#453` targeting `main` |
| Candidate head | `39c93ce02b1c426517c0c17f43ffae8502b6a10c` |
| Exact-head CI | Run `29679554490` — passed |
| Backend deployment | Run `29679888162` deployment job — passed |
| Deployed Function SHA | `39c93ce02b1c426517c0c17f43ffae8502b6a10c` |

The deployment run's authenticated-contract job remains incomplete because a
legitimate authenticated session has not yet been supplied. This is not treated
as a deployment success for release readiness.

## Google control plane

| Item | State |
| --- | --- |
| Google Cloud project | `lythaus` exists |
| Web OAuth client | Exactly one `Lythaus Web` client |
| Production origin | `https://app.lythaus.co` configured |
| Production callback | `https://app.lythaus.co/auth/callback` configured |
| Temporary preview origin | `https://eecdcf58.lythaus-web.pages.dev` configured |
| Temporary preview callback | `https://eecdcf58.lythaus-web.pages.dev/auth/callback` configured |
| Public client ID | `GOOGLE_OAUTH_CLIENT_ID` exists as a repository variable |
| Confidential client secret | `GOOGLE_OAUTH_CLIENT_SECRET_WEB` exists only as a protected GitHub secret and backend/Key Vault deployment input |

The preview build uses the public client ID only. Its initial authorization
request reaches the Google account chooser with authorization-code flow, PKCE
S256, state, nonce, and the exact preview callback. Human Google sign-in,
consent/MFA if required, callback processing, token exchange, UserInfo,
refresh, logout, revocation, and negative lifecycle proof remain **NOT RUN**.

## Provider scope

| Provider | Current state |
| --- | --- |
| Google | Enabled; control plane complete; live lifecycle pending supervised sign-in |
| Email/password | Enabled; provider acceptance and server controls exist; live mailbox lifecycle pending supervised interaction |
| Apple | Disabled and unavailable for MVP |
| World ID | Disabled and unavailable for MVP |

No password, OAuth secret, token, authorization code, cookie, or PKCE verifier
was read, recorded, or committed.

## Admin service-token proof

- No service token and a deliberately invalid service token both receive the
  Cloudflare Access challenge (`302`) at `admin-api.asora.co.za`; neither is
  treated as backend authorization.
- Read-only report preflight verified, without printing identifiers, that the
  backend Access audience matches the legacy admin Access application and that
  the configured service token is included by that application's policy.
- The backend accepts only a verified Cloudflare service-token claim with an
  empty subject and the configured service client ID (`common_name`) using a
  constant-time comparison. An explicit non-service claim or a non-empty
  subject is not granted the read-only role.
- Operations report run `29680039530` passed through Access and read-only
  backend authorization for `_admin/config` and `_admin/ops/metrics`.
- The role is `operations_reader` only. Config writes stay owner-only, normal
  human administration retains backend role checks, and no Access policy was
  broadened.

## Cloudflare audit note

Read-only audit run `29679318096` successfully inspected Access applications,
policies, and service-token metadata. It still lacks read permission for
registrar, Bulk Redirect, and several zone-ruleset-detail endpoints. Those
unavailable endpoints remain a public cutover blocker but do not invalidate the
completed legacy admin Access proof.

## Outstanding gates

1. Complete supervised Google browser lifecycle and all required negative
   tests using the immutable preview.
2. Complete supervised email registration, delivery, verification, login,
   recovery, replay/expiry, refresh, and logout lifecycle.
3. Run all 37 authenticated live contract cases with a legitimate session.
4. Prove public, legacy, and admin gateway token injection/cache behaviour;
   rehearse observe, bounded dual, enforce, rollback-first relaxation, and
   candidate restoration.
5. Revalidate live Cloudflare DNS, certificates, Page/Worker bindings,
   redirects, and rollback snapshots immediately before any public cutover.

No production DNS, custom-domain binding, redirect, email DNS, Access-policy
broadening, origin enforce-mode activation, or Asora retirement was performed.
