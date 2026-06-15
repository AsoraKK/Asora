# Completion Review Reconciliation

Date: 2026-06-15  
Scope: Reconcile the prior completion review against current repository evidence and separate code-complete work from merge/live proof.

## Status legend

- `code complete`: implemented in the current branch, but not yet proven on `main` or in live environment.
- `merged`: proven present on `main`.
- `live verified`: proven against a deployed environment or external control surface.
- `blocked`: current evidence does not close the claim.

## Executive correction

The earlier review was too optimistic in a few places. The current branch does contain substantial auth, rate-limit, OpenAPI, and B2C cleanup work, but the repo still shows at least one important exception to the "single canonical JWT verifier" story:

- `functions/shared/auth-utils.ts` still performs runtime token verification for legacy `functions/` handlers.
- That file still contains B2C-style OpenID configuration branching through `AUTH_MICROSOFT_DOMAIN`.

So the right conclusion is not "everything is fully complete". The right conclusion is:

- several items are genuinely code complete,
- several items are live verified only for one environment or path,
- several items are still blocked on merge proof or external proof,
- and the canonical JWT / B2C claims need one more explicit exception audit before they can be called fully closed.

## Reconciled item status

| Task | Status | Reconciled note |
|------|--------|-----------------|
| 1. Canonical JWT verification | `blocked` | `functions/src/auth/verifyJwt.ts` is canonical for `functions/src`, but `functions/shared/auth-utils.ts` still verifies JWTs for legacy handlers, so the "single boundary" claim is not yet globally true. |
| 2. JWT.sub = users.id UUIDv7 | `blocked` | Canonical verifier enforces UUIDv7 `sub`, but the legacy auth-utils path still normalizes `sub`/`oid` without the same contract. |
| 3. Cloudflare feed-cache correctness | `live verified` | Anonymous feed cache behavior and authenticated bypass were already proven in live evidence; keep the claim limited to the anonymous discover surface. |
| 4. Live feed 530 / availability | `live verified` | The dev feed path returned `200` and repeat-request cache behavior was observed; beta-domain parity still needs separate proof if that target differs. |
| 5. Production web fallback host removal | `blocked` | Code cleanup exists, but the browser proof that the prompt is gone on a clean profile is still missing. |
| 6. Web security headers | `live verified` | Headers were observed on deployed Pages responses; this is the strongest of the external proofs. |
| 7. Admin audit logging | `code complete` | Audit logging is implemented in-repo; no new external proof was required for the code claim. |
| 8. DSR purge/anonymisation mismatch | `blocked` | The code/docs alignment exists, but the dry-run or test-environment proof is still missing. |
| 9. Admin JWT storage hardening | `blocked` | The storage change is implemented, but the clean-browser confirmation and behavior proof are not yet closed. |
| 10. Endpoint-specific rate limits | `code complete` | The route guards and tests are in place on the current branch, but the claim is not merged to `main` from this worktree. |
| 11. OpenAPI contract gate | `code complete` | The gate and generated artifacts are present, but the review should avoid implying merged status without current `main` confirmation. |
| 12. Beta smoke tests | `code complete` | The smoke harness exists; live execution against the deployed beta target is still the missing proof. |
| 13. B2C compatibility endpoint removal | `blocked` | The live `/api/auth/b2c-config` route removal is good, but `functions/shared/auth-utils.ts` still contains B2C-style authority handling, so the legacy compatibility surface is not fully gone. |
| 14. Cloudflare Access audit | `blocked` | Deny-path checks are proven, but authenticated browser allow-path proof is still missing. |

## What changed in the review language

- Replace "95-100% complete" with the more accurate status labels above.
- Separate `code complete` from `merged` and `live verified`. Those are different proofs.
- Treat the canonical JWT claim as scoped to the approved runtime verifier boundary, not to every `jwtVerify()` call in the repo.
- Keep the B2C cleanup claim scoped to the removed endpoint; do not overstate it as a full removal until the legacy auth-utils path is retired or explicitly exempted.

## Evidence appendix

### Branch and merge state

- Current branch: `codex/endpoint-rate-limits`
- Head commit: `c3aa4c35`
- `main` does not yet contain `c3aa4c35` from this worktree, so merge proof is not current.

### JWT verifier inventory

Commands used:

```bash
rg -n "jwtVerify\\(" functions lib scripts test
rg -n "verifyJWT\\(|requireUser\\(|configureTokenVerifier\\(" functions lib test
```

Key result:

- Approved runtime verifiers: `functions/src/auth/verifyJwt.ts`, `functions/src/admin/accessAuth.ts`
- Additional legacy runtime verifier surface: `functions/shared/auth-utils.ts`
- Tests/helpers also call `jwtVerify()` as expected

### Canonical verifier facts

- `functions/src/auth/verifyJwt.ts` enforces `HS256`, issuer, audience, expiry, not-before, token type, and UUIDv7 `sub`.
- `functions/src/admin/accessAuth.ts` is a separate Cloudflare Access verifier and is not the same security boundary as the JWT bearer verifier.

### Remaining gap to close before "fully complete"

- Either retire the legacy `functions/` auth path or explicitly document and test it as an approved exception.
- Prove the beta/browser and DSR live drills that remain external to the repo.
- Confirm the merged state on `main` before any status row is upgraded from `code complete` to `merged`.

