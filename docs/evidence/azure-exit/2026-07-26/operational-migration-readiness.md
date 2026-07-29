# Operational Migration Readiness

## Result

**NOT READY — the repository contains Azure-origin proxy Workers, not a replacement production backend.**

The current Cloudflare surfaces are:

- `cloudflare/worker.ts`
- `cloudflare/api-gateway/worker.ts`
- `cloudflare/admin-api-gateway/worker.ts`
- `cloudflare/legacy-api-gateway/worker.ts`
- `workers/feed-cache/src/index.js`

Their current configuration still uses `asora-function-dev.azurewebsites.net` as the origin. No Cloudflare API runtime, queue consumer, scheduled-job replacement, D1/managed-document target, R2 data target, Hyperdrive target, or replacement secret inventory is proven.

## Programme matrix

| Capability | Current state | Required acceptance | Status |
|---|---|---|---|
| HTTP API | Azure Functions, 131 deployed functions | Replacement runtime handles authenticated HTTP routes and rate limits | Blocked |
| DSR worker | Azure queue trigger `privacyDsrProcessor`/`privacyDsrPurge` | Cloudflare Queue/Workflow consumer with retries, idempotency, poison handling | Blocked |
| Timers | Azure Functions timers | Cloudflare Cron/Workflow equivalents with proof | Blocked |
| PostgreSQL | Azure Flexible Server | Approved target, migration/restore proof, identity mapping validation | Blocked |
| Cosmos DB | Azure SQL API, 32 containers | Approved document target, complete export/import or validated migration proof | Blocked |
| Media | Azure Blob Storage | Approved R2/object target and hash/count reconciliation | Blocked |
| Secrets | Azure Key Vault references | Target secret store, consumer validation, rotation/revocation plan | Blocked |
| Authentication | Azure-backed Function routes and provider settings | Provider subject to canonical UUID mapping, JWT/session validation | Blocked |
| CI/CD | Azure OIDC and Function deployment workflows | Replacement deploy/rollback path proven | Blocked |
| DNS/origin | Cloudflare routes still point to Azure | New origin and route validation | Blocked |
| Monitoring | App Insights/Log Analytics | Target logs, metrics, alerts, retention, and PII redaction | Blocked |

## Why no replacement was deployed

Provider credentials, target data-store decisions, approved encrypted export destinations, and an approved cutover design are absent. Deploying an improvised replacement would risk data loss and would not satisfy the stated preservation gate.

## Acceptance order

1. Preserve and restore-test source data.
2. Choose and approve target PostgreSQL/document/queue/object services.
3. Build and test replacement runtime against sanitized or restored data.
4. Migrate secrets and canonical identity mappings.
5. Prove background jobs, DSR, retries, idempotency, and monitoring.
6. Validate DNS, OAuth, webhooks, and rollback.
7. Freeze Azure writes and perform an incremental final export.
8. Obtain human decommission approval.

Application downtime is accepted, but it does not remove the requirement to preserve data or prove that no Azure-dependent job or privacy obligation remains.
