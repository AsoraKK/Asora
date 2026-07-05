# DSR Alpha Decision

Date: 2026-06-29
Environment: dev
Decision owner inputs: Privacy Engineering + Platform evidence packet

## Scope Split

There are two different DSR paths in the current codebase:

1. Admin/operational DSR queue flow
   - Admin endpoints create `privacy_requests` records and enqueue `dsr-requests`
   - Azure queue worker `privacyDsrProcessor` is required to advance queued admin export/delete jobs
   - This path is proven healthy on `asora-function-dev` as of `2026-07-05` after the queue binding and host queue encoding fixes

2. Self-service privacy flow
   - Mobile privacy screen lives in `lib/features/privacy/privacy_settings_screen.dart`
   - It calls direct self-service routes:
     - `GET /api/user/export`
     - `DELETE /api/user/delete`
   - Those routes are implemented in `functions/src/privacy/routes/exportUser.ts` and `functions/src/privacy/routes/deleteUser.ts`
   - They do not create `privacy_requests` records and do not depend on the Azure queue listener incident documented here

## Evidence Basis

- Queue listener incident: [2026-06-29-dsr-queue-listener-investigation.md](./2026-06-29-dsr-queue-listener-investigation.md)
- Manual admin fallback runbook: [dsr-internal-alpha-fallback.md](../../runbooks/dsr-internal-alpha-fallback.md)
- Azure support ticket body: [2026-06-29-azure-support-dsr-queue-ticket.md](./2026-06-29-azure-support-dsr-queue-ticket.md)

## Decision

- External/public alpha: allowed only for environments with the same fixed DSR queue configuration and fresh DSR proof attached
- Internal-only alpha: no longer needs the manual fallback in dev while the `2026-07-05` queue proof remains representative
- Manual fallback: retained as an emergency operational procedure

## Why External Alpha Stays Blocked

- Launch readiness already treated DSR operations as a blocker
- Dev admin/operational DSR is now proven healthy, but external/public alpha must attach equivalent proof for the actual target environment
- The target environment must show `DSR_QUEUE_CONNECTION=DsrQueueStorage`, matching `DsrQueueStorage__queueServiceUri`, and `host.json` queue `messageEncoding=none`
- The target environment must show a fresh queued export moving to `awaiting_review` without the manual fallback
- The self-service privacy screen still needs its own smoke test if it is exposed

## Internal-Only Exception Conditions

Internal-only alpha can proceed in dev only if all of the following remain true:

- No external users are invited
- The `2026-07-05` queue proof remains attached to the incident record
- Admin/operational queued DSR requests use the normal queue path, not the manual fallback
- Any user-facing DSR surface is either:
  - separately smoke-tested in the target environment, or
  - clearly marked unavailable for the duration of the exception

## Current Gap

- This incident proved the admin queued DSR fallback, identified the queue binding/encoding root causes, and proved the normal dev queue path after remediation
- This incident did not perform a fresh live smoke of the self-service routes behind the privacy screen
- Because of that, the safest current internal-alpha position is:
  - keep external/public alpha gated on target-environment DSR proof
  - allow internal-only alpha only if the privacy screen DSR actions are hidden/unavailable, or if a separate self-service smoke is completed

## Exact Next Action

1. Attach request `019f3291-a57e-7ff1-b352-f3c9f15405fb` as the dev admin DSR queue proof
2. Keep external/public alpha gated until the selected target environment has equivalent proof
3. For any internal-only alpha exception, either hide self-service DSR actions or separately smoke-test `GET /api/user/export` and `DELETE /api/user/delete`

## Safety

- No secrets, tokens, connection strings, raw user data, Firebase config, local credential files, or deployment zips were added to the repo
