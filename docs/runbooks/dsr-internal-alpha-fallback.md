# DSR Internal Alpha Fallback

Use this fallback only while the Azure Queue listener incident in
[2026-06-29-dsr-queue-listener-investigation.md](../evidence/observability/2026-06-29-dsr-queue-listener-investigation.md)
is unresolved.

## Decision

- External alpha: blocked
- Public alpha: blocked
- Internal-only alpha: conditionally allowed

This fallback is acceptable only if all of the following are true:
- No external users are invited
- A risk owner signs off on the temporary exception
- An operator can process export and delete requests within the team’s policy window
- The queue-listener evidence remains attached to the incident record
- Any user-facing DSR surface is either:
  - separately smoke-tested in the target environment, or
  - clearly marked unavailable for the duration of the exception

If any condition fails, alpha stays blocked.

## Scope

This runbook is for internal operational handling of queued DSR requests when:
- the HTTP admin endpoints can create requests
- the Azure Queue worker is not consuming messages
- the request must still be processed without waiting for the queue listener fix

It is not a substitute for the production queue worker and must not be used for public launch.

## Scope Boundary

- This fallback applies only to the queued admin/operational DSR flow backed by `privacy_requests` and queue `dsr-requests`.
- Current code audit on `2026-06-29` shows the mobile privacy screen uses direct self-service routes:
  - `GET /api/user/export`
  - `DELETE /api/user/delete`
- Those self-service routes do not use this queue worker and are not covered by this manual fallback.
- If internal alpha exposes the privacy screen, smoke-test those self-service routes separately or mark them unavailable.

## Prerequisites

- Secure operator workstation
- Access to the same runtime secrets and environment variables used by the Functions app
- `npm install` completed in `functions/`
- Reviewed request id from `privacy_requests`
- Reviewed the current request status through the admin API or Cosmos

Do not paste secrets into the repo, shell history exports checked into git, or shared notes.

## Manual Processor

The preferred fallback command resolves the required Azure settings and then invokes the existing export or delete job code directly:

```bash
bash functions/scripts/manual-dsr-from-azure.sh --request-id <dsr-request-id> --dry-run
bash functions/scripts/manual-dsr-from-azure.sh --request-id <dsr-request-id>
```

Behavior:
- looks up the DSR request in `privacy_requests`
- refuses to run unless the request is in `queued`, `failed`, or `canceled`
- resolves Key Vault-backed app settings at execution time
- uses a temporary storage connection string in-process for export packaging and SAS generation
- runs the existing `runExportJob` or `runDeleteJob` logic
- prints sanitized status updates to stdout
- exits non-zero if the final status is not:
  - `awaiting_review` for exports
  - `succeeded` for deletes

The lower-level command remains available when the environment is already loaded:

```bash
cd functions
npm run dsr:manual -- --request-id <dsr-request-id>
```

Use `--force` only after reviewing the request state and documenting why the normal status gate was bypassed.

## Validated Evidence

- Sanitized proof on `2026-06-29`: live dev Postgres contained one active `public.users` row.
- No queued `privacy_requests` record matched that live user, so a fresh synthetic export request was created: `manual-validation-1782763771650` at `2026-06-29T20:09:31.650Z`.
- Running `bash functions/scripts/manual-dsr-from-azure.sh --request-id manual-validation-1782763771650` moved the request from `queued` to `awaiting_review`.
- Persisted export result: `attempt=1`, `completedAt=2026-06-29T20:10:02.396Z`, `exportBlobPath=dev/2026/06/manual-validation-1782763771650.zip`, `exportBytes=1028`.
- Blob verification succeeded: the export ZIP exists in container `dsr-exports` and reports `1028` bytes.
- This proves the Azure-backed manual fallback can execute the real export job code end-to-end for a valid live dev user while the queue listener remains broken.
- Earlier request `019f13fd-2fea-755b-9eb2-6591b32ea019` failed under the same fallback because its referenced user was absent from live dev Postgres after the schema-drift fixes were applied. That is a request-data issue, not a fallback execution issue.
- Synthetic delete control-path validation request `manual-delete-validation-1782763521806` reached `succeeded` at `2026-06-29T20:05:55.237Z` with `errorCount=0`.
- Delete fallback is still not live-validated against the only existing dev Postgres user because that would be destructive.

## Operator Steps

1. Confirm the request id and request type in `privacy_requests`.
2. Run the dry-run command and confirm the request is eligible.
3. Run the live command once.
4. Re-read the request record.
5. For export:
   - confirm status is `awaiting_review`
   - continue reviewer A/B checks from [dsr.md](./dsr.md)
6. For delete:
   - confirm status is `succeeded`
   - review audit entries for cascade details and any partial errors
7. Record the manual execution in the incident timeline.

## Validation

- Export success: request status changes to `awaiting_review` and `exportBlobPath` is set
- Delete success: request status changes to `succeeded`
- Failure: request status changes to `failed` with `failureReason`

If the command fails before status changes, do not retry blindly. Inspect the request, logs, and storage state first.

## Exit Criteria

Retire this fallback when the Azure Queue trigger is proven healthy again:
- queue messages leave the queue
- `dequeueCount` changes as expected
- DSR requests move beyond `queued` without the manual script
- the incident evidence is updated to show the listener fix
