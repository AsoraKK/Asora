# DSR Live Drill Evidence - 2026-06-28

Environment: Azure Functions dev (`asora-function-dev`)

Secret handling: JWT and Cloudflare/Key Vault values were resolved only in process memory and were not printed.

## Result

- Status: blocked at queue-trigger consumption.
- Route/auth/schema: passed.
- Export enqueue: HTTP 200, request `019f1004-4886-7669-8dfc-e5ba8365533e`.
- Delete enqueue: HTTP 200, request `019f1005-d968-7669-8dfc-eba54f7613e8`.
- Poll result: both requests remained `queued` with `attempt=0` for 18 polls.
- Function registration: `privacyDsrProcessor` is enabled with a `queueTrigger` on `dsr-requests`.
- Purge registration: `privacyDsrPurge` is enabled with a timer trigger.
- Poison queue check: `dsr-requests-poison` does not exist.
- Queue message peek: blocked by missing `Storage Queue Data Reader` or equivalent RBAC for the signed-in Azure principal.
- Function managed identity: system-assigned identity has `Storage Queue Data Reader`, `Storage Queue Data Message Processor`, `Storage Queue Data Contributor`, `Storage Blob Data Contributor`, and `Storage Account Contributor` on the DSR storage account scope.
- Queue binding parity: live settings show `DSR_EXPORT_STORAGE_ACCOUNT` and `DsrQueueStorage__queueServiceUri` both resolve to storage account `stasoradsrdev`, with `DSR_QUEUE_NAME=dsr-requests`.
- Flex runtime config: `functionAppConfig.runtime` is `node@22`; `FUNCTIONS_WORKER_RUNTIME` is intentionally absent for Flex per deployment workflow checks.
- Telemetry: both App Insights resources returned no recent DSR request/trace/exception rows. `functions/host.json` excludes `Request;Dependency;Trace;Exception` from Application Insights sampling, so live DSR diagnostics are currently weak.

## Classification

This is an alpha blocker for GDPR/POPIA DSR proof. The remaining issue is not HTTP route protection, request validation, enqueue authorization, obvious managed-identity queue RBAC, or Flex runtime naming. It is queue-trigger execution, host/runtime diagnostics, or deployment/runtime state.

Recommended next operator action: run a controlled Function App restart or redeploy, then rerun this drill; if requests still remain queued, temporarily enable DSR-specific traces/requests or use host-level diagnostics to inspect the storage queue listener.

Repo-local follow-up prepared: `scripts/dsr-drills/live-dsr-queue-drill.mjs` records sanitized drill evidence and fails when export/delete remain `queued` with `attempt=0`.
