# DSR Infrastructure Setup Guide

## Overview

This guide walks you through provisioning the required Azure infrastructure for Data Subject Request (DSR) features.

## Prerequisites

- Azure CLI installed and logged in
- Contributor access to the Azure resource group
- Function App with system-assigned managed identity enabled

## Quick Setup (Automated)

Run these commands in order to provision and configure DSR infrastructure:

```bash
# 1. Provision DSR storage account (creates storage account, container, queue, lifecycle policy)
bash infra/scripts/provision-dsr-storage.sh asora-psql-flex eastus

# 2. Get Function App managed identity principal ID
PRINCIPAL_ID=$(az functionapp identity show \
  -g asora-psql-flex \
  -n asora-function-dev \
  --query principalId -o tsv)

# 3. Get DSR storage account name
DSR_SA=$(az storage account list \
  -g asora-psql-flex \
  --query "[?tags.purpose=='dsr-storage'].name | [0]" -o tsv)

# 4. Grant Function App access to DSR storage
bash infra/scripts/grant-dsr-storage-access.sh "$DSR_SA" asora-psql-flex "$PRINCIPAL_ID"

# 5. Verify access and configuration
bash infra/scripts/verify-dsr-storage.sh "$DSR_SA" asora-psql-flex "$PRINCIPAL_ID"

# 6. Trigger deployment workflow to configure environment variables
# This will automatically detect DSR storage and configure Function App settings
git push origin main
```

## What Gets Created

### Storage Account
- **Name**: `stasoradsr<timestamp>` (or custom name if provided)
- **Type**: StorageV2, Standard_LRS
- **Tags**: `purpose=dsr-storage`, `environment=dev`
- **Features**:
  - Blob versioning enabled (audit trail)
  - HTTPS only, TLS 1.2+
  - Public blob access disabled
  - 90-day lifecycle policy for automatic cleanup

### Containers & Queues
- **Blob Container**: `dsr-exports` (stores export ZIP files)
- **Storage Queue**: `dsr-requests` (async job processing)

### RBAC Role Assignments (Function App Managed Identity)
- `Storage Blob Data Contributor` - Read/write/delete blobs, generate SAS tokens
- `Storage Queue Data Contributor` - Read/write/delete queue messages
- `Storage Account Contributor` - Generate user delegation keys

### Function App Environment Variables (configured via CI/CD)
```bash
DSR_EXPORT_STORAGE_ACCOUNT=<storage-account-name>
DSR_EXPORT_CONTAINER=dsr-exports
DSR_QUEUE_NAME=dsr-requests
DSR_QUEUE_CONNECTION=AzureWebJobsStorage
DSR_MAX_CONCURRENCY=5
DSR_EXPORT_SIGNED_URL_TTL_HOURS=12
DSR_PURGE_WINDOW_DAYS=30
```

## Manual Setup (Alternative)

If you prefer manual setup or need to customize the configuration:

### 1. Create Storage Account

```bash
az storage account create \
  --name stasoradsr \
  --resource-group asora-psql-flex \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --https-only true \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --tags purpose=dsr-storage environment=dev
```

### 2. Create Container and Queue

```bash
# Create blob container
az storage container create \
  --name dsr-exports \
  --account-name stasoradsr \
  --auth-mode login

# Create storage queue
az storage queue create \
  --name dsr-requests \
  --account-name stasoradsr \
  --auth-mode login
```

### 3. Enable Blob Versioning

```bash
az storage account blob-service-properties update \
  --account-name stasoradsr \
  --resource-group asora-psql-flex \
  --enable-versioning true
```

### 4. Configure Lifecycle Policy

Create `lifecycle-policy.json`:
```json
{
  "rules": [
    {
      "enabled": true,
      "name": "delete-old-exports",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "delete": {
              "daysAfterModificationGreaterThan": 90
            }
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["dsr-exports/"]
        }
      }
    }
  ]
}
```

Apply policy:
```bash
az storage account management-policy create \
  --account-name stasoradsr \
  --resource-group asora-psql-flex \
  --policy @lifecycle-policy.json
```

### 5. Assign RBAC Roles

```bash
STORAGE_ID=$(az storage account show \
  -n stasoradsr \
  -g asora-psql-flex \
  --query id -o tsv)

PRINCIPAL_ID=$(az functionapp identity show \
  -g asora-psql-flex \
  -n asora-function-dev \
  --query principalId -o tsv)

# Assign required roles
az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Storage Blob Data Contributor" \
  --scope "$STORAGE_ID"

az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Storage Queue Data Contributor" \
  --scope "$STORAGE_ID"

az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Storage Account Contributor" \
  --scope "$STORAGE_ID"
```

### 6. Configure Function App Settings

```bash
az functionapp config appsettings set \
  -g asora-psql-flex \
  -n asora-function-dev \
  --settings \
    DSR_EXPORT_STORAGE_ACCOUNT=stasoradsr \
    DSR_EXPORT_CONTAINER=dsr-exports \
    DSR_QUEUE_NAME=dsr-requests \
    DSR_QUEUE_CONNECTION=AzureWebJobsStorage \
    DSR_MAX_CONCURRENCY=5 \
    DSR_EXPORT_SIGNED_URL_TTL_HOURS=12 \
    DSR_PURGE_WINDOW_DAYS=30
```

