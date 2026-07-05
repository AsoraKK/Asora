# DSR Queue Listener Investigation

Date: 2026-06-29
Environment: dev
Function App: `asora-function-dev`
Resource Group: `asora-psql-flex`
Storage Account: `stasoradsrdev`

## Scope

Investigate why DSR export and delete requests stay in `queued` even though:
- the HTTP enqueue path returns `200`
- the queue contains visible messages
- trigger sync succeeds
- the deployed package includes the expected DSR queue diagnostic strings

## Confirmed State

- Base commit for the current investigation: `82597b3f8acc688a41be81121035436611d1df8d`
- Current live diagnostic package: `functionapp-manualdiag-1782764236.zip`
- Current live package hash: `3182c73d14f689d10d0d7878f3cd8e1dd640a1e6c93cf17de0b080abe5bf2ef5`
- Current live package freshness was verified at `2026-06-29T20:17:25Z`
- Trigger sync succeeded on `2026-06-29T15:23:49Z`
- Function App restart succeeded on `2026-06-29T15:23:51Z`
- The deployed queue trigger is registered as `privacyDsrProcessor`
- The deployed trigger binding points to queue `dsr-requests` using connection setting `DsrQueueStorage`
- DSR queue messages remain visible with `dequeueCount=0`
- No poison queue has been created

## Live Configuration Checks

### Runtime and Binding

- `functions/host.json` uses extension bundle `Microsoft.Azure.Functions.ExtensionBundle` version `[4.0.0, 5.0.0)`
- Live Function App runtime is `node` version `22`
- `FUNCTIONS_EXTENSION_VERSION` is `~4`
- Live non-secret DSR settings:
  - `DSR_QUEUE_CONNECTION=DsrQueueStorage`
  - `DSR_QUEUE_NAME=dsr-requests`
  - `DSR_EXPORT_STORAGE_ACCOUNT=stasoradsrdev`
  - `DsrQueueStorage__queueServiceUri=https://stasoradsrdev.queue.core.windows.net`

### Function Identity

- Managed identity type: system-assigned
- Principal ID: `87d8456d-2d1a-479b-9ad3-b069451a261f`

### Verified RBAC on `stasoradsrdev`

- `Storage Blob Data Contributor`
- `Storage Queue Data Contributor`
- `Storage Queue Data Reader`
- `Storage Queue Data Message Processor`
- `Storage Account Contributor`

Result: the required queue-consume role was already present before the isolation test.

## Listener Isolation Tests

### 1. Empty diagnostic queue under identity-based binding

Method:
- Temporarily changed `DSR_QUEUE_NAME` to `dsr-diagnostic-ping`
- Restarted the Function App
- Synced triggers
- Confirmed the deployed trigger retargeted to `dsr-diagnostic-ping`
- Enqueued a sanitized test message directly to the queue

Result:
- The message remained visible
- `dequeueCount` stayed `0`
- The queue trigger did not consume the message

### 2. Exact-setting connection-string override

Method:
- Added a dev-only exact `DsrQueueStorage` connection string setting
- Kept `DsrQueueStorage__queueServiceUri` in place
- Restarted the Function App
- Synced triggers
- Enqueued additional sanitized test messages to the empty diagnostic queue

Result:
- Multiple messages accumulated on the queue
- All messages remained visible
- All messages stayed at `dequeueCount=0`
- The trigger still did not consume messages

Cleanup:
- Restored `DSR_QUEUE_NAME=dsr-requests`
- Removed the temporary exact `DsrQueueStorage` setting
- Restarted the Function App
- Synced triggers
- Cleared the diagnostic queue

### 3. Minimal diagnostic queue trigger

Method:
- Deployed a minimal dev-only queue trigger `privacyDsrDiagnosticPing`
- Guarded it behind app settings:
  - `DSR_DIAGNOSTIC_QUEUE_ENABLED=true`
  - `DSR_DIAGNOSTIC_QUEUE_NAME=dsr-diagnostic-ping`
  - `DSR_DIAGNOSTIC_QUEUE_CONNECTION=DsrQueueStorage`
- Verified the live package contains `src/privacy/worker/diagnosticQueuePing.js`
- Synced triggers and confirmed Azure lists:
  - `privacyDsrDiagnosticPing`
  - `privacyDsrProcessor`
  - `privacyDsrPurge`
- Cleared `dsr-diagnostic-ping`
- Enqueued sanitized message `{"type":"ping","correlationId":"manualdiag-1782764897330"}`
- Waited 30 seconds and peeked the queue

Result:
- The diagnostic ping message remained visible
- `dequeueCount` stayed `0`
- The registered minimal trigger did not consume the message

Conclusion:
- This rules out the original DSR queue handler logic and request payload as the cause
- The failure is in queue listener execution after registration: host/listener startup, queue binding load, or Flex runtime/platform behavior

Cleanup:
- Removed `DSR_DIAGNOSTIC_QUEUE_ENABLED`
- Removed `DSR_DIAGNOSTIC_QUEUE_NAME`
- Removed `DSR_DIAGNOSTIC_QUEUE_CONNECTION`
- Synced triggers again
- Verified Azure function list returned to:
  - `privacyDsrProcessor`
  - `privacyDsrPurge`
- Cleared `dsr-diagnostic-ping`

## Telemetry and Logging Findings

- `az webapp log tail` produced no startup or function-host output on this Flex app during the diagnostic restart
- Temporary host log overrides were applied with `AzureFunctionsJobHost__logging__...`, but no startup or listener output surfaced through the normal log-tail path
- `az webapp log download` failed against `https://asora-function-dev.scm.azurewebsites.net/dump` with `404 Not Found`
- Application Insights queries against the candidate components returned no recent `requests`, `traces`, or `exceptions`
- Live app settings confirm `APPLICATIONINSIGHTS_CONNECTION_STRING` is populated, so the telemetry gap is not explained by an unset App Insights connection string
- A direct `GET /api/health` request returned `200`, but no corresponding App Insights request or trace was observed

