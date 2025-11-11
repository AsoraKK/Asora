# Data Subject Request (DSR) Runbook

Version: 1.0
Last Updated: 2025-11-11
Owners: Privacy Engineering

## 1. Overview
The DSR subsystem enables administrators with the `privacy_admin` role to fulfill export (data portability) and delete (erasure) requests through a dual-review workflow and controlled release process. Export packages are generated asynchronously; deletion jobs perform soft-delete/anonymization respecting legal holds.

## 2. Architecture Summary
- Ingestion: Admin HTTP endpoints (`/admin/dsr/*`) enqueue requests into the `dsr-requests` queue.
- Persistence: Cosmos containers `privacy_requests`, `legal_holds`, and `audit_logs` store requests, holds, and audit entries.
- Processing: Queue-triggered workers execute export (`runExportJob`) and delete (`runDeleteJob`). Concurrency for exports throttled by `DSR_MAX_CONCURRENCY`.
- Review: Two reviewers (`reviewA`, `reviewB`) must both pass an export before release.
- Release: Generates a user‑delegation SAS URL (TTL `DSR_EXPORT_SIGNED_URL_TTL_HOURS`) for the packaged blob; URL is returned in response only and not persisted.
- Legal Holds: Holds prevent delete operations for scoped entities (user/post/case). Export still allowed.
- Auditing: Every lifecycle transition appends an audit entry and writes to `audit_logs` container.

## 3. Endpoint Reference (Admin)
| Purpose | Method | Path | Notes |
|---------|--------|------|-------|
| Enqueue export | POST | `/admin/dsr/export` | Body: `{userId, requestedBy}` |
| Enqueue delete | POST | `/admin/dsr/delete` | Body: `{userId, requestedBy}` |
| Get status | GET | `/admin/dsr/{id}` | Full request document |
| Retry | POST | `/admin/dsr/{id}/retry` | Only failed/canceled |
| Cancel | POST | `/admin/dsr/{id}/cancel` | Only queued/running |
| Review A | POST | `/admin/dsr/{id}/reviewA` | Body: `{pass, notes?}` |
| Review B | POST | `/admin/dsr/{id}/reviewB` | Body: `{pass, notes?}` |
| Release export | POST | `/admin/dsr/{id}/release` | Export only; requires `ready_to_release` |
| Download export URL | GET | `/admin/dsr/{id}/download` | After release |
| Place legal hold | POST | `/admin/dsr/legal-holds` | Body: `{scope, scopeId, reason, expiresAt?}` |
| Clear legal hold | POST | `/admin/dsr/legal-holds/{id}/clear` | Deactivates hold |

All endpoints: `Authorization: Bearer <JWT>` with `privacy_admin` role.

## 4. Typical Export Flow
1. Admin enqueues export.
2. Worker picks up request → status `running` → packages data → `awaiting_review`.
3. Review A + Review B mark pass → status transitions to `ready_to_release`.
4. Admin triggers release → SAS URL generated (not persisted) → status `released`.
5. User (out-of-band) or admin fetches download URL; handler re-generates a fresh SAS per request; audit persists release event only.

## 5. Typical Delete Flow
1. Admin enqueues delete.
2. Worker transitions to `running` and soft-deletes/anonymizes content, skipping items under active holds.
3. On success → status `succeeded`; failures → `failed` with reason.

## 6. Legal Holds
- Prevent deletion of scoped resources; user-level hold blocks entire delete job (fails with hold message).
- Placement requires reason; clearing records audit entry.

## 7. Environment & Settings
| Variable | Purpose | Example |
|----------|---------|---------|
| `DSR_EXPORT_STORAGE_ACCOUNT` | Storage account for export blobs | asoradsrstore |
| `DSR_EXPORT_CONTAINER` | Container name for export packages | dsr-exports |
| `DSR_QUEUE_NAME` | Queue name for DSR messages | dsr-requests |
| `DSR_MAX_CONCURRENCY` | Max concurrent export jobs | 3 |
| `DSR_EXPORT_SIGNED_URL_TTL_HOURS` | SAS TTL for released exports | 12 |
| `DSR_BLOB_UPLOAD_BUFFER_SIZE` | Stream upload buffer size | 4194304 |
| `DSR_BLOB_UPLOAD_CONCURRENCY` | Parallel upload concurrency | 5 |

## 8. Operational Procedures
### 8.1 Retry Failed Export
- Verify status is `failed`.
- POST `/admin/dsr/{id}/retry`.
- Monitor queue logs; confirm status moves to `running` then `awaiting_review`.

### 8.2 Cancel Running Export
- POST `/admin/dsr/{id}/cancel` (works only for `queued|running`).
- Confirm status becomes `canceled`.

### 8.3 Emergency Revoke Released SAS
SAS URLs are not persisted; they're generated on demand. To revoke outstanding links faster than TTL:
1. Regenerate the storage account user delegation key (invalidates user delegation SAS tokens).
2. If needed, rotate storage account keys for defense-in-depth.

### 8.4 Place Legal Hold
- POST `/admin/dsr/legal-holds` with scope/id.
- Confirm hold present in Cosmos `legal_holds` container.

### 8.5 Clear Legal Hold
- POST `/admin/dsr/legal-holds/{id}/clear`.
- Verify `active` becomes false; audit entry appended.

## 9. Monitoring & Telemetry
Key spans/events:
- `queue.export.dispatch`, `export.fetch`, `export.package`, `export.upload`, `export.error`.
- `queue.delete.dispatch`, `delete.soft`, `delete.completed`, `delete.error`.
- Audit entries mirror these events in `audit_logs`.

Use script `scripts/diagnostics-v4.sh` to tail function logs and query health.

## 10. Failure Modes & Runbooks
| Scenario | Symptom | Action |
|----------|---------|--------|
| Export stuck queued | No worker pickup | Check queue message visibility, ensure `DSR_MAX_CONCURRENCY` not throttling; inspect function logs.
| Export failed packaging | status=failed with reason | Retry; inspect blob storage & Cosmos; verify identity fetch succeeded.
| Delete blocked | status=failed reason contains hold | Clear legal hold (if approved) or document hold justification.
| SAS leak concern | External report | Rotate storage account keys & purge signedUrl; plan on-demand SAS change (Hardening Step).

## 11. Security Considerations
- All admin actions gated by JWT + `privacy_admin` role.
- Legal holds prevent unauthorized data destruction.
- SAS TTL kept short (12h). SAS links are generated on-demand and never persisted.
- Redaction ensures sensitive fields sanitized in exports.

## 12. Backlog / Hardening TODO
- Add CI assertions for Cosmos private networking if applicable.
- Extend tests for reviewer combination edge cases (one pass + one fail = remain awaiting_review).

## 13. References
- OpenAPI spec: `api/openapi/openapi.yaml`
- Worker code: `functions/src/privacy/worker/*`
- Admin handlers: `functions/src/privacy/admin/*`
- Storage helper: `functions/src/privacy/common/storage.ts`

---
End of runbook.
