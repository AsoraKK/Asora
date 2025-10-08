# Y1 App Configuration Status

## Current State

**App Name:** asora-function-consumption  
**SKU:** Y1 (Consumption)  
**Host Status:** ✅ RUNNING (200 OK on root AND /api/health)  
**Created:** 2025-10-08  
**Resolved:** 2025-10-08 20:58 UTC

## Root Cause Identified

**Issue:** Worker Indexing failure with v4 JS programming model on Y1 Consumption plan.

**Solution:** Switched to classic function.json-based HTTP function deployed via config-zip.

## Configuration Applied

### App Settings (Final Working Config)
```bash
AzureWebJobsStorage=<full connection string>
FUNCTIONS_EXTENSION_VERSION=~4
FUNCTIONS_WORKER_RUNTIME=node
WEBSITE_NODE_DEFAULT_VERSION=~18
AzureWebJobsFeatureFlags=  # Disabled (empty)
WEBSITE_RUN_FROM_PACKAGE=  # Disabled (empty)
WEBSITE_SKIP_CONTENTSHARE=  # Disabled (empty)
```

### Function Structure (Classic Model)
```
probe.zip/
├── host.json (version: "2.0")
└── health/
    ├── function.json (HTTP trigger bindings)
    └── index.js (classic module.exports handler)
```

### Deployment Method
- **config-zip** instead of WEBSITE_RUN_FROM_PACKAGE
- No SAS tokens required
- Direct ZIP upload via Azure CLI

### Package Structure Verified ✅
```
host.json (version 4.0)
package.json (@azure/functions ^4)
index.js (v4 programming model with context parameter)
node_modules/ (all dependencies included)
```

### Handler Code (Corrected)
```javascript
const { app } = require('@azure/functions');

app.http('health', {
  methods: ['GET'],
  route: 'health',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    context.log('Health check request');
    return {
      status: 200,
      body: 'ok'
    };
  }
});
```

### Possible Causes
1. **SAS token expired/invalid** - May need fresh token  
2. **Package cache** - App may be loading old package version  
3. **Platform initialization issue** - Similar to Flex broken state  
4. **Missing extension bundle** - host.json may need extensionBundle configuration  
5. **Node v4 model registration** - Handler format may still be incorrect

## Probe Function Code

### host.json
```json
{
  "version": "4.0"
}
```

### package.json
```json
{
  "name": "probe",
  "main": "index.js",
  "dependencies": {
    "@azure/functions": "^4"
  }
}
```

### index.js
```javascript
const { app } = require('@azure/functions');

app.http('health', {
  methods: ['GET'],
  route: 'health',
  authLevel: 'anonymous',
  handler: async () => ({
    status: 200,
    body: 'ok'
  })
});
```

## Next Steps

1. **Check Kudu API for function discovery** - Verify if "health" function is registered
2. **Review application logs** - Check App Insights or streaming logs for errors
3. **Test alternative package structure** - Try moving dist/ contents to root if current fails
4. **Deploy full build** - If probe succeeds, upload deploy-flex-final.zip (20MB)

## Flex App Recreation

**Plan:** asora-flex-plan (FC1)  
**App:** asora-function-dev (recreation in progress)  
**Managed Identity:** ef4bb0e2-a232-4d8d-9b60-5b02c9c2be26  
**RBAC:** Storage Blob Data Contributor granted  
**Storage Settings:** AzureWebJobsStorage configured for identity-based auth

Waiting for Y1 resolution before completing Flex configuration.

## Commands Used

```bash
# Y1 app creation
az functionapp create \
  -g asora-psql-flex \
  -n asora-function-consumption \
  --consumption-plan-location northeurope \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --os-type Linux \
  --storage-account asoraflexdev1404

# App settings
az webapp config appsettings set \
  -g asora-psql-flex \
  -n asora-function-consumption \
  --settings \
    FUNCTIONS_EXTENSION_VERSION="~4" \
    FUNCTIONS_WORKER_RUNTIME="node" \
    AzureWebJobsFeatureFlags="EnableWorkerIndexing"

# Package upload
az storage blob upload \
  -f /home/kylee/asora/functions/probe-deploy.zip \
  --account-name asoraflexdev1404 \
  -c deployments \
  -n app.zip \
  --overwrite \
  --auth-mode login

# SAS generation
az storage blob generate-sas \
  --account-name asoraflexdev1404 \
  -c deployments \
  -n app.zip \
  --permissions r \
  --expiry "2025-10-14T23:59:59Z" \
  --as-user \
  --auth-mode login

# WEBSITE_RUN_FROM_PACKAGE
az webapp config appsettings set \
  -g asora-psql-flex \
  -n asora-function-consumption \
  --settings WEBSITE_RUN_FROM_PACKAGE="<SAS_URL>"

# Restart
az functionapp restart -g asora-psql-flex -n asora-function-consumption
```

## References

- AZURE_FUNCTIONS_IDENTITY_STORAGE_MIGRATION.md: Complete Flex troubleshooting
- FLEX_RECREATION_COMPLETE.md: Flex plan/app recreation commands
- functions/probe/: Minimal test package source
