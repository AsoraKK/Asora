# Data Subject Request (DSR) Runbook

> **Branding note:** User-facing product = **Lythaus**; internal/infra = **Asora**. See [branding guide](../branding/lythaus-transition.md).

Version: 1.2
Last Updated: 2026-04-30
Owners: Privacy Engineering + Platform

## 1. Preconditions & Roles
- **Role requirement:** All `/admin/dsr/*` and `/admin/dsr/legal-holds*` calls require a decorated JWT with the `privacy_admin` role.
- **Infrastructure:** Dedicated export storage account (see `docs/DSR_INFRASTRUCTURE_SETUP.md`) with container `dsr-exports`, lifecycle 30 days, TLS 1.2+, private networking, and RBAC granting `Storage Blob Data Contributor` to the function MI.
- **Retention policy reminders:** inactive accounts ≥24 months, user-deleted content ≤30 days, operations logs 30 days, security/audit logs 12 months, moderation artifacts closed +90 days.

## 2. Self-Service User Endpoints

### 2a. Export (GDPR Article 20 – Data Portability)
- **Route:** `GET /user/export` — JWT authentication required; guest tokens rejected (401).
- **Rate limit:** 1 export per 24 hours per user (in-memory sliding window; Redis in production). Additional tier-based cooldown enforced by `exportCooldownService`.
- **Export shape** includes: profile data, posts, comments, likes, flags, appeals, votes.
- **Export excludes:** provider secrets/tokens (`auth_identities` not queried), raw IPs (hashed via `redactRecord()`), internal AI risk scores.
- **Redaction:** All content arrays (`posts`, `comments`, `likes`, `flags`, `appeals`, `votes`) are passed through `redactRecord()` before serialisation — IP fields are SHA-256 hashed, credential/token/secret fields are stripped entirely.
- **Error responses:** 500 errors return `{ error: 'INTERNAL_ERROR', exportId }` only — no internal Cosmos error detail is leaked to callers.
- **Audit:** Each export writes to `privacy_audit` container (`action: 'export'`, `operator: 'self'`). Failure path also writes audit record.
- **Logs:** All log events use structured event keys (e.g. `privacy.export.completed`). No raw userId, email, or JWT is emitted to logs.

### 2b. Delete (GDPR Article 17 – Right to be Forgotten)
- **Route:** `DELETE /user/delete` — JWT authentication required; `X-Confirm-Delete: true` header mandatory.
- **Rate limit:** 1 deletion per hour per user.
- **Idempotency:** If user record is not found in Cosmos, returns `200 alreadyDeleted: true`. Safe to retry.
- **Cascade strategy** (via `executeCascadeDelete`):
  | Store | Action |
  |-------|--------|
  | Cosmos `likes`, `appeal_votes` | Hard DELETE |
  | Cosmos `posts`, `comments`, `content_flags`, `appeals`, `moderation_decisions` | ANONYMIZE (author fields → `[deleted]`, email → `deleted@anonymized.local`) |
  | Cosmos `users` | Hard DELETE |
  | Postgres `follows` | Hard DELETE (both directions) |
  | Postgres `profiles` | Hard DELETE |
  | Postgres `auth_identities` | Hard DELETE (provider links removed) |
  | Postgres `refresh_tokens` | Hard DELETE (all sessions revoked) |
  | Postgres `users` | Hard DELETE |
- **Session revocation:** `revokeAllUserTokens(userId)` is called in addition to cascade. Token revocation failure is non-fatal (captured in audit).
- **Legal hold:** `executeCascadeDelete` checks for active holds before processing each item. Delete blocked by hold returns `partialFailure: true`.
- **Audit:** Writes to `privacy_audit` with `cosmos`, `postgres`, `revokedTokens`, and `errors` arrays. `result` is `'success'` or `'partial'`.
- **Response body** (success): `{ code, message, userId, deletedAt, deletionId, partialFailure }`. No email, IP, or JWT in response.
- **Logs:** Structured event keys only (`privacy.delete.completed`, etc.). No raw userId or PII in log strings.

## 3. Submit Export or Delete (Admin)
- **Export (`/admin/dsr/export`):** Body `{ "userId": "<uuidv7>" }`. Creates `privacy_requests` document with `type: export` and status `queued`, enqueues `dsr-requests` message, emits `dsr.enqueue` span.
- **Delete (`/admin/dsr/delete`):** Same body shape, `type: delete`. Worker calls `executeCascadeDelete` which marks Cosmos rows and purges Postgres canonical tables (`users`, `auth_identities`, `refresh_tokens`) while enforcing legal holds.
- **Additional fields:** Include `note` for traceability (e.g., compliance ticket). `audit_logs` gets `event: enqueue.export` or `.delete` with `by` and `meta.requestId`.

