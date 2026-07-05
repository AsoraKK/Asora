# P0 Alpha Blocker - DSR Queue Trigger Execution

Date: 2026-06-29

## Current Root-Cause Assessment

Classification: host/runtime execution issue or undeployed queue-diagnostic patch pending external restart/redeploy proof.

What is proven:

- The HTTP DSR admin enqueue routes authenticate and authorize successfully.
- Export and delete enqueue calls return HTTP 200.
- DSR request records are created with `status=queued` and `attempt=0`.
- Target environment for the current alpha drill is Azure Functions dev:
  - Function App: `asora-function-dev`
  - Resource group: `asora-psql-flex`
  - Public base URL: `https://asora-function-dev.azurewebsites.net`
- The `privacyDsrProcessor` function is registered as an enabled queue trigger on the live dev app.
- Live trigger binding:
  - Trigger type: `queueTrigger`
  - Queue name: `dsr-requests`
  - Storage binding setting: `DsrQueueStorage`
- Live app settings currently align by account/name:
  - `DSR_EXPORT_STORAGE_ACCOUNT` account: `stasoradsrdev`
  - `DsrQueueStorage__queueServiceUri` account: `stasoradsrdev`
  - `DSR_QUEUE_CONNECTION`: `DsrQueueStorage`
  - `DSR_QUEUE_NAME`: `dsr-requests`
- The Function App managed identity has queue/blob/storage roles on the DSR storage account.
- Flex runtime config is `node@22`; `FUNCTIONS_WORKER_RUNTIME` is intentionally absent for Flex.
- Live app metadata does not expose a deployed commit/build marker. The DSR diagnostic patch is therefore treated as repo-local/unproven until a controlled redeploy or other deployment evidence proves the patched code is live.

What changed in repo diagnostics:

- The enqueue path now resolves the queue service URI from `DSR_QUEUE_CONNECTION` when `DsrQueueStorage__queueServiceUri` is present, instead of implicitly assuming `DSR_EXPORT_STORAGE_ACCOUNT`.
- Enqueue logs now include queue account/name diagnostics and a hashed user id.
- Queue trigger logs now include sanitized receive, request-resolution, dispatch, completion, and failure markers.
- Queue payload validation now rejects missing or unsupported payloads before request lookup.
- `scripts/dsr-drills/live-dsr-queue-drill.mjs` records sanitized live drill evidence and exits non-zero if export/delete remain queued with `attempt=0`.

## Smallest Temporary Diagnostic Change

Preferred first step: deploy the current queue-diagnostic patch and rerun the DSR drill without changing global telemetry.

If the request still remains queued with `attempt=0`, temporarily enable DSR-specific host diagnostics for alpha evidence. Avoid broad request-body logging. The safest temporary target is host/runtime trace visibility for queue listener activity plus the sanitized DSR logs added in this patch.

Minimum temporary `host.json` direction if App Insights remains blind:

- Remove `Trace` and `Exception` from `logging.applicationInsights.samplingSettings.excludedTypes` for the alpha diagnostic window.
- Keep request bodies and dependency payloads out of logs.
- Revert the temporary telemetry broadening after the drill evidence is captured.

## Controlled Operator Steps

Do not perform these from Codex without explicit approval.

1. Freeze broad changes. Do not include product tiers, rewards, editorial, feed optimization, generated API client churn, or unrelated UX work.
2. If the current deployed package is believed to already contain the queue processor code, perform a controlled restart first:

```powershell
az functionapp restart -g asora-psql-flex -n asora-function-dev
```

3. If the diagnostic patch is not deployed, or if restart does not activate queue processing, deploy/redeploy the DSR diagnostic patch in a controlled window after review approval.
4. Run only the minimal DSR drill first:

```powershell
$env:DSR_DRILL_BASE_URL = "https://asora-function-dev.azurewebsites.net"
$env:DSR_DRILL_BEARER_TOKEN = "[REQUIRED_PRIVACY_ADMIN_JWT]"
$env:DSR_DRILL_QUEUE_ACCOUNT = "stasoradsrdev"
$env:DSR_DRILL_QUEUE_NAME = "dsr-requests"
$env:DSR_DRILL_REPORT_PATH = "docs/evidence/alpha-readiness/2026-06-29-dsr-live-drill-report.json"
node scripts/dsr-drills/live-dsr-queue-drill.mjs
```

5. Record sanitized evidence from the drill:
   - Export request id
   - Delete request id
   - Initial status
   - Polling timestamps
   - Attempt count changes
   - Terminal status or stuck reason
   - Sanitized correlation ids
   - Whether worker telemetry was observed
   - Whether queue messages were consumed
6. Pass condition: both export and delete move beyond `queued`, and attempt changes from `0`.
7. If either remains `queued` with `attempt=0`, enable only the temporary DSR diagnostics above and rerun the same drill.
8. Revert temporary diagnostics after evidence capture.

## Failure Classification After Drill

- `queue binding mismatch`: live trigger queue name or connection setting differs from enqueue configuration.
- `storage connection/config mismatch`: `DSR_EXPORT_STORAGE_ACCOUNT` and `DsrQueueStorage__queueServiceUri` resolve to different accounts, or required settings are absent.
- `Function host/runtime not loading queue trigger`: queue message remains visible, no worker telemetry appears, and request attempt remains `0`.
- `worker invocation failure`: worker telemetry starts but fails before resolving the request id/type/user hash.
- `worker status-update/data-layer failure`: worker telemetry resolves the request but request status/attempt does not update.
- `unknown`: evidence is insufficient; capture the missing proof explicitly.

## Operator Action Evidence - 2026-06-29

- Controlled restart was performed from Codex at `2026-06-29T13:58:58+02:00`:

```powershell
az functionapp restart -g asora-psql-flex -n asora-function-dev -o none
```

- Restart command completed successfully.
- DSR live drill was not run from Codex after restart because `DSR_DRILL_BEARER_TOKEN` was not present in the shell environment.
- No bearer token, JWT, API key, password, connection string, Firebase config, or private material was printed or written.
- Current classification remains: restart performed, runtime DSR proof still blocked by missing drill credential in the execution environment.
- Next required action: set `DSR_DRILL_BEARER_TOKEN` as an environment variable in the local shell, rerun `node scripts/dsr-drills/live-dsr-queue-drill.mjs`, and record the sanitized drill report.

## Alpha Decision

Alpha remains blocked until DSR export/delete moves beyond `queued` in staging/dev alpha evidence.