Result: host/listener diagnostics are still missing from the current telemetry path.

## Classification

Confirmed not to be:
- missing `Storage Queue Data Message Processor`
- a simple RBAC omission on the DSR storage account
- a simple identity-vs-connection-string binding issue for `DsrQueueStorage`
- the original DSR handler code path or DSR request payload shape

Most likely causes now:
1. Function host/listener startup failure that is not surfacing through the current telemetry path after trigger registration
2. Queue binding or extension load failure on the running Flex host after trigger indexing
3. Flex platform/runtime issue specific to this app or trigger path

Current best classification: host/listener startup or Flex platform/runtime issue, with binding load still possible.

## Alpha Decision

- External alpha: still blocked
- Code audit on `2026-06-29` shows the mobile privacy screen uses direct self-service routes `GET /api/user/export` and `DELETE /api/user/delete`; it does not create `privacy_requests` or depend on the broken queue worker
- The queue incident scope is therefore admin/operational DSR processing, not the direct self-service privacy screen path
- Internal-only alpha is only acceptable if:
  - a manual admin runbook exists for queued export/delete requests
  - no external users are invited
  - a risk owner signs off
  - any user-facing DSR surface is either separately smoke-tested or clearly marked unavailable
- The current internal-only fallback runbook is [dsr-internal-alpha-fallback.md](../../runbooks/dsr-internal-alpha-fallback.md)
- The decision memo for this split is [2026-06-29-dsr-alpha-decision.md](./2026-06-29-dsr-alpha-decision.md)

## Manual Fallback Proof

- Live dev Postgres currently contains one active `public.users` row.
- Existing queued DSR requests did not match that live user, so a fresh synthetic export request was created for proof: `manual-validation-1782763771650` at `2026-06-29T20:09:31.650Z`.
- Command executed: `bash functions/scripts/manual-dsr-from-azure.sh --request-id manual-validation-1782763771650`
- Observed transition: `queued` -> `awaiting_review`
- Persisted request state: `attempt=1`, `completedAt=2026-06-29T20:10:02.396Z`, `failureReason=null`, `exportBlobPath=dev/2026/06/manual-validation-1782763771650.zip`, `exportBytes=1028`
- Storage verification: the export ZIP exists in container `dsr-exports` and reports `1028` bytes
- Conclusion: the manual Azure-backed fallback works for export when the DSR request references a real live dev Postgres user

## Failed Request Classification

- Earlier manual-fallback runs against request `019f13fd-2fea-755b-9eb2-6591b32ea019` failed only after schema-drift handling was fixed far enough to resolve the true cause
- Final failure reason for that request path: `Postgres identity <redacted> not found`
- Classification: request data points to a user missing from live dev Postgres, not a failure of the manual fallback mechanism

## Delete Control-Path Validation

- Synthetic delete validation request `manual-delete-validation-1782763521806` reached `succeeded` at `2026-06-29T20:05:55.237Z`
- Final audit metadata reported `errorCount=0`
- Postgres deleted counts were all zero, so this validates non-destructive control flow only
- A live delete against the only existing dev Postgres user was not executed because that would be destructive

## Support Packet

- Resource ID: `/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.Web/sites/asora-function-dev`
- Recommended service/problem classification: `Availability / Messaging function failed to trigger`
- Classification ID: `/providers/Microsoft.Support/services/5ce8de69-abba-65a0-e0e4-a684bcbc7931/problemClassifications/5451bd65-0af8-324a-7485-b06551559b61`
- Suggested case summary: Azure Functions Flex queue triggers are registered and synced, including a minimal diagnostic queue trigger, but neither the live DSR queue nor the diagnostic queue is ever dequeued; all messages stay visible with `dequeueCount=0`
- Reproduction:
  1. Deploy the current package and sync triggers
  2. Enable `DSR_DIAGNOSTIC_QUEUE_ENABLED=true`
  3. Restart `asora-function-dev`
  4. Confirm Azure lists `privacyDsrDiagnosticPing`
  5. Enqueue a sanitized message to `dsr-requests` or `dsr-diagnostic-ping`
  6. Observe that the message remains visible and `dequeueCount` stays `0`
- Expected result: the registered queue listener should dequeue the message and the DSR request should move beyond `queued`
- Actual result: both the real DSR queue and the separately registered minimal diagnostic queue fail to dequeue; no poison queue is created, and no host/listener telemetry appears through the current App Insights or log-download paths
- Attach this file plus the internal fallback runbook as the sanitized evidence set
- Support API status: CLI ticket creation is blocked by `InvalidSupportPlan`, so this packet must be routed through an Azure account or contract with a qualifying support plan

## Support Escalation Attempt

- Azure Support service metadata is available from the current subscription context
- The best-fit Function App classification is `Availability / Messaging function failed to trigger`
- Attempted CLI ticket creation failed with `InvalidSupportPlan`
- Error summary: the current subscription context does not have a qualifying Azure support plan for ticket creation through the Support API

## Exact Next Action

1. Route this evidence packet through an Azure account or contract that has a qualifying support plan
2. Open the Function App ticket using classification `Availability / Messaging function failed to trigger`
3. Attach the package metadata, queue evidence, connection override result, and missing-log evidence from this file
4. Keep external alpha blocked until Microsoft or later diagnostics prove the queue listener is healthy

## Safety Notes

- No secrets, tokens, raw bearer values, or credential files were added to the repo
- The dev-only exact connection-string override was removed after the isolation test
- The temporary diagnostic queue app settings were removed after proof capture