## 4. Monitor Status & Progress
- **GET `/admin/dsr/{id}`** returns the request document, including `review`, `audit`, and `exportBlobPath` for exports.
- **Statuses:** `queued → running → awaiting_review → ready_to_release → released → succeeded` (exports); `queued → running → succeeded` (deletes); `failed` if any step errors; `canceled` if admin aborts.
- **Audit entries** include `{ event: 'status.changed', meta: { updatedBy } }` and `audit_logs` container mirrors each change for external reporting.

## 5. Reviewer A Checklist (Safety Review)
- Confirm export package contains only hashed IPs (no raw IPs), no provider secrets, and redacted vendor payloads.
- Verify `ai_scorecard.jsonl` includes only `ScoreCard` entries (content_id, created_at, model_name, risk_score, label_set, decision).
- Ensure media link list references `media_links.jsonl` with `blobPath`, `sasUrl`, `expiresAt` (12h TTL) and that all `expiresAt` values are `<= now + 12h`.
- Validate that the package metadata matches the userId in the request and that no extra scopes are bundled.
- **Verify** that `content.posts` and `content.comments` in the JSON export contain no fields matching `/ip|secret|token|credential|password/i` in plain text.

## 6. Reviewer B Checklist (Operational Readiness)
- Confirm the Azure Storage container `dsr-exports/dsr-<env>/` contains the ZIP and lifecycle metadata (TTL 30 days).
- Check audit/logging spans `dsr.export.package` and `dsr.export.upload` succeeded with telemetry tags (`env`, `requestId`).
- Ensure the worker log shows the `DSR_MAX_CONCURRENCY` limit respected and there are no residual `watchdog` errors.
- Validate there are no active legal holds blocking the requested user (delete requests) before release.

## 7. Release Link Procedures
- **Release (`/admin/dsr/{id}/release`):** Requires both reviewers recorded as `pass: true` and status `ready_to_release`. Response includes `downloadUrl`, `signedUrl`, `expiresAt`, and the updated `status`. The signed URL is built with user-delegation SAS TTL `DSR_EXPORT_SIGNED_URL_TTL_HOURS` (default 12h) and is never persisted. Releases also respect `DSR_EXPORT_RETENTION_DAYS` (default 30) and reject exports that are older than that window instead of reissuing new links.
- **Download (`/admin/dsr/{id}/download`):** Regenerates a fresh SAS if status is `released` and the export is still inside `DSR_EXPORT_RETENTION_DAYS`; fails if the export is older than the retention window (normally 30 days) or if the record was never released.
- **Audit:** Release appends audit entry `event: 'release.sas'` with `meta.linkTTL: 12h` and writes to `audit_logs`.

## 8. Place & Clear Legal Holds
- **Place (`/admin/dsr/legal-holds`):** Body `{ scope: user|post|case, scopeId, reason }`. Creates `legal_holds` document, `active: true`, `audit` entry, and prevents any delete job touching the scope.
- **Clear (`/admin/dsr/legal-holds/{id}/clear`):** Clears the hold identified by `{id}`. Sets `active: false`, records `audit` entry `{ event: 'cleared' }`, and releases blocked delete jobs so queued work can resume.

## 9. Purge Window & Exceptions
- Soft-deleted data stays flagged for `DSR_PURGE_WINDOW_DAYS` (default 30). A TTL job (`purgeJob`) runs nightly to permanently remove items where `deletedAt <= now - purgeWindow` and no matching active legal hold.
- If a legal hold covers the record, the purge job skips it and emits `dsr.delete.purge` span noting `holdId`.
- Ops logs are trimmed at 30 days, security logs at 12 months; the `audit_logs` container is retained per `COSMOS_TERRAFORM_VALIDATION` guidelines.

## 10. Troubleshooting & Failure Drills
| Scenario | Detection | Remediation |
| --- | --- | --- |
| Export stuck in `queued` | No queue pick-ups, telemetry `dsr.queue.wait` high | Ensure `DSR_MAX_CONCURRENCY` not saturating, verify storage queue length, check Function app concurrency limits, rerun `az functionapp restart`. |
| ZIP creation fails (`failed` status) | Error `zip` or `container unauthorized` in logs | Check storage RBAC, regenerate user-delegation SAS, confirm MI has `Storage Blob Data Contributor`, rerun job with `/admin/dsr/{id}/retry`. |
| Delete blocked by hold | Delete job logs show `holdId` and job fails | Inspect `legal_holds` container, clear hold if legitimate or escalate to Legal team, then `/admin/dsr/{id}/retry`. |
| SAS leak report | External request for revoked link | Regenerate storage account user delegation key (invalidates SAS), mark audit entry `event: 'sas.revoked'`, optionally rotate storage roles (`grant-dsr-storage-access.sh`). |
| Token revocation fails | `privacy.delete.token_revocation_failed` in logs; audit `result: partial` | Postgres may be unavailable; run `SELECT * FROM refresh_tokens WHERE user_uuid = '<id>'` and manually purge, then mark ticket resolved. |
| `partialFailure: true` in delete response | Audit `errors` array non-empty | Review `privacy_audit` record for `errors`; re-run individual cleanup SQL / Cosmos operations as needed; re-call `DELETE /user/delete` (idempotent). |

