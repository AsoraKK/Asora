# Azure Support Ticket Body: DSR Queue Listener Failure

## 2026-07-05 Update

Status: not filed; root cause found internally.

Do not file this support ticket for the current dev incident unless the failure recurs after the fixed configuration is confirmed live.

Resolved causes:
- Deployment drift bound `privacyDsrProcessor` through `AzureWebJobsStorage`, while DSR enqueue wrote to `stasoradsrdev`.
- Queue trigger decoding expected base64 by default, while `enqueueDsrMessage` sends plain JSON.

Resolved proof:
- `DSR_QUEUE_CONNECTION=DsrQueueStorage`
- `DsrQueueStorage__queueServiceUri=https://stasoradsrdev.queue.core.windows.net`
- `extensions.queues.messageEncoding=none`
- `function:privacyDsrProcessor=1` always-ready retained
- Plain JSON request `019f3291-a57e-7ff1-b352-f3c9f15405fb` moved to `awaiting_review` in 10 seconds with `attempt=1`, `exportBytes=1028`, and queue count `0`.
- Cold-period regression request `019f3335-dfde-7772-824e-e8e6f6a05d85` moved to `awaiting_review` in 10 seconds with `attempt=1`, `exportBytes=1028`, queue count `0`, and no poison queue.
- Dev monitoring repaired: DSR alerts now target workspace-based component `appi-asora-function-dev-dsr`; post-cleanup monitor trace at `2026-07-05T18:10:00Z` showed queue depth `0`, poison absent, stuck queued `0`, failed `0`.
- Live DSR alert KQLs for stuck queued, queue depth, failures, poison queue, and missing completion returned `0`.

Use the historical packet below only if Azure support is needed for a recurrence that cannot be explained by app settings, deployment drift, queue encoding, or job-code failure.

## Summary

Azure Functions Flex Consumption queue triggers on `asora-function-dev` are registered and synced, but they do not dequeue visible Azure Storage Queue messages. This affects both the real DSR worker trigger and a separate minimal diagnostic trigger. Messages remain visible with `dequeueCount=0`, no poison queue is created, and host/listener telemetry is absent from the usual log and App Insights paths.

## Resource

- Subscription: `99df7ef7-776a-4235-84a4-c77899b2bb04`
- Resource group: `asora-psql-flex`
- Function App: `asora-function-dev`
- Resource ID: `/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.Web/sites/asora-function-dev`
- Runtime: Azure Functions v4 on Flex Consumption
- Worker runtime: Node `22`
- Extension bundle: `Microsoft.Azure.Functions.ExtensionBundle` `[4.0.0, 5.0.0)`

## Impact

- DSR export/delete requests remain in `queued`
- External alpha remains blocked
- Internal-only alpha is only conditionally possible with a manual fallback runbook and explicit risk sign-off

## Current Live Package

- Investigation base commit: `82597b3f8acc688a41be81121035436611d1df8d`
- Current live diagnostic package blob: `functionapp-manualdiag-1782764236.zip`
- Current live diagnostic package hash: `3182c73d14f689d10d0d7878f3cd8e1dd640a1e6c93cf17de0b080abe5bf2ef5`
- Current live diagnostic package last modified: `2026-06-29T20:17:25Z`

## Reproduction

1. Deploy the current package to `asora-function-dev`
2. Sync triggers
3. Restart the Function App
4. Verify Azure lists `privacyDsrProcessor`
5. Enqueue a sanitized message to queue `dsr-requests`
6. Observe the message remains visible with `dequeueCount=0`

For isolated proof of the trigger path independent of DSR job code:

1. Set:
   - `DSR_DIAGNOSTIC_QUEUE_ENABLED=true`
   - `DSR_DIAGNOSTIC_QUEUE_NAME=dsr-diagnostic-ping`
   - `DSR_DIAGNOSTIC_QUEUE_CONNECTION=DsrQueueStorage`
2. Sync triggers
3. Restart the Function App
4. Verify Azure lists `privacyDsrDiagnosticPing`
5. Enqueue sanitized message `{"type":"ping","correlationId":"manualdiag-1782764897330"}`
6. Wait 30 seconds
7. Observe the message remains visible with `dequeueCount=0`

## Expected Result

- The queue listener should dequeue the message
- The DSR request should move beyond `queued`
- The diagnostic ping trigger should consume its message

## Actual Result

- The real DSR trigger does not dequeue messages
- The separately registered minimal diagnostic queue trigger does not dequeue messages
- Messages remain visible with `dequeueCount=0`
- No poison queue is created
- No host/listener telemetry appears via `az webapp log tail`, `az webapp log download`, or recent App Insights traces/requests/exceptions

## What Was Ruled Out

- Missing `Storage Queue Data Message Processor`
- Simple RBAC omission on the DSR storage account
- Simple identity-based `DsrQueueStorage` setting-shape issue
- A temporary exact `DsrQueueStorage` connection string override was tested in dev and did not fix dequeue
- The original DSR handler logic and DSR request payload

## Most Likely Remaining Cause

1. Function host/listener startup failure after trigger registration
2. Queue binding or extension load failure on the running Flex host
3. Flex platform/runtime issue specific to this app or trigger path

## Supporting Evidence

- Investigation packet: [2026-06-29-dsr-queue-listener-investigation.md](./2026-06-29-dsr-queue-listener-investigation.md)
- Internal-only fallback runbook: [dsr-internal-alpha-fallback.md](../../runbooks/dsr-internal-alpha-fallback.md)
- DSR settings checklist: [dsr-settings.md](../../runbooks/dsr-settings.md)

## Safety

- No secrets, tokens, connection strings, bearer values, raw user data, Firebase config, local credential files, or deployment zips were added to the repo
