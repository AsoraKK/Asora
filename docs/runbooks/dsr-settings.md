# DSR App Settings & RBAC Checklist

This checklist helps verify the environment configuration for DSR processing across environments.

## Required App Settings (Functions App)
- DSR_EXPORT_STORAGE_ACCOUNT
- DSR_EXPORT_CONTAINER (default: dsr-exports)
- DSR_QUEUE_NAME (default: dsr-requests)
- DSR_QUEUE_CONNECTION (must be `DsrQueueStorage` for the current DSR storage account binding)
- `DsrQueueStorage__queueServiceUri` pointing at the same storage account used for `DSR_EXPORT_STORAGE_ACCOUNT`
- DSR_MAX_CONCURRENCY (exports)
- DSR_EXPORT_SIGNED_URL_TTL_HOURS (e.g., 12)
- DSR_EXPORT_RETENTION_DAYS (default: 30)
- `DSR_MONITOR_SCHEDULE` (shared-MVP fallback `0 0 */8 * * *`; Azure timer expressions are UTC)
- DSR_BLOB_UPLOAD_BUFFER_SIZE (optional, default 4MiB)
- DSR_BLOB_UPLOAD_CONCURRENCY (optional, default 5)

Ensure Cosmos DB connection is configured via Key Vault ref for `COSMOS_CONNECTION_STRING`.

## Temporary Diagnostic App Settings
- `DSR_DIAGNOSTIC_QUEUE_ENABLED=true` only during a dev diagnostic window
- `DSR_DIAGNOSTIC_QUEUE_NAME=dsr-diagnostic-ping` unless a different empty queue is required
- `DSR_DIAGNOSTIC_QUEUE_CONNECTION=DsrQueueStorage` to keep the diagnostic trigger on the same binding path as the real DSR worker

Remove or disable these settings after the diagnostic window closes.

## Managed Identity RBAC
Assign to the Functions app’s managed identity:
- Storage Blob Data Contributor (scope: the DSR export storage account)
- Storage Queue Data Contributor (scope: the same account)
- Storage Queue Data Reader (scope: the same account)
- Storage Queue Data Message Processor (scope: the same account)
- Storage Account Contributor (scope: the same account, for user delegation key generation)

Verify:
- Can create user delegation key (for SAS)
- Can write/read blob in the export container
- Can send messages to the DSR queue
- Can receive queue-trigger deliveries from the same DSR storage account
- Can peek, retrieve, and delete messages from the DSR queue

## Queue Binding Shape
- `DSR_QUEUE_CONNECTION` should resolve to the binding setting name used by the trigger.
- For the current identity-based queue trigger, the live binding shape is:
  - `DSR_QUEUE_CONNECTION=DsrQueueStorage`
  - `DsrQueueStorage__queueServiceUri=https://<storage-account>.queue.core.windows.net`
- Keep the enqueue SDK path and the queue trigger pointed at the same storage account and queue name.
- `host.json` must include `extensions.queues.messageEncoding=none` because `enqueueDsrMessage` sends plain JSON through the Azure Storage Queue SDK.
- For Flex Consumption P0 reliability, keep `function:privacyDsrProcessor=1` always-ready unless a deliberate scale-from-zero validation proves it is safe to remove.
- For a dev-only isolation test, an exact `DsrQueueStorage` connection string setting can temporarily override the identity-based collection. Remove it immediately after the test.

## Storage Account Configuration
- TLS 1.2 minimum
- Lifecycle rule: delete export blobs after 30 days
- Public network access disabled; restricted via private endpoint or trusted services only

## Validation Steps
1. Run `tools/openapi/assert-routes-covered.ts` after bundling the OpenAPI to ensure admin routes are in the spec.
2. Post-deploy smoke: enqueue an export, observe queue message, confirm request transitions to `awaiting_review`.
3. Legal hold test: place hold on user, enqueue delete; confirm job fails with hold reason.

## Monitoring Coverage
- `privacyDsrQueueMonitor` emits one structured `dsr.queue.monitor` trace on the configured UTC schedule with DSR queue depth, poison queue state, stuck queued request count, and failed request count. The shared-MVP fallback runs at 00:00, 08:00, and 16:00 UTC; a future production environment must configure at least hourly monitoring independently.
- Dev DSR alerts currently target `appi-asora-function-dev-dsr`; the legacy `asora-function-dev` App Insights component did not ingest telemetry during the DSR repair.
- Terraform alert coverage in `infrastructure/alerts` includes:
  - `alert-<app>-dsr-stuck-queued`: `privacy_requests` queued for more than 5 minutes
  - `alert-<app>-dsr-queue-depth`: queue depth greater than `0` across two monitor samples
  - `alert-<app>-dsr-failures`: DSR queue failures or persisted failed requests greater than `0`
  - `alert-<app>-dsr-poison-queue`: poison queue exists or has messages
  - `alert-<app>-dsr-missing-completion`: DSR enqueue lacks `dsr.queue.completed` after 5 minutes
- `function:privacyDsrProcessor=1` always-ready is intentional for alpha and must remain documented until a separate scale-from-zero regression proves it can be removed.
- Follow `docs/runbooks/dsr-scale-from-zero-and-always-ready.md` before changing the always-ready allocation.

## Troubleshooting
- SAS URL generation fails: verify MI has permissions and clock skew is reasonable; re-issue delegation key.
- Queue messages stay visible with `dequeueCount=0`: verify `Storage Queue Data Message Processor`, confirm `DSR_QUEUE_CONNECTION`, `DsrQueueStorage__queueServiceUri`, and always-ready state, then run a dev-only exact-setting connection-string isolation test.
- Queue message disappears but request stays `queued` with `attempt=0`: check `host.json` queue `messageEncoding`; plain SDK messages require `none`.
- If `privacyDsrDiagnosticPing` is registered in Azure but `dsr-diagnostic-ping` still keeps messages visible with `dequeueCount=0`, treat the issue as host/listener or Flex runtime failure rather than DSR job-code failure.
- Queue dispatch throttled: increase `DSR_MAX_CONCURRENCY`; scale out plan if needed.
- Queue request stays `queued`: confirm the producer and queue trigger point at the same storage account. `DSR_EXPORT_STORAGE_ACCOUNT` and `DsrQueueStorage__queueServiceUri` must reference the same DSR account.
- Missing app settings: check ARM template or pipeline vars; prefer Key Vault references for secrets.
