# DSR Alpha Decision

Date: 2026-06-29
Environment: dev
Decision owner inputs: Privacy Engineering + Platform evidence packet

## Scope Split

There are two different DSR paths in the current codebase:

1. Admin/operational DSR queue flow
   - Admin endpoints create `privacy_requests` records and enqueue `dsr-requests`
   - Azure queue worker `privacyDsrProcessor` is required to advance queued admin export/delete jobs
   - This is the path currently broken on `asora-function-dev`

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

- External alpha: blocked
- Public alpha: blocked
- Internal-only alpha: conditionally possible

## Why External Alpha Stays Blocked

- Launch readiness already treated DSR operations as a blocker
- The admin/operational DSR queue worker is proven unhealthy
- A separately registered minimal diagnostic queue trigger also failed to dequeue
- That means the queue incident is no longer explainable as a normal app bug in the DSR handler
- Even though the self-service privacy screen uses direct routes, current evidence does not prove full operational DSR readiness for external users

## Internal-Only Exception Conditions

Internal-only alpha can be considered only if all of the following are true:

- No external users are invited
- A risk owner signs off on the temporary exception
- The queue-listener evidence packet remains attached to the incident record
- Admin/operational queued DSR requests are handled only through the manual fallback runbook
- Any user-facing DSR surface is either:
  - separately smoke-tested in the target environment, or
  - clearly marked unavailable for the duration of the exception

## Current Gap

- This incident proved the admin queued DSR fallback and the queue listener failure
- This incident did not perform a fresh live smoke of the self-service routes behind the privacy screen
- Because of that, the safest current internal-alpha position is:
  - keep external/public alpha blocked
  - allow internal-only alpha only if the privacy screen DSR actions are hidden/unavailable, or if a separate self-service smoke is completed

## Exact Next Action

1. Route the Azure support ticket body through a support-enabled Azure account or contract
2. Keep external/public alpha blocked
3. For any internal-only alpha exception, either hide self-service DSR actions or separately smoke-test `GET /api/user/export` and `DELETE /api/user/delete`

## Safety

- No secrets, tokens, connection strings, raw user data, Firebase config, local credential files, or deployment zips were added to the repo
