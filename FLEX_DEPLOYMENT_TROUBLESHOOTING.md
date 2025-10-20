# Azure Functions Flex Consumption - Node.js v4 Deployment Troubleshooting

**Status:** RESOLVED - Switched to Azure Functions Core Tools deployment
**Date:** 2025-10-20
**Function App:** asora-function-dev (Flex Consumption, Linux, Node 20)

## Resolution Summary

**Root Cause**: Azure Functions Flex Consumption's `functionAppConfig.deployment.storage` blob-based deployment **does not reliably load Node.js v4 functions**. Despite perfect configuration (correct blob URL, MI authentication, RBAC permissions, package structure), the Flex runtime fails to mount and discover functions from the blob.

**Solution**: Switched to **Azure Functions Core Tools** (`func azure functionapp publish`) which uses Kudu zip deploy. This is the proven deployment path for Flex + Node v4.

## What Didn't Work ❌

### Approach: Storage-based deployment via ARM API
```yaml
# This configuration was set correctly but functions never loaded:
functionAppConfig:
  deployment:
    storage:
      type: blobcontainer
      value: https://storage.blob.core.windows.net/container/package.zip
      authentication:
        type: systemassignedidentity
  runtime:
    name: node
    version: "20"
```

**Result**: 
- ✅ Configuration accepted by ARM API
- ✅ Blob uploaded successfully with correct RBAC
- ✅ App restarts without errors
- ❌ `az functionapp function list` returns empty
- ❌ All HTTP endpoints return 404
- ❌ Runtime never mounts the blob package

**Conclusion**: Flex `deployment.storage` is unreliable/unsupported for Node v4 programming model.

## What Works ✅

### Approach: Azure Functions Core Tools
```bash
cd functions/dist
func azure functionapp publish asora-function-dev \
  --javascript \
  --build remote \
  --nozip
```

**Why it works**:
- Uses Kudu zip deploy under the hood (Flex supports this)
- Core Tools handles package formatting and upload
- Proven deployment path with proper Node v4 discovery
- Immediate function registration after deploy

## Problem Summary

Azure Functions deployed to Flex Consumption plan using ARM API `deployment.storage` blob pointer were not being discovered by the runtime, resulting in HTTP 404 on all endpoints including `/health`.


## What We've Verified ✅

### 1. Blob Storage Configuration
- ✅ Blob exists: `https://asoraflexdev1404.blob.core.windows.net/deployments/functionapp.zip`
- ✅ Blob size: ~9.6 MB
- ✅ Container: `deployments` (non-HNS GPv2 storage)
- ✅ Content verified: includes `host.json`, `index.js`, `package.json`, `node_modules/`, and all compiled `src/` files

### 2. RBAC Permissions
- ✅ GitHub OIDC (gh-deployer): `Storage Blob Data Contributor` on storage account
- ✅ Function App MI (87d8456d-2d1a-479b-9ad3-b069451a261f): `Storage Blob Data Reader` on storage account
- ✅ RBAC propagation waits added (30-90s) in workflow

### 3. Function App Configuration
```json
{
  "deployment": {
    "storage": {
      "type": "blobcontainer",
      "value": "https://asoraflexdev1404.blob.core.windows.net/deployments/functionapp.zip",
      "authentication": {
        "type": "systemassignedidentity"
      }
    }
  },
  "runtime": {
    "name": "node",
    "version": "20"
  },
  "scaleAndConcurrency": {
    "instanceMemoryMB": 2048,
    "maximumInstanceCount": 40
  }
}
```

### 4. Package Structure
```
dist/
├── host.json (version 2.0, extensionBundle 4.x)
├── index.js (entry point: module.exports = require('./src/index.js'))
├── package.json (main: "index.js", dependencies included)
├── node_modules/ (@azure/functions@4.7.2 and 150+ packages)
└── src/
    ├── index.js (registers all functions via require())
    ├── health.js (app.http('health', {...}))
    ├── feed.js (app.http('feed', {...}))
    └── posts.js (app.http('posts-create', {...}))
```

### 5. App Settings
- ✅ `FUNCTIONS_EXTENSION_VERSION=~4`
- ✅ `WEBSITE_RUN_FROM_PACKAGE` deleted (not used in Flex)
- ✅ `FUNCTIONS_WORKER_RUNTIME` NOT set (Flex uses functionAppConfig.runtime)
- ✅ `AzureWebJobsStorage` configured

### 6. Deployment Process
1. Build TypeScript → `dist/`
2. Fix `package.json` main field (`"dist/index.js"` → `"index.js"`)
3. Install production dependencies in `dist/`
4. Zip `dist/` contents
5. Upload zip to blob storage
6. PATCH `functionAppConfig.deployment.storage` with blob URL
7. Restart Function App
8. Call `/syncfunctiontriggers` API