## 11. Runbook Drills
- **Drill 1:** Queue export → record requestId, verify queue message flows to worker → ensure review endpoints behave per checklist, release link regenerates with new SAS via `/download`.
- **Drill 2:** Simulate delete for user with active hold → expect worker to skip items and log `legal hold` event; clear hold and rerun to ensure purge is allowed.
- **Drill 3:** Rotate storage roles via `infra/scripts/grant-dsr-storage-access.sh` then dequeue subsequent export to confirm MI permissions still valid.
- **Drill 4:** Call `DELETE /user/delete` twice for same user → second call returns `alreadyDeleted: true` (200), no duplicate audit writes.
- **Drill 5:** Call `GET /user/export` without Authorization header → expect 401. Call twice within 24 h with valid token → second call returns 429.

## 12. Monitoring & Observability
- Telemetry spans of interest: `dsr.enqueue`, `dsr.export.fetch`, `dsr.export.package`, `dsr.export.upload`, `dsr.review.pass`, `dsr.release.sas`, `dsr.delete.soft`, `dsr.delete.purge`.
- Self-service log events: `privacy.export.requested`, `privacy.export.started`, `privacy.export.completed`, `privacy.delete.completed`, `privacy.delete.token_revocation_failed`, `privacy.delete.audit_write_failed`, `privacy.delete.critical_error`.
- Check App Insights for traces matching requestId; review `audit_logs` container for matching `meta.requestId` entries.
- Use `scripts/diagnostics-v4.sh` or `az storage queue peek`/`az cosmosdb sql query` for live investigations.

## 13. Storage Role Rotation Notes
- When rotating storage roles or regenerating the SAS signing key, run `infra/scripts/grant-dsr-storage-access.sh` to reapply the `Storage Blob Data Contributor` role to the Function MI.
- Validate private endpoint connectivity by checking `az network private-endpoint show` and ensuring the subnet has access to the storage account firewall.

## 14. References
- Infrastructure setup: `docs/DSR_INFRASTRUCTURE_SETUP.md`
- OpenAPI contract: `api/openapi/openapi.yaml`
- Self-service routes: `functions/src/privacy/routes/{exportUser,deleteUser}.ts`
- Service layer: `functions/src/privacy/service/{exportService,deleteService,cascadeDelete}.ts`
- Admin surface: `functions/src/privacy/admin/*`
- Worker logic: `functions/src/privacy/worker/*`
- Storage helpers: `functions/src/privacy/common/storage.ts`
- Redaction utilities: `functions/src/privacy/common/redaction.ts`
- Auth token store: `functions/src/auth/service/refreshTokenStore.ts`
- Provisioning scripts: `infra/scripts/provision-dsr-storage.sh`

## 3. Monitor Status & Progress
- **GET `/admin/dsr/{id}`** returns the request document, including `review`, `audit`, and `exportBlobPath` for exports.
- **Statuses:** `queued → running → awaiting_review → ready_to_release → released → succeeded` (exports); `queued → running → succeeded` (deletes); `failed` if any step errors; `canceled` if admin aborts.
- **Audit entries** include `{ event: 'status.changed', meta: { updatedBy } }` and `audit_logs` container mirrors each change for external reporting.

## 4. Reviewer A Checklist (Safety Review)
- Confirm export package contains only hashed IPs (no raw IPs), no provider secrets, and redacted vendor payloads.
- Verify `ai_scorecard.jsonl` includes only `ScoreCard` entries (content_id, created_at, model_name, risk_score, label_set, decision).
- Ensure media link list references `media_links.jsonl` with `blobPath`, `sasUrl`, `expiresAt` (12h TTL) and that all `expiresAt` values are `<= now + 12h`.
- Validate that the package metadata matches the userId in the request and that no extra scopes are bundled.

## 5. Reviewer B Checklist (Operational Readiness)
- Confirm the Azure Storage container `dsr-exports/dsr-<env>/` contains the ZIP and lifecycle metadata (TTL 30 days).
- Check audit/logging spans `dsr.export.package` and `dsr.export.upload` succeeded with telemetry tags (`env`, `requestId`).
- Ensure the worker log shows the `DSR_MAX_CONCURRENCY` limit respected and there are no residual `watchdog` errors.
- Validate there are no active legal holds blocking the requested user (delete requests) before release.

