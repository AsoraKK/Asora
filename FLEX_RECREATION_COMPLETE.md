# Flex Consumption Recreation — Oct 8, 2025

## Summary

After exhaustive troubleshooting of `asora-function-dev` (Flex Consumption), confirmed the app is in an **irrecoverable state** due to platform issues. All configuration was correct (verified via ARM API), but the host could not bootstrap.

## Verified Working Configuration

- ✅ Deployment storage: Container URI `https://asoraflexdev1404.blob.core.windows.net/deployments` (not blob)
- ✅ Authentication: SystemAssignedIdentity with Storage Blob Data Contributor role
- ✅ Runtime: Node 20 via ARM API `functionAppConfig`
- ✅ Client certs: `Optional` (not Required)
- ✅ RBAC role assignment ID: `29ecd693-b5d9-403f-8c1a-3dfb542ba735` (granted Oct 7 19:16, >21 hours propagation)
- ✅ Minimal probe package tested (662KB, 3 files) — still 502 Bad Gateway
- ✅ No VNet, no storage firewall, no network restrictions

## Root Cause

ARM API returns `sku: null` for what should be a FlexConsumption app. The worker infrastructure appears orphaned or corrupted, unable to mount deployment packages despite correct MI RBAC.

## Actions Taken

### Option A: Standard Consumption (Y1) — Partial Success
- ✅ Created `asora-function-consumption` on Y1 SKU
- ✅ Host running (returns 404 instead of 502)
- ❌ Functions not discovered (package structure issue with WEBSITE_RUN_FROM_PACKAGE)

### Option B: Recreate Flex — In Progress
- ✅ Deleted broken `asora-function-dev`
- ✅ Created Flex plan `asora-flex-plan` (FC1 SKU) via ARM API
- ⏳ Recreating function app with clean Flex configuration

## Flex Recreation Commands

```bash
# 1. Create Flex plan via ARM
az rest -m PUT \
  -u "https://management.azure.com/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.Web/serverFarms/asora-flex-plan?api-version=2023-12-01" \
  --body '{"location":"northeurope","sku":{"name":"FC1","tier":"FlexConsumption"},"properties":{"reserved":true}}'

# 2. Create Flex function app
az rest -m PUT \
  -u "https://management.azure.com/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.Web/sites/asora-function-dev?api-version=2023-12-01" \
  --body '{"location":"northeurope","identity":{"type":"SystemAssigned"},"kind":"functionapp,linux,flex","properties":{"serverFarmId":"/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.Web/serverFarms/asora-flex-plan","httpsOnly":true,"clientCertMode":"Optional","functionAppConfig":{"runtime":{"name":"node","version":"20"},"deployment":{"storage":{"type":"blobContainer","value":"https://asoraflexdev1404.blob.core.windows.net/deployments","authentication":{"type":"SystemAssignedIdentity"}}},"scaleAndConcurrency":{"instanceMemoryMB":2048,"maximumInstanceCount":100}}}}'

# 3. Grant MI RBAC
PRINCIPAL_ID=$(az functionapp identity show -g asora-psql-flex -n asora-function-dev --query principalId -o tsv)
SA_ID=$(az storage account show -g asora-psql-flex -n asoraflexdev1404 --query id -o tsv)
az role assignment create --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal --role "Storage Blob Data Contributor" --scope "$SA_ID"

# 4. Configure host storage (optional but recommended)
az webapp config appsettings set -g asora-psql-flex -n asora-function-dev \
  --settings AzureWebJobsStorage__accountName=asoraflexdev1404 AzureWebJobsStorage__credential=managedidentity

# 5. Test
az functionapp restart -g asora-psql-flex -n asora-function-dev
curl -i "https://asora-function-dev.azurewebsites.net/.well-known/azure-functions/host/status"
curl -i "https://asora-function-dev.azurewebsites.net/api/health"
```

## Next Steps

1. Complete Flex app creation (ARM PUT in progress)
2. Grant RBAC roles to new MI
3. Upload probe package and test
4. If successful, upload full 20MB build and validate
5. Update GitHub Actions workflow to deploy to new Flex app

## Fallback

If recreated Flex app also fails:
- Use `asora-function-consumption` (Y1) temporarily
- Fix package structure (functions at root, not in `dist/`)
- Open Azure Support ticket with evidence from `AZURE_FUNCTIONS_IDENTITY_STORAGE_MIGRATION.md`

## Resources Created

- Flex Plan: `asora-flex-plan` (FC1, North Europe)
- Consumption App: `asora-function-consumption` (Y1, North Europe)
- Storage: `asoraflexdev1404`, container `deployments`
- Deployment package: `app.zip` (20MB, last modified Oct 8 17:20 UTC)
