# DSR App Settings & RBAC Checklist

This checklist helps verify the environment configuration for DSR processing across environments.

## Required App Settings (Functions App)
- DSR_EXPORT_STORAGE_ACCOUNT
- DSR_EXPORT_CONTAINER (default: dsr-exports)
- DSR_QUEUE_NAME (default: dsr-requests)
- DSR_QUEUE_CONNECTION (recommended: `DsrQueueStorage`)
- `DsrQueueStorage__queueServiceUri` pointing at the same storage account used for `DSR_EXPORT_STORAGE_ACCOUNT`
- DSR_MAX_CONCURRENCY (exports)
- DSR_EXPORT_SIGNED_URL_TTL_HOURS (e.g., 12)
- DSR_EXPORT_RETENTION_DAYS (default: 30)
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

## Storage Account Configuration
- TLS 1.2 minimum
- Lifecycle rule: delete export blobs after 30 days
- Public network access disabled; restricted via private endpoint or trusted services only

## Validation Steps
1. Run `tools/openapi/assert-routes-covered.ts` after bundling the OpenAPI to ensure admin routes are in the spec.
2. Post-deploy smoke: enqueue an export, observe queue message, confirm request transitions to `awaiting_review`.
3. Legal hold test: place hold on user, enqueue delete; confirm job fails with hold reason.

## Troubleshooting
- SAS URL generation fails: verify MI has permissions and clock skew is reasonable; re-issue delegation key.
- Queue messages stay visible with `dequeueCount=0`: verify `Storage Queue Data Message Processor`, confirm `DSR_QUEUE_CONNECTION` and `DsrQueueStorage__queueServiceUri`, then run a dev-only exact-setting connection-string isolation test.
- If `privacyDsrDiagnosticPing` is registered in Azure but `dsr-diagnostic-ping` still keeps messages visible with `dequeueCount=0`, treat the issue as host/listener or Flex runtime failure rather than DSR job-code failure.
- Queue dispatch throttled: increase `DSR_MAX_CONCURRENCY`; scale out plan if needed.
- Queue request stays `queued`: confirm the producer and queue trigger point at the same storage account. `DSR_EXPORT_STORAGE_ACCOUNT` and `DsrQueueStorage__queueServiceUri` must reference the same DSR account.
- Missing app settings: check ARM template or pipeline vars; prefer Key Vault references for secrets.
