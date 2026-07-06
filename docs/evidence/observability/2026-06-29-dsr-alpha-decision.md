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

- DSR live queue path: PASSED
- External alpha DSR blocker: RESOLVED
- External/public alpha: no longer blocked by DSR when the target environment has the same fixed DSR queue configuration and fresh DSR proof attached
- Internal-only alpha: no longer needs the manual fallback in dev while the `2026-07-05` queue proof remains representative
- Manual fallback: retained as an emergency operational procedure
- Residual DSR risk: `function:privacyDsrProcessor=1` always-ready guard is active; monitor queue processing, failed DSR requests, and poison queue state

## Why DSR No Longer Blocks External Alpha

- Launch readiness already treated DSR operations as a blocker
- Dev admin/operational DSR is now proven healthy, and the DSR-specific external alpha blocker is resolved
- External/public alpha still needs equivalent proof for the actual target environment
- The target environment must show `DSR_QUEUE_CONNECTION=DsrQueueStorage`, matching `DsrQueueStorage__queueServiceUri`, and `host.json` queue `messageEncoding=none`
- The target environment must show a fresh queued export moving to `awaiting_review` without the manual fallback
- Dev DSR monitoring now targets workspace-based App Insights component `appi-asora-function-dev-dsr`; the legacy `asora-function-dev` component was not ingesting telemetry
- The self-service privacy screen still needs its own smoke test if it is exposed

## Internal-Only Exception Conditions

Internal-only alpha can proceed in dev only if all of the following remain true:

- No external users are invited
- The `2026-07-05` queue proof remains attached to the incident record
- The cold-period regression proof remains attached to the alpha evidence packet
- Admin/operational queued DSR requests use the normal queue path, not the manual fallback
- Any user-facing DSR surface is either:
  - separately smoke-tested in the target environment, or
  - clearly marked unavailable for the duration of the exception

## Current Gap

- This incident proved the admin queued DSR fallback, identified the queue binding/encoding root causes, and proved the normal dev queue path after remediation
- Cold-period regression request `019f3335-dfde-7772-824e-e8e6f6a05d85` reached `awaiting_review` in 10 seconds with `attempt=1`, export bytes present, queue count `0`, and no poison queue
- Post-cleanup monitor trace at `2026-07-05T18:10:00Z` showed queue depth `0`, poison queue absent, stuck queued count `0`, and failed request count `0`
- Live DSR alert KQLs for stuck queued, queue depth, failures, poison queue, and missing completion returned `0` rows after cleanup
- This incident did not perform a fresh live smoke of the self-service routes behind the privacy screen
- Because of that, the safest current internal-alpha position is:
  - treat the DSR-specific blocker as resolved
  - keep external/public alpha gated on the remaining non-DSR alpha proof items
  - allow internal-only alpha only if the privacy screen DSR actions are hidden/unavailable, or if a separate self-service smoke is completed

## Exact Next Action

1. Attach request `019f3335-dfde-7772-824e-e8e6f6a05d85` and [2026-07-05-dsr-cold-regression.json](../alpha-readiness/2026-07-05-dsr-cold-regression.json) as the dev admin DSR cold-period proof
2. Keep `function:privacyDsrProcessor=1` always-ready documented as an intentional alpha guard
3. Keep DSR alerts enabled on `appi-asora-function-dev-dsr`
4. Move to the remaining alpha blockers: final go/no-go evidence packet, feed p95/performance evidence, and final secret scan and evidence hygiene
5. Defer product-tier and rewards changes until alpha go/no-go evidence is complete

## Safety

- No secrets, tokens, connection strings, raw user data, Firebase config, local credential files, or deployment zips were added to the repo
