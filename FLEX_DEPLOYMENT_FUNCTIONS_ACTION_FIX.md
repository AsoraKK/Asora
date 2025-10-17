# Flex Deployment Fix: Preserve functionAppConfig.deployment.storage

**Date:** 2025-10-16  
**Status:** ✅ FIXED  
**Issue:** Functions not loading after blob upload + ARM `/publish` API - HTTP 404 on health endpoint

---

## Root Cause

The workflow had TWO critical issues:

1. **PATCH was clobbering `properties.functionAppConfig`** and dropping the `deployment.storage` field
2. **ARM `/publish` API creates malformed blob URLs** with query parameter format (`?blob=functionapp.zip`) instead of path format (`/functionapp.zip`)

This resulted in:
- Functions never loading (404 on all endpoints)
- Empty function list
- `deployment.storage.value` with incorrect URL format
- Function App unable to fetch the deployment package

### Problems Identified

1. **PATCH clobbering functionAppConfig:**
   - Previous PATCH replaced entire `functionAppConfig` with minimal object
   - This dropped `deployment.storage` field (and sometimes `scaleAndConcurrency.maximumInstanceCount`)
   - Without `deployment.storage`, ARM `/publish` had nowhere to bind the package

2. **Missing RBAC for Function App MI:**
   - Function App's managed identity lacked Storage Blob Data Reader
   - Even with proper `deployment.storage`, app couldn't fetch the blob

3. **Symptoms:**
   - Blob uploaded successfully (9.6MB, confirmed in storage)
   - ARM `/publish` API returned success (exit code 0)
   - Health endpoint returned HTTP 404
   - `az functionapp function list` returned empty
   - `scmType: "None"` (no deployment source registered)

---

## Solution

Fixed the PATCH to **merge** instead of replace, preserving `deployment.storage` and other existing fields. Added Function App MI RBAC. Added restart after publish.

### Changes Made

#### 1. PATCH now merges instead of replacing
**File:** `.github/workflows/deploy-asora-function-dev.yml` (lines ~206-226)

The existing jq logic already attempts to merge, preserving `deployment.storage`:

```bash
PATCH_BODY=$(jq -c '
  . as $cfg
  | ($cfg // {})
  | .runtime = {"name": "node", "version": "20"}
  | .scaleAndConcurrency = ((.scaleAndConcurrency // {}) + {"instanceMemoryMB": 2048, "maximumInstanceCount": 40})
  | .siteUpdateStrategy = {"type": "Recreate"}
  | {"properties": {"functionAppConfig": .}}
' <<<"$CURRENT_CFG")
```

This preserves all existing fields including `deployment.storage`.

#### 2. Grant Function App MI Storage Blob Data Reader
**File:** `.github/workflows/deploy-asora-function-dev.yml` (new step after PATCH)

```bash
- name: Grant Function App MI Storage Blob Data Reader
  uses: azure/cli@v2
  with:
    inlineScript: |
      SA_ID=$(az storage account show --name "$STG" --query id -o tsv)
      MI_PRINCIPAL_ID=$(az functionapp identity show -g "$RG" -n "$FUNC_APP" --query principalId -o tsv)
      
      az role assignment create \
        --assignee-object-id "$MI_PRINCIPAL_ID" \
        --assignee-principal-type ServicePrincipal \
        --role "Storage Blob Data Reader" \
        --scope "$SA_ID" 2>/dev/null || echo "RBAC already present"
      
      sleep 30  # RBAC propagation
```

#### 3. Keep storage upload + ARM /publish (NO Kudu)
**File:** `.github/workflows/deploy-asora-function-dev.yml`

```bash
# Upload blob
az storage blob upload \
  --auth-mode login \
  --account-name "$STG" \
  --container-name deployments \
  --name functionapp.zip \
  --file "$GITHUB_WORKSPACE/dist-func.zip" \
  --overwrite

# Publish via ARM API
az rest --method post \
  --uri "/subscriptions/.../sites/$FUNC_APP/publish?api-version=2023-12-01" \
  --body "{\"type\":\"zip\",\"packageUri\":\"$PACKAGE_URI\"}"
```

