# Azure Functions Identity-Based ## Current Status (Updated: Oct 7, 2025 19:40 UTC)

### ✅ Flex Consumption Runtime Configured

**Correctly configured using ARM API:**
```json
{
  "functionAppConfig": {
    "runtime": { "name": "node", "version": "20" },
    "deployment": {
      "storage": {
        "type": "blobcontainer",
        "value": "https://asorapsqlflex8fa9.blob.core.windows.net/app-package-asora-function-dev-5589db8",
        "authentication": {
          "type": "storageaccountconnectionstring",
          "storageAccountConnectionStringName": "DEPLOYMENT_STORAGE_CONNECTION_STRING"
        }
      }
    },
    "scaleAndConcurrency": {
      "instanceMemoryMB": 2048,
      "maximumInstanceCount": 100
    }
  }
}
```

### ❌ Host Still Failing (502 Bad Gateway)

**URL:** `https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net/api/health`

**Error:** 502 Bad Gateway after restart (sometimes timeouts during cold start)

**Observations:**
1. No telemetry flowing to Application Insights (host not starting successfully)
2. Functions are discovered (`/health` endpoint visible in function list)
3. Deployment package exists in correct storage location
4. App state shows "Running" but host fails during startupation

**Date:** October 7, 2025  
**Function App:** asora-function-dev  
**Resource Group:** asora-psql-flex  
**Storage Account:** asoraflexdev1404

## Changes Applied

### 1. Storage RBAC Roles Granted ✅
Granted the function app's system-assigned managed identity:
- **Storage Blob Data Contributor** on `asoraflexdev1404`
- **Storage Queue Data Contributor** on `asoraflexdev1404`

**Managed Identity Principal ID:** `fb9a0072-3c59-4560-b425-1915016fb786`

### 2. Identity-Based Storage Configuration ✅
Removed connection string-based `AzureWebJobsStorage` and replaced with:
```bash
AzureWebJobsStorage__accountName=asoraflexdev1404
AzureWebJobsStorage__credential=managedidentity
```

### 3. Key Vault Access Granted ✅
Granted managed identity `get` and `list` permissions on Key Vault:
- **Key Vault:** `kv-asora-flex-dev`
- **Vault URI:** `https://kv-asora-flex-dev.vault.azure.net/`

### 4. App Settings Verified ✅
All Key Vault references remain in place:
- `APPLICATIONINSIGHTS_CONNECTION_STRING` → Key Vault ref
- Other secrets also using Key Vault references

## Current Status

### ❌ Host Still Failing (502 Bad Gateway)

**URL:** `https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net/api/health`

**Error:** 502 Bad Gateway after restart

**Observations:**
1. No telemetry flowing to Application Insights (host not starting)
2. Log streaming endpoint returns 404
3. App state shows "Running" but host appears dead

## Root Cause Analysis

This **IS** a Flex Consumption plan (confirmed):
- **SKU:** `FlexConsumption`
- **Kind:** `functionapp,linux`
- **Hostname Pattern:** `-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net` (Flex-style)

### Key Discovery

The CLI commands failed because:
1. **Flex requires `functionAppConfig` ARM API** - Legacy `linuxFxVersion` and `FUNCTIONS_WORKER_RUNTIME` are blocked
2. **Deployment storage was pointing to wrong location** - Initially tried empty `deployments` container in `asoraflexdev1404`, but code is in `app-package-asora-function-dev-5589db8` in `asorapsqlflex8fa9`

### Fixes Applied via ARM PATCH

Used `az rest` with API version `2023-12-01` to set:
- Runtime: `node` version `20` 
- Deployment storage: Correct blob container with connection string auth
- Scale: 2048MB instance memory, max 100 instances

## Blocked Issues

### 1. Linux FX Version Cannot Be Set
Attempts to set `linuxFxVersion` via CLI fail with "Bad Request":
```bash
az functionapp config set -g asora-psql-flex -n asora-function-dev --linux-fx-version "node|20"
# ERROR: Operation returned an invalid status 'Bad Request'
```

