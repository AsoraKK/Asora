# Azure Functions Flex Consumption: Blob Storage Deployment Fix

## Problem

```
[StorageAccessibleCheck] Error: BlobUploadFailedException: 
Failed to upload blob to storage account: 
Response status code does not indicate success: 400 (The specifed resource name contains invalid characters.)
```

## Root Cause

**The error is NOT about ZIP contents** - it's about the **blob container name** where Kudu stores your deployment package.

When `SCM_ZIPDEPLOY_CONTAINER` is not explicitly set, Kudu auto-generates a container name. If that name violates Azure Blob naming rules, you get a 400 error.

### Azure Blob Container Naming Rules
- 3-63 characters long
- Lowercase letters, numbers, hyphens only
- Cannot start/end with hyphen
- No consecutive hyphens (`--`)

## Solution

### Set Explicit Container Name

```yaml
- name: Configure deployment settings
  uses: azure/cli@v2
  with:
    inlineScript: |
      az functionapp config appsettings set \
        -g asora-psql-flex \
        -n asora-function-dev \
        --settings \
          FUNCTIONS_EXTENSION_VERSION="~4" \
          SCM_ZIPDEPLOY_CONTAINER="deploy-asora-function-dev"
```

### Remove Conflicting Settings

```bash
az functionapp config appsettings delete \
  -g asora-psql-flex \
  -n asora-function-dev \
  --setting-names \
    FUNCTIONS_WORKER_RUNTIME \
    WEBSITE_CONTENTSHARE \
    WEBSITE_RUN_FROM_PACKAGE \
    WEBSITE_RUN_FROM_ZIP \
    SCM_RUN_FROM_PACKAGE_CONTAINER
```

### Validate Container Name (Optional)

```bash
CONTAINER="deploy-asora-function-dev"
regex='^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$'

if [[ ! "$CONTAINER" =~ $regex ]] || [[ "$CONTAINER" == *--* ]]; then
  echo "Invalid container name!"
  exit 1
fi
```

## Key Settings for Flex Consumption

### Required
```
FUNCTIONS_EXTENSION_VERSION=~4
SCM_ZIPDEPLOY_CONTAINER=deploy-asora-function-dev  # Explicit, valid container name
```

### Forbidden (Will Cause Errors)
```
FUNCTIONS_WORKER_RUNTIME  # ❌ Invalid for Flex - runtime auto-detected
WEBSITE_CONTENTSHARE      # ❌ Invalid for Flex - content auto-managed
```

## Verification Commands

### Check Current Settings
```bash
az functionapp config appsettings list \
  -g asora-psql-flex \
  -n asora-function-dev \
  --query "[?contains(name, 'SCM') || contains(name, 'WEBSITE')].{name:name, value:value}" \
  -o table
```

### Test Deployment
```bash
# After deployment
az functionapp function list -g asora-psql-flex -n asora-function-dev -o table
curl -si https://asora-function-dev.azurewebsites.net/health
```

## Status

✅ **Fixed in commit**: `78ce83f` - Set explicit `SCM_ZIPDEPLOY_CONTAINER` with valid blob container name

The deployment workflow now:
1. Sets `SCM_ZIPDEPLOY_CONTAINER="deploy-asora-function-dev"` (valid name)
2. Removes all conflicting settings
3. Validates container name before deployment
4. Deploys with Azure/functions-action@v1

## References

- [Azure Blob Container Naming](https://learn.microsoft.com/en-us/rest/api/storageservices/naming-and-referencing-containers--blobs--and-metadata)
- [Flex Consumption Plan](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan)