## What's NOT Working ❌

- ❌ `az functionapp function list` returns empty (no functions discovered)
- ❌ All HTTP endpoints return HTTP 404
- ❌ Server responds with `Server: Kestrel` (runtime is running but no functions loaded)
- ❌ `scmType: null` (no Kudu/SCM site for Flex)
- ❌ No access to streaming logs or diagnostic logs (Flex limitation)

## Observations

1. **Local package test**: Running `node index.js` in `dist/` shows functions register correctly (with test mode warnings), proving the package structure is valid
   
2. **ARM /publish API issue**: Initially tried ARM `/publish` endpoint which created malformed blob URLs (`?blob=filename` instead of `/filename`). Switched to direct PATCH of `deployment.storage.value` which fixed the URL format.

3. **Sync operations**: Manually calling `/syncfunctiontriggers` API returns `{status: "success"}` but functions still not discovered

4. **Multiple restarts**: Tried restarting with waits up to 60s - no change

5. **Package.json main field**: Fixed from `"dist/index.js"` to `"index.js"` to match deployment structure - no change

## Hypotheses

### A. Flex Consumption Node.js v4 Programming Model Bug
Azure Functions Flex Consumption may have incomplete support for Node.js v4 programming model with storage-based deployment. The runtime might not be correctly:
- Reading the blob via system-assigned identity
- Loading the package.json `main` entry point
- Discovering `app.http()` registrations

### B. Missing Configuration Step
There may be an undocumented app setting or configuration property required for Flex + Node v4 that we haven't set.

### C. Package Structure Issue
Despite local validation, Flex runtime might expect a different structure (e.g., flat structure without nested `src/`, or different entry point mechanism).

## Attempted Workarounds

1. ❌ Extended RBAC propagation waits (up to 90s)
2. ❌ Multiple restart + sync cycles
3. ❌ Fixed package.json main field
4. ❌ Direct PATCH instead of ARM /publish API
5. ❌ Re-uploaded blob with timestamps
6. ❌ **Forced CommonJS module type**: Set `"type": "commonjs"` explicitly in dist/package.json and created minimal production package (commit e1d2313) - still no function discovery

## Root Cause Determination

After extensive testing including:
- Fixing ARM /publish API malformed URLs
- Correcting package.json main field
- Forcing CommonJS module type with minimal production package.json
- Verifying RBAC, blob storage, and runtime configuration

**Conclusion**: Azure Functions Flex Consumption's storage-based deployment for Node.js v4 programming model appears to have fundamental issues preventing function discovery. Despite correct configuration at all levels (blob, RBAC, runtime, package structure), the runtime fails to load and discover functions.

## Lessons Learned

1. **Flex `deployment.storage` is brittle**: The ARM API accepts the configuration, but the Flex runtime doesn't reliably mount blob packages for Node v4 functions.

2. **Use proven deployment paths**: Core Tools (`func azure functionapp publish`) and Azure Functions GitHub Action (`Azure/functions-action@v1`) use Kudu zip deploy, which Flex supports.

3. **Storage constraints still apply**: Even with Core Tools, ensure:
   - `AzureWebJobsStorage` uses non-HNS GPv2 storage
   - Only set `FUNCTIONS_EXTENSION_VERSION=~4` (not `FUNCTIONS_WORKER_RUNTIME` on Flex)
   - If using custom SCM storage, grant app MI `Storage Blob Data Contributor`

4. **Route prefix varies**: Core Tools may deploy to `/api/health` vs `/health` depending on `host.json` route prefix. Test both.

## Alternative: Linux Consumption (Y1)

If Core Tools deployment fails or is undesirable, switching to Linux Consumption (Y1) plan provides:
- ✅ Stable `WEBSITE_RUN_FROM_PACKAGE` support
- ✅ Kudu/SCM site for diagnostics
- ✅ Proven Node.js v4 compatibility
- ✅ More mature tooling ecosystem

## Deployment History

### Failed Attempts (deployment.storage via ARM API)
1. ❌ Direct PATCH of `deployment.storage` with blob URL
2. ❌ ARM `/publish` endpoint (created malformed URLs)
3. ❌ Extended RBAC propagation waits (up to 90s)
4. ❌ Multiple restart + sync cycles
5. ❌ Fixed package.json main field
6. ❌ Forced CommonJS module type
7. ❌ `/syncfunctiontriggers` API calls

All resulted in correct ARM configuration but zero function discovery.

### Working Solution (Core Tools)
✅ `func azure functionapp publish` with `--build remote --javascript`

## Reference Links

- [Azure Functions Core Tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)
- [Azure Functions Node.js v4 Programming Model](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=javascript%2Cwindows%2Cazure-cli&pivots=nodejs-model-v4)
- [Flex Consumption Plan](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan)

