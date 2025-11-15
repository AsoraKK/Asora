# Data Subject Request (DSR) Runbook

Version: 1.1
Last Updated: 2025-11-15
Owners: Privacy Engineering + Platform

## 1. Preconditions & Roles
- **Role requirement:** All `/admin/dsr/*` and `/admin/legal-hold/*` calls require a decorated JWT with the `privacy_admin` role.
- **Infrastructure:** Dedicated export storage account (see `docs/DSR_INFRASTRUCTURE_SETUP.md`) with container `dsr-exports`, lifecycle 30 days, TLS 1.2+, private networking, and RBAC granting `Storage Blob Data Contributor` to the function MI.
- **Retention policy reminders:** inactive accounts ≥24 months, user-deleted content ≤30 days, operations logs 30 days, security/audit logs 12 months, moderation artifacts closed +90 days.

## 2. Submit Export or Delete
- **Export (`/admin/dsr/export`):** Body `{ "userId": "<uuidv7>" }`. Creates `privacy_requests` document with `type: export` and status `queued`, enqueues `dsr-requests` message, emits `dsr.enqueue` span.
- **Delete (`/admin/dsr/delete`):** Same body shape, `type: delete`. Worker marks content as `deleted: true` on Cosmos/postgres rows, enforcing legal holds.
- **Additional fields:** Include `note` for traceability (e.g., compliance ticket). `audit_logs` gets `event: enqueue.export` or `.delete` with `by` and `meta.requestId`.

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
- **Release (`/admin/dsr/{id}/release`):** Requires both reviewers recorded as `pass: true` and status `ready_to_release`. Response includes `downloadUrl` + `expiresAt`. The signed URL is built with user-delegation SAS TTL `DSR_EXPORT_SIGNED_URL_TTL_HOURS` (default 12h) and is never persisted.
- **Download (`/admin/dsr/{id}/download`):** Regenerates a fresh SAS if status is `released`; fails if `completedAt` > 30 days ago (the retention window enforced by blob lifecycle).
- **Audit:** Release appends audit entry `event: 'release.sas'` with `meta.linkTTL: 12h` and writes to `audit_logs`.

## 7. Place & Clear Legal Holds
- **Place (`/admin/legal-hold/place`):** Body `{ scope: user|post|case, scopeId, reason }`. Creates `legal_holds` document, `active: true`, `audit` entry, and prevents any delete job touching the scope.
- **Clear (`/admin/legal-hold/clear`):** Body `{ id }`. Sets `active: false`, records `audit` entry `{ event: 'cleared' }`, and releases blocked delete jobs; if a delete job is queued, it can now proceed.

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

---
...existing code...
