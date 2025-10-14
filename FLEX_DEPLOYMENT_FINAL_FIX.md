# Flex Consumption Deployment - Final Fix (Following Exact Instructions)

## Root Cause (Confirmed)

The deployment fails in Kudu's `StorageAccessibleCheck` due to **invalid blob container/share names** derived from app settings. This is **NOT a ZIP contents issue**.

### The Error
```
Response status code does not indicate success: 400 (The specifed resource name contains invalid characters.)
```

### Why It Happens
Kudu OneDeploy uses app settings (`SCM_ZIPDEPLOY_CONTAINER`, `WEBSITE_CONTENTSHARE`) to determine blob container names. If these are missing or invalid, deployment fails.

## Azure Blob/File Naming Rules

**MUST follow these rules:**
- 3-63 characters long
- Lowercase letters, numbers, hyphens only
- Cannot start or end with hyphen
- No consecutive hyphens (`--`)

## Solution Applied

### 1. Set Valid Container/Share Names

```yaml
DEPLOY_CONTAINER="deploy-asora-function-dev"   # ✅ Valid
CONTENT_SHARE="asora-function-dev-content"     # ✅ Valid

az functionapp config appsettings set \
  --settings \
    FUNCTIONS_EXTENSION_VERSION="~4" \
    FUNCTIONS_WORKER_RUNTIME="node" \
    WEBSITE_CONTENTSHARE="$CONTENT_SHARE" \
    SCM_ZIPDEPLOY_CONTAINER="$DEPLOY_CONTAINER"
```

### 2. Remove Incompatible Settings

```bash
az functionapp config appsettings delete \
  --setting-names \
    WEBSITE_RUN_FROM_PACKAGE \      # ❌ Invalid for Flex
    WEBSITE_RUN_FROM_ZIP \
    SCM_RUN_FROM_PACKAGE_CONTAINER \
    SCM_CONTAINER \
    SCM_TARGET_PATH \
    WEBSITE_CONTENTAZUREFILECONNECTIONSTRING
```

### 3. Preflight Validation Guard

```bash
re='^[a-z0-9-]{3,63}$'
for NAME in "$DEPLOY_CONTAINER" "$CONTENT_SHARE"; do
  [[ -n "$NAME" && "$NAME" =~ $re && \
     "$NAME" != -* && "$NAME" != *- && "$NAME" != *--* ]] || \
    { echo "::error::Invalid name: $NAME"; exit 1; }
done
```

### 4. Assert Flex-Specific Configuration

```bash
# Ensure WEBSITE_RUN_FROM_PACKAGE is NOT set for Flex
RUN_FROM_PKG=$(az functionapp config appsettings list \
  --query "[?name=='WEBSITE_RUN_FROM_PACKAGE'].value|[0]" -o tsv)

if [ -n "$RUN_FROM_PKG" ] && [ "$RUN_FROM_PKG" != "None" ]; then
  echo "::error::WEBSITE_RUN_FROM_PACKAGE must NOT be set for Flex"
  exit 1
fi
```

## Key Settings for Flex Consumption

### ✅ Required
```
FUNCTIONS_EXTENSION_VERSION="~4"
FUNCTIONS_WORKER_RUNTIME="node"
WEBSITE_CONTENTSHARE="asora-function-dev-content"
SCM_ZIPDEPLOY_CONTAINER="deploy-asora-function-dev"
```

### ❌ Forbidden
```
WEBSITE_RUN_FROM_PACKAGE     # For Windows Y1 only
WEBSITE_RUN_FROM_ZIP         # Conflicts with OneDeploy
```

## Critical Mistake Corrected

**Previous error**: I was **deleting** `SCM_ZIPDEPLOY_CONTAINER` and `WEBSITE_CONTENTSHARE` right after setting them!

**Correction**: Set them once, keep them, and **only delete** incompatible settings like `WEBSITE_RUN_FROM_PACKAGE`.

## Workflow Changes (Commit: 15a6c0f)

1. ✅ Added preflight validation for container/share names
2. ✅ Set `FUNCTIONS_WORKER_RUNTIME="node"` (was incorrectly removed)
3. ✅ Set `WEBSITE_CONTENTSHARE="asora-function-dev-content"`
4. ✅ Set `SCM_ZIPDEPLOY_CONTAINER="deploy-asora-function-dev"`
5. ✅ Do NOT delete these settings after setting them
6. ✅ Assert no `WEBSITE_RUN_FROM_PACKAGE` for Flex
7. ✅ List critical app settings for debugging

## Post-Deployment Verification

```bash
# List discovered functions
az functionapp function list -g asora-psql-flex -n asora-function-dev -o table

# Tail logs
az webapp log config -g asora-psql-flex -n asora-function-dev \
  --application-logging filesystem --level information
az webapp log tail -g asora-psql-flex -n asora-function-dev \
  --stack node --timeout 20

# Probe endpoints with retries
for p in /health /api/health; do
  for i in 1 2 3 4 5; do
    code=$(curl -s -o /dev/null -w '%{http_code}' \
      "https://asora-function-dev.azurewebsites.net${p}")
    echo "$p -> $code"
    [ "$code" = "200" ] && break || sleep 10
  done
done
```

## Platform-Specific Gates

### For Flex Consumption Jobs
- ✅ Assert NO `WEBSITE_RUN_FROM_PACKAGE`
- ✅ Validate container/share names follow rules
- ✅ Set `FUNCTIONS_WORKER_RUNTIME`, `WEBSITE_CONTENTSHARE`, `SCM_ZIPDEPLOY_CONTAINER`

### For Windows Y1 Jobs (Separate Workflow)
- ✅ Assert `WEBSITE_RUN_FROM_PACKAGE` exists
- ✅ Do NOT set any `SCM_*_CONTAINER`
- ✅ Set `FUNCTIONS_WORKER_RUNTIME`, `FUNCTIONS_EXTENSION_VERSION`

## Summary

The fix addresses the exact root cause: **invalid blob container/share names in app settings**. By setting explicit, valid names and removing incompatible settings, Kudu's `StorageAccessibleCheck` will pass and deployment will succeed.

**Status**: Deployed in commit `15a6c0f` - awaiting GitHub Actions verification.