## 6. Release Link Procedures
- **Release (`/admin/dsr/{id}/release`):** Requires both reviewers recorded as `pass: true` and status `ready_to_release`. Response includes `downloadUrl`, `signedUrl`, `expiresAt`, and the updated `status`. The signed URL is built with user-delegation SAS TTL `DSR_EXPORT_SIGNED_URL_TTL_HOURS` (default 12h) and is never persisted. Releases also respect `DSR_EXPORT_RETENTION_DAYS` (default 30) and reject exports that are older than that window instead of reissuing new links.
- **Download (`/admin/dsr/{id}/download`):** Regenerates a fresh SAS if status is `released` and the export is still inside `DSR_EXPORT_RETENTION_DAYS`; fails if the export is older than the retention window (normally 30 days) or if the record was never released.
- **Audit:** Release appends audit entry `event: 'release.sas'` with `meta.linkTTL: 12h` and writes to `audit_logs`.

## 7. Place & Clear Legal Holds
- **Place (`/admin/dsr/legal-holds`):** Body `{ scope: user|post|case, scopeId, reason }`. Creates `legal_holds` document, `active: true`, `audit` entry, and prevents any delete job touching the scope.
- **Clear (`/admin/dsr/legal-holds/{id}/clear`):** Clears the hold identified by `{id}`. Sets `active: false`, records `audit` entry `{ event: 'cleared' }`, and releases blocked delete jobs so queued work can resume.

## 8. Purge Window & Exceptions
- Soft-deleted data stays flagged for `DSR_PURGE_WINDOW_DAYS` (default 30). A TTL job (`purgeJob`) runs nightly to permanently remove items where `deletedAt <= now - purgeWindow` and no matching active legal hold.
- If a legal hold covers the record, the purge job skips it and emits `dsr.delete.purge` span noting `holdId`.
- Ops logs are trimmed at 30 days, security logs at 12 months; the `audit_logs` container is retained per `COSMOS_TERRAFORM_VALIDATION` guidelines.

## 9. Troubleshooting & Failure Drills
| Scenario | Detection | Remediation |
| --- | --- | --- |
| Export stuck in `queued` | No queue pick-ups, telemetry `dsr.queue.wait` high | Ensure `DSR_MAX_CONCURRENCY` not saturating, verify storage queue length, check Function app concurrency limits, rerun `az functionapp restart`. |
| ZIP creation fails (`failed` status) | Error `zip` or `container unauthorized` in logs | Check storage RBAC, regenerate user-delegation SAS, confirm MI has `Storage Blob Data Contributor`, rerun job with `/admin/dsr/{id}/retry`. |
| Delete blocked by hold | Delete job logs show `holdId` and job fails | Inspect `legal_holds` container, clear hold if legitimate or escalate to Legal team, then `/admin/dsr/{id}/retry`. |
| SAS leak report | External request for revoked link | Regenerate storage account user delegation key (invalidates SAS), mark audit entry `event: 'sas.revoked'`, optionally rotate storage roles (`grant-dsr-storage-access.sh`). |

## 10. Runbook Drills
- **Drill 1:** Queue export → record requestId, verify queue message flows to worker → ensure review endpoints behave per checklist, release link regenerates with new SAS via `/download`.
- **Drill 2:** Simulate delete for user with active hold → expect worker to skip items and log `legal hold` event; clear hold and rerun to ensure purge is allowed.
- **Drill 3:** Rotate storage roles via `infra/scripts/grant-dsr-storage-access.sh` then dequeue subsequent export to confirm MI permissions still valid.

## 11. Monitoring & Observability
- Telemetry spans of interest: `dsr.enqueue`, `dsr.export.fetch`, `dsr.export.package`, `dsr.export.upload`, `dsr.review.pass`, `dsr.release.sas`, `dsr.delete.soft`, `dsr.delete.purge`.
- Check App Insights for traces matching requestId; review `audit_logs` container for matching `meta.requestId` entries.
- Use `scripts/diagnostics-v4.sh` or `az storage queue peek`/`az cosmosdb sql query` for live investigations.

## 12. Storage Role Rotation Notes
- When rotating storage roles or regenerating the SAS signing key, run `infra/scripts/grant-dsr-storage-access.sh` to reapply the `Storage Blob Data Contributor` role to the Function MI.
- Validate private endpoint connectivity by checking `az network private-endpoint show` and ensuring the subnet has access to the storage account firewall.

## 13. References
- Infrastructure setup: `docs/DSR_INFRASTRUCTURE_SETUP.md`
- OpenAPI contract: `api/openapi/openapi.yaml`
- Admin surface: `functions/src/privacy/admin/*`
- Worker logic: `functions/src/privacy/worker/*`
- Storage helpers: `functions/src/privacy/common/storage.ts`
- Provisioning scripts: `infra/scripts/provision-dsr-storage.sh`