**Current Value:** `linuxFxVersion` is empty/null

### 2. Content Share Settings Rejected
Attempts to add `WEBSITE_CONTENTAZUREFILECONNECTIONSTRING` fail with "Bad Request"

### 3. No Platform Logs Available
- `az webapp log tail` returns 404 on SCM endpoint
- No startup traces visible

## Next Steps Required

### Immediate Troubleshooting

The runtime is now correctly configured, but the host is still failing. Possible causes:

1. **App settings conflict** - Some legacy settings might be incompatible with Flex
   - Check for `WEBSITE_NODE_DEFAULT_VERSION` or `FUNCTIONS_WORKER_RUNTIME` (should be removed)
   - Verify all Key Vault references resolve

2. **Missing runtime dependencies** - The deployment package might not be compatible with Node 20
   - Check if `host.json` specifies correct extensionBundle
   - Verify `package.json` dependencies are Node 20 compatible

3. **Storage access issues** - Despite connection string, there might be network/permission issues
   - Verify managed identity has all needed storage roles
   - Check if storage account has firewall restrictions

### Diagnostic Commands

```bash
# Check all app settings for incompatible keys
az webapp config appsettings list -g asora-psql-flex -n asora-function-dev \
  --query "[?contains(name, 'FUNCTION') || contains(name, 'WEBSITE') || contains(name, 'NODE')]" -o table

# Try accessing deployment blob directly (use connection string from DEPLOYMENT_STORAGE_CONNECTION_STRING app setting)
az storage blob list \
  --connection-string "<redacted>" \
  --container-name app-package-asora-function-dev-5589db8 -o table

# Monitor for startup errors (if logs become available)
az webapp log tail -g asora-psql-flex -n asora-function-dev
```

### Deployment Recommendation

Since configuration is now correct but host won't start, consider:

1. **Redeploy the function code** using the GitHub Actions workflow
   - This will ensure package is compatible with new Flex configuration
   - Workflow should use the correct deployment storage

2. **Check workflow deployment settings** in `.github/workflows/deploy-functions-flex.yml`
   - Ensure it's not trying to set blocked properties
   - Verify it targets the correct storage for deployment

## Working Configuration (for reference)

Based on successful Flex deployments, the app should have:

1. **Runtime Stack:** 
   - `linuxFxVersion: "node|20"`
   - `functionsVersion: ~4` (or auto-detected)

2. **Storage (Identity-based):** ✅ DONE
   - `AzureWebJobsStorage__accountName`
   - `AzureWebJobsStorage__credential=managedidentity`

3. **Key Vault Access:** ✅ DONE
   - Managed identity has secret permissions

4. **NOT NEEDED on Linux Consumption:**
   - ❌ `FUNCTIONS_WORKER_RUNTIME` (blocked on Flex)
   - ❌ `WEBSITE_NODE_DEFAULT_VERSION` (Windows-only)
   - ❌ `WEBSITE_RUN_FROM_PACKAGE` (OneDeploy used instead)

## Recommendations

**Immediate:** Use Azure Portal to set Node.js runtime version since CLI is blocked.

**Medium-term:** Investigate why this app rejects standard configuration commands. May indicate:
- Resource lock in place
- Deployment slot issue
- Plan type mismatch

**Long-term:** Consider redeploying the function app with proper IaC (Bicep/Terraform) to ensure consistent configuration.

## References

- [Identity-based connections](https://learn.microsoft.com/azure/azure-functions/functions-reference?tabs=blob#connecting-to-host-storage-with-an-identity-preview)
- [Linux Consumption runtime](https://learn.microsoft.com/azure/azure-functions/functions-app-settings#website_node_default_version)
- [Flex Consumption configuration](https://learn.microsoft.com/azure/azure-functions/flex-consumption-how-to)
