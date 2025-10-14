# Flex Consumption Blob Storage Deployment Fix

## Problem Statement

Deployment to Azure Functions Flex Consumption was failing with:
```
[StorageAccessibleCheck] Error while checking access to storage account using Kudu.Legion.Core.Storage.BlobContainerStorage: 
BlobUploadFailedException: Failed to upload blob to storage account: 
Response status code does not indicate success: 400 (The specifed resource name contains invalid characters.).
```

## Root Cause Analysis

**CRITICAL DISCOVERY**: The root cause has **two layers**:

1. **App Settings Issue**: Using settings explicitly forbidden for Flex Consumption
   - `FUNCTIONS_WORKER_RUNTIME` and `WEBSITE_CONTENTSHARE` are invalid for Flex plans

2. **File Naming Issue**: CamelCase file names violate Azure Blob Storage naming rules
   - Files like `exportUser.js`, `appealFlag.js` contain uppercase letters
   - Azure Blob container/blob names must be lowercase only

### What Was Wrong

1. **❌ `FUNCTIONS_WORKER_RUNTIME`**: Explicitly forbidden for Flex Consumption (runtime auto-detected)
2. **❌ `WEBSITE_CONTENTSHARE`**: Explicitly forbidden for Flex Consumption (content storage auto-managed)  
3. **❌ CamelCase file names**: Files like `exportUser.js`, `appealFlag.js` violate blob naming rules
4. **Conflicting deployment settings**: Legacy settings like `WEBSITE_RUN_FROM_PACKAGE`, `SCM_*` settings were interfering
5. **RBAC timing issues**: Storage permissions may not have propagated before deployment

### Flex Consumption vs Regular Consumption

| Setting | Regular Consumption | Flex Consumption |
|---------|-------------------|------------------|
| `FUNCTIONS_WORKER_RUNTIME` | ✅ Required | ❌ Forbidden |
| `WEBSITE_CONTENTSHARE` | ✅ Optional | ❌ Forbidden |
| `FUNCTIONS_EXTENSION_VERSION` | ✅ Required | ✅ Required |

## Solution Implemented

### 1. Minimal Required Configuration (Flex Consumption)
```bash
# Only set the minimal required setting for Flex Consumption
az functionapp config appsettings set \
  --settings \
    FUNCTIONS_EXTENSION_VERSION="~4"
```

### 2. Remove Conflicting Settings (Including Flex-Forbidden)
```bash
az functionapp config appsettings delete \
  --setting-names \
    FUNCTIONS_WORKER_RUNTIME \
    WEBSITE_CONTENTSHARE \
    WEBSITE_RUN_FROM_PACKAGE \
    WEBSITE_RUN_FROM_ZIP \
    SCM_RUN_FROM_PACKAGE_CONTAINER \
    SCM_USE_FUNCPACKAGE \
    WEBSITE_CONTENTAZUREFILECONNECTIONSTRING \
    SCM_ZIPDEPLOY_CONTAINER \
    SCM_CONTAINER \
    SCM_TARGET_PATH
```

### 3. Enhanced Storage Access Validation
- Verify storage account exists before attempting RBAC grants
- Explicit validation of storage account accessibility
- Added 10-second wait for RBAC propagation

### 3. Exclude CamelCase Files from Deployment
```bash
# Only include required files, exclude camelCase files that violate blob naming
zip -r dist-func.zip \
  index.js index.d.ts \
  host.json package.json \
  health/ feed/ post/ shared/ src/ \
  -x "**/*.map" "**/*.ts" "__tests__/*" "tests/*"
```

### 4. Pre-Deployment Validation
Added validation to ensure incompatible settings are absent:
```bash
# Ensure critical incompatible settings are removed for Flex Consumption
INCOMPATIBLE=$(az functionapp config appsettings list --query "[?name=='WEBSITE_CONTENTSHARE' || name=='FUNCTIONS_WORKER_RUNTIME'].name" -o tsv)
```

## Key Settings for Flex Consumption

### Required Settings (Flex Consumption)
```
FUNCTIONS_EXTENSION_VERSION=~4
```

### ❌ CRITICAL: Settings NOT Supported in Flex Consumption
```
FUNCTIONS_WORKER_RUNTIME=node          # ❌ Invalid for Flex
WEBSITE_CONTENTSHARE=*                 # ❌ Invalid for Flex
```

### Forbidden Settings (Incompatible with Flex)
- `FUNCTIONS_WORKER_RUNTIME` - **❌ CRITICAL: Invalid for Flex Consumption**
- `WEBSITE_CONTENTSHARE` - **❌ CRITICAL: Invalid for Flex Consumption**
- `WEBSITE_RUN_FROM_PACKAGE` - Not supported in Flex Consumption
- `WEBSITE_RUN_FROM_ZIP` - Conflicts with OneDeploy
- `SCM_RUN_FROM_PACKAGE_CONTAINER` - Legacy setting
- `WEBSITE_CONTENTAZUREFILECONNECTIONSTRING` - Flex uses Blob, not Files
- `SCM_ZIPDEPLOY_CONTAINER` / `SCM_CONTAINER` / `SCM_TARGET_PATH` - Legacy settings

## Deployment Flow

1. **Build**: `npm ci && npm run build` creates `dist/` with all required files
2. **Package**: Zip `dist/` contents (excluding `.ts`, `.map`, test files)
3. **Configure**: Set valid content share and clean conflicting settings
4. **RBAC**: Grant Storage Blob Data Contributor to managed identity
5. **Validate**: Verify content share name and list critical settings
6. **Deploy**: Use `Azure/functions-action@v1` with zip package
7. **Verify**: List functions and probe endpoints

## Verification Commands

### Check Current Settings
```bash
az functionapp config appsettings list \
  -g asora-psql-flex \
  -n asora-function-dev \
  --query "[?contains(name, 'FUNCTION') || contains(name, 'WEBSITE') || contains(name, 'SCM')].{name:name, value:value}" \
  -o table
```

### Validate Content Share Name
```bash
SHARE=$(az functionapp config appsettings list \
  -g asora-psql-flex \
  -n asora-function-dev \
  --query "[?name=='WEBSITE_CONTENTSHARE'].value|[0]" -o tsv)

# Should return valid name: asora-function-dev-content
echo "$SHARE" | grep -qE '^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$' && echo "✅ Valid" || echo "❌ Invalid"
```

### Check Storage RBAC
```bash
STORAGE=$(az functionapp config appsettings list \
  -g asora-psql-flex \
  -n asora-function-dev \
  --query "[?name=='AzureWebJobsStorage__accountName'].value|[0]" -o tsv)

PRINCIPAL=$(az functionapp identity show \
  -g asora-psql-flex \
  -n asora-function-dev \
  --query principalId -o tsv)

az role assignment list \
  --assignee "$PRINCIPAL" \
  --scope "/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.Storage/storageAccounts/$STORAGE" \
  -o table
```

## References

- **Azure Blob Naming**: https://learn.microsoft.com/en-us/rest/api/storageservices/naming-and-referencing-containers--blobs--and-metadata
- **Flex Consumption**: https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan
- **App Settings**: See `AZURE_FUNCTIONS_V4_PITFALLS.md` for full list of incompatible settings

## Status

✅ **Fixed in commit**: `f34f38d` - "Fix Flex Consumption blob storage deployment error"

The deployment workflow now:
- Sets explicit, valid content share name
- Removes all conflicting settings
- Validates configuration before deployment
- Provides detailed logging for debugging