## Verification

After setup, verify the configuration:

```bash
# Run verification script
bash infra/scripts/verify-dsr-storage.sh stasoradsr asora-psql-flex "$PRINCIPAL_ID"

# Check Function App settings
az functionapp config appsettings list \
  -g asora-psql-flex \
  -n asora-function-dev \
  --query "[?name=='DSR_EXPORT_STORAGE_ACCOUNT']"
```

## Testing DSR Flow

Once infrastructure is provisioned, test the end-to-end DSR workflow:

### 1. Submit Export Request (User Endpoint)
```bash
curl -X POST https://asora-function-dev.azurewebsites.net/api/privacy/export \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json"
```

### 2. Check Request Status (User Endpoint)
```bash
curl https://asora-function-dev.azurewebsites.net/api/privacy/status/<request-id> \
  -H "Authorization: Bearer <user-token>"
```

### 3. Admin Review A (Admin Endpoint)
```bash
curl -X POST https://asora-function-dev.azurewebsites.net/api/privacy/admin/reviewA/<request-id> \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "notes": "Verified identity and scope"
  }'
```

### 4. Admin Review B (Admin Endpoint)
```bash
curl -X POST https://asora-function-dev.azurewebsites.net/api/privacy/admin/reviewB/<request-id> \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "notes": "Confirmed compliance"
  }'
```

### 5. Release Export (Admin Endpoint)
```bash
curl -X POST https://asora-function-dev.azurewebsites.net/api/privacy/admin/release/<request-id> \
  -H "Authorization: Bearer <admin-token>"
```

### 6. Download Export (User Endpoint)
```bash
curl https://asora-function-dev.azurewebsites.net/api/privacy/admin/download/<request-id> \
  -H "Authorization: Bearer <user-token>"
```

## Monitoring

### Application Insights Queries

Query telemetry spans for DSR operations:

```kusto
// Export workflow spans
traces
| where message startswith "dsr.export"
| project timestamp, message, customDimensions
| order by timestamp desc

// Queue processing spans
traces
| where message startswith "dsr.queue"
| project timestamp, message, customDimensions
| order by timestamp desc

// Delete workflow spans
traces
| where message startswith "dsr.delete"
| project timestamp, message, customDimensions
| order by timestamp desc
```

### Storage Monitoring

```bash
# Check blob count in dsr-exports container
az storage blob list \
  --container-name dsr-exports \
  --account-name stasoradsr \
  --auth-mode login \
  --query "length(@)"

# Check queue message count
az storage queue stats \
  --name dsr-requests \
  --account-name stasoradsr \
  --auth-mode login
```

## Troubleshooting

### Error: "DSR_EXPORT_STORAGE_ACCOUNT must be configured"
- Storage account not provisioned or environment variable not set
- Run provisioning script or manually configure Function App settings

### Error: "403 Forbidden" when accessing storage
- RBAC roles not assigned to Function App managed identity
- Run `grant-dsr-storage-access.sh` or manually assign roles

### Error: "Queue message not processed"
- Check Function App logs for worker errors
- Verify queue connection string is correct
- Ensure worker functions are registered (check `functions/src/privacy/worker/index.ts`)

### Export stuck in "processing" status
- Check Application Insights for `dsr.export.error` spans
- Verify Cosmos DB connectivity and data existence
- Check storage account write permissions

## Security Considerations

- **SAS URLs**: Generated on-demand with 12-hour TTL, never persisted
- **Private Endpoints**: Recommended for production (configure via `verify-cosmos-private-endpoint.sh`)
- **Network ACLs**: Restrict storage account to Azure service network
- **Audit Trail**: Blob versioning enabled for compliance tracking
- **Dual-Review**: Requires approval from both reviewerA and reviewerB before release

## Cost Optimization

- Lifecycle policy automatically deletes exports after 90 days
- Standard_LRS storage tier for cost-effectiveness
- Queue-based async processing reduces Function App execution time
- Blob versioning adds ~2x storage cost (acceptable for compliance requirements)

## Production Readiness Checklist

- [ ] DSR storage account provisioned with proper tags
- [ ] RBAC roles assigned to Function App managed identity
- [ ] Environment variables configured in Function App
- [ ] Private endpoint configured for storage account (production)
- [ ] Network ACLs configured to restrict access
- [ ] Application Insights alerts configured for DSR errors
- [ ] Dual-review workflow tested with real admin tokens
- [ ] Export download tested with time-limited SAS URLs
- [ ] Legal hold workflow tested
- [ ] Purge job scheduled and tested (daily at 2 AM UTC)

## Additional Resources

- **Runbook**: `docs/DSR_RUNBOOK.md` - Operational procedures
- **Privacy Settings**: `docs/PRIVACY_SETTINGS.md` - Configuration reference
- **OpenAPI Spec**: `api/openapi/openapi.yaml` - API endpoint documentation
- **Test Coverage**: `functions/tests/privacyAdmin*.test.ts` - Unit/integration tests
