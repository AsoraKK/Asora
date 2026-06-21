# Completion Review Reconciliation

Date: 2026-06-15  
Scope: Reconcile the prior completion review against current repository evidence and separate code-complete work from merge/live proof.

## Status legend

- `code complete`: implemented in the current branch, but not yet proven on `main` or in live environment.
- `merged`: proven present on `main`.
- `live verified`: proven against a deployed environment or external control surface.
- `blocked`: current evidence does not close the claim.

## Executive correction

The earlier review was too optimistic in a few places, but the repo state has since moved again. The legacy auth exception called out in this reconciliation has now been remediated:

- `functions/shared/auth-utils.ts` no longer performs its own OpenID/JWKS verification.
- The B2C-style authority branch has been removed from the legacy runtime auth path.
- The remaining runtime `jwtVerify()` calls are limited to the approved HS256 bearer verifier and the separate Cloudflare Access verifier.

The remaining gaps are no longer the canonical JWT boundary itself. They are deployment/evidence and human-operated proof items.

## Reconciled item status

| Task | Status | Reconciled note |
|------|--------|-----------------|
| 1. Canonical JWT verification | `code complete` | `functions/shared/auth-utils.ts` now delegates to `functions/src/auth/verifyJwt.ts`, legacy moderation/privacy route registrations are wrapped with canonical middleware, and runtime `jwtVerify()` inventory is limited to approved wrappers. |
| 2. JWT.sub = users.id UUIDv7 | `code complete` | The legacy auth-utils path no longer normalizes `sub` from `oid`; legacy handler verification now inherits the canonical UUIDv7 `sub` check. |
| 3. Cloudflare feed-cache correctness | `live verified` | Anonymous feed cache behavior and authenticated bypass were already proven in live evidence; keep the claim limited to the anonymous discover surface. |
| 4. Live feed 530 / availability | `live verified` | The dev feed path returned `200` and repeat-request cache behavior was observed; beta-domain parity still needs separate proof if that target differs. |
| 5. Production web fallback host removal | `blocked` | Code cleanup exists, but the browser proof that the prompt is gone on a clean profile is still missing. |
| 6. Web security headers | `live verified` | Headers were observed on deployed Pages responses; this is the strongest of the external proofs. |
| 7. Admin audit logging | `code complete` | Audit logging is implemented in-repo; no new external proof was required for the code claim. |
| 8. DSR purge/anonymisation mismatch | `blocked` | The route/auth path is now proven, but the live dev queue trigger still does not consume `dsr-requests` messages, so the legal-hold dry-run remains unproven. |
| 9. Admin JWT storage hardening | `blocked` | The storage change is implemented, but the clean-browser confirmation and behavior proof are not yet closed. |
| 10. Endpoint-specific rate limits | `code complete` | The route guards and tests are in place on the current branch, but the claim is not merged to `main` from this worktree. |
| 11. OpenAPI contract gate | `code complete` | The gate and generated artifacts are present, but the review should avoid implying merged status without current `main` confirmation. |
| 12. Beta smoke tests | `code complete` | The smoke harness exists; live execution against the deployed beta target is still the missing proof. |
| 13. B2C compatibility endpoint removal | `code complete` | The `/api/auth/b2c-config` route removal stands and the legacy auth-utils B2C-style authority branch is no longer present in the runtime auth path. |
| 14. Cloudflare Access audit | `blocked` | Deny-path checks are proven, but authenticated browser allow-path proof is still missing. |

## What changed in the review language

- Replace "95-100% complete" with the more accurate status labels above.
- Separate `code complete` from `merged` and `live verified`. Those are different proofs.
- Treat the canonical JWT claim as scoped to the approved runtime verifier boundary: `functions/src/auth/verifyJwt.ts` for bearer tokens and `functions/src/admin/accessAuth.ts` for Cloudflare Access.
- Keep `code complete`, `merged`, and `live verified` separated. The auth code claim is now closed in-repo, but browser/admin/DSR proof remains separate.

## Evidence appendix

### Branch and merge state

- Current branch: `main`
- Head commit: `b71a154842691b4f80e33990f535e3b8a3f66d0c`
- The release merge is already on `main`; later `main` commits after the validated runtime head are evidence/documentation only.

### JWT verifier inventory

Commands used:

```bash
rg -n "jwtVerify\\(" functions lib scripts test
rg -n "verifyJWT\\(|requireUser\\(|configureTokenVerifier\\(" functions lib test
```

Key result after remediation:

- Approved runtime verifiers: `functions/src/auth/verifyJwt.ts`, `functions/src/admin/accessAuth.ts`
- Legacy compatibility helper `functions/shared/auth-utils.ts` delegates to the canonical verifier instead of performing its own verification
- Tests/helpers also call `jwtVerify()` as expected

### Canonical verifier facts

- `functions/src/auth/verifyJwt.ts` enforces `HS256`, issuer, audience, expiry, not-before, token type, and UUIDv7 `sub`.
- `functions/src/admin/accessAuth.ts` is a separate Cloudflare Access verifier and is not the same security boundary as the JWT bearer verifier.

### Remaining gap to close before "fully complete"

- Prove the beta/browser and DSR live drills that remain external to the repo. For DSR specifically, the remaining blocker is live queue-trigger execution, not route registration.
- Record operator-side secret rotation evidence if rotation happened outside the repository pass.
- Complete the remaining human-operated admin allow-path proof before upgrading those items to `live verified`.