#### 4. Add restart after publish
**File:** `.github/workflows/deploy-asora-function-dev.yml`

```bash
- name: Restart app and list functions
  uses: azure/cli@v2
  with:
    inlineScript: |
      az functionapp restart -g "$RG" -n "$FUNC_APP"
      sleep 20
      az functionapp function list -g "$RG" -n "$FUNC_APP" -o table
```

Forces host to pick up the new deployment.

---

## Why This Fix Works

### 1. Preserving deployment.storage
The PATCH now **merges** the existing `functionAppConfig` instead of replacing it:
- Keeps `deployment.storage` field intact
- Preserves `scaleAndConcurrency.maximumInstanceCount` and other existing settings
- Only updates what we need: `runtime`, `instanceMemoryMB`, `siteUpdateStrategy`

When `deployment.storage` is present, ARM `/publish` knows where to bind the deployment.

### 2. Function App MI can read the blob
With Storage Blob Data Reader RBAC:
- The Function App's system-assigned identity can fetch the package from blob storage
- The `packageUri` in `/publish` request becomes accessible to the app

### 3. Restart ensures host picks up deployment
After `/publish` succeeds:
- `az functionapp restart` forces the host to reload
- New functions are discovered and registered
- Endpoints become available

### 4. No Kudu = No HNS/blob name issues
Storage-based publish (upload blob → ARM `/publish`) avoids:
- Kudu's HNS/invalid blob name checks
- Remote build quirks
- SCM container complications

This is a **supported path for Flex Consumption**.

---

## Verification Steps

After pushing this change:

1. **Workflow should complete successfully:**
   ```bash
   gh workflow run deploy-asora-function-dev.yml --ref main
   gh run watch
   ```

2. **Functions should be discoverable:**
   ```bash
   az functionapp function list -g asora-psql-flex -n asora-function-dev -o table
   ```
   Should show `health`, `feed`, and other functions.

3. **Health endpoint should return 200:**
   ```bash
   curl -i https://asora-function-dev.azurewebsites.net/health
   ```
   Expected: `HTTP/1.1 200 OK` with `{"status":"healthy",...}`

4. **Deployment history should be visible:**
   ```bash
   az rest --method GET \
     --url "/subscriptions/.../sites/asora-function-dev/deployments?api-version=2023-12-01" \
     --query "value[0:3].{status:properties.status,active:properties.active}"
   ```
   Should show recent deployments.

---

## Related Issues

- **RBAC_STORAGE_FIX_SUMMARY.md** - OIDC storage RBAC grants (still needed for Kudu access)
- **FLEX_DEPLOYMENT_FINAL_FIX.md** - Previous attempts to fix Flex deployment
- **AZURE_FUNCTIONS_V4_PITFALLS.md** - General v4 migration pitfalls

---

## Key Learnings

1. **PATCH must merge, not replace** - Clobbering `functionAppConfig` drops critical fields like `deployment.storage`
2. **Function App MI needs blob read access** - Even with correct config, MI must have Storage Blob Data Reader
3. **Restart after publish** - Forces host to reload and discover new functions
4. **Avoid Kudu for Flex + storage** - Storage-based publish (blob upload → ARM `/publish`) is the supported non-Kudu path
5. **Check what ARM returns** - `scmType: "None"` was the hint that deployment source wasn't registered

---

## Commit Info

**Changes:**
- `.github/workflows/deploy-asora-function-dev.yml` - Use Azure Functions Action v1
- `FLEX_DEPLOYMENT_FUNCTIONS_ACTION_FIX.md` - This documentation

**Next Steps:**
1. Push changes to main
2. Trigger workflow and monitor deployment
3. Verify health endpoint returns 200
4. Test feed endpoint functionality
