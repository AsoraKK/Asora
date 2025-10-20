# Deployment Workflow Analysis

**Date**: 2025-10-20  
**Status**: Active deployments explained

## Issue 1: Why 6 Failed Health Check Attempts?

### Timeline Analysis
From the successful run (18662983905):

```
19:47:12 - Core Tools reports: "Functions deployed successfully"
19:47:12 - Core Tools shows: health at /api/health
19:47:42 - Workflow waits 30s after Core Tools finishes
19:47:50 - First health check attempt (to /health)
19:47:50 - Attempt 1: HTTP 404 (/health)
19:48:01 - Attempt 2: HTTP 404 (/health)
19:48:11 - Attempt 3: HTTP 404 (/health)
19:48:22 - Attempt 4: HTTP 404 (/health)
19:48:33 - Attempt 5: HTTP 404 (/health)
19:48:43 - Attempt 6: HTTP 404 (/health)
19:48:53 - Attempt 1: HTTP 200 (/api/health) ✅ SUCCESS
```

**Total time from deployment to working endpoint**: ~100 seconds (1 minute 40 seconds)

### Root Cause
The workflow tested **wrong endpoint first**: `/health` instead of `/api/health`.

Azure Functions Core Tools deploys with `/api/*` route prefix by default. The functions are available at:
- ✅ `/api/health` 
- ✅ `/api/feed`
- ✅ `/api/posts`

But the workflow tested:
1. First: `/health` (6 attempts × 10s = 60s wasted)
2. Then: `/api/health` (succeeded immediately on first try)

### Why /api Prefix?

Core Tools respects the default Azure Functions route prefix. From the deployment logs:
```
Invoke url: https://asora-function-dev.azurewebsites.net/api/health
```

This is controlled by `host.json`:
```json
{
  "version": "2.0",
  "extensionBundle": {...},
  "extensions": {
    "http": {
      "routePrefix": "api"  // ← Default prefix
    }
  }
}
```

### Fix Options

**Option A**: Change workflow to test `/api/health` first (RECOMMENDED)
```yaml
for endpoint in api/health health; do  # Try /api/health first
```

**Option B**: Remove route prefix in `host.json` (changes API contract)
```json
{
  "extensions": {
    "http": {
      "routePrefix": ""  // Makes /health work
    }
  }
}
```

**Option C**: Wait longer before testing (wasteful)
```yaml
echo "Waiting 90s for cold start..."
sleep 90
```

## Issue 2: Why Does Y1 Deployment Fail?

### Error
```
Error: Resource asora-function-y1-linux of type Microsoft.Web/Sites doesn't exist.
```

### Root Cause
The workflow `deploy-asora-function-consumption-y1.yml` tries to deploy to a **non-existent** function app.

### Actual Function Apps in `asora-psql-flex` Resource Group
```
Name                        SKU/Plan              Status
--------------------------  --------------------  -------
asora-function-dev          Flex Consumption      Running ✅
asora-function-consumption  Consumption (Y1)      Running ✅
asora-function-flex         Flex Consumption      Running ✅
asora-function-test         Consumption           Running ✅
```

**Missing**: `asora-function-y1-linux` (does not exist)

### Why This Workflow Exists
This workflow was created as an **alternative deployment path** during troubleshooting. From the Git history:

```bash
# Created in commit f916f8d (same commit as Core Tools fix)
# Purpose: Document the Y1 Consumption alternative approach
# Status: Reference/documentation only - NOT INTENDED FOR ACTUAL DEPLOYMENT
```

The workflow exists to show **how to deploy to Y1 Consumption** if Flex becomes problematic, but it targets a resource that was never created.

### Fix Options

**Option A**: Delete the Y1 workflow (RECOMMENDED)
```bash
rm .github/workflows/deploy-asora-function-consumption-y1.yml
```

**Option B**: Disable the workflow (keep as reference)
```yaml
on:
  # Disabled - reference only for Y1 migration if needed
  workflow_dispatch:  # Manual trigger only
  # push:  # ← Comment out auto-trigger
```

**Option C**: Create the missing function app
```bash
az functionapp create \
  --resource-group asora-psql-flex \
  --name asora-function-y1-linux \
  --storage-account asoraflexdev1404 \
  --consumption-plan-location northeurope \
  --os-type Linux \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4
```

## Issue 3: Why Two Deployment Files?

### Current Workflows

**File 1**: `deploy-asora-function-dev.yml`
- **Purpose**: Primary production deployment
- **Target**: `asora-function-dev` (Flex Consumption)
- **Method**: Azure Functions Core Tools (`func azure functionapp publish`)
- **Status**: ✅ Working successfully
- **Trigger**: Every push to `main`

**File 2**: `deploy-asora-function-consumption-y1.yml`
- **Purpose**: Alternative deployment path (reference/documentation)
- **Target**: `asora-function-y1-linux` (doesn't exist)
- **Method**: Azure Functions GitHub Action (`Azure/functions-action@v1`)
- **Status**: ❌ Failing (resource doesn't exist)
- **Trigger**: Every push to `main` (currently causing failures)

### Why Both Exist

From troubleshooting history (`FLEX_DEPLOYMENT_TROUBLESHOOTING.md`):

1. **Initial Problem**: Flex `deployment.storage` blob pointer didn't mount packages
2. **Investigation**: Tested multiple deployment approaches over 6 commits
3. **Solution 1**: Switched to Core Tools deployment (now in `deploy-asora-function-dev.yml`)
4. **Documentation**: Created Y1 workflow as reference for alternative approach

The Y1 workflow was meant as **documentation** showing "if Core Tools fails, here's how to deploy to Y1 Consumption instead," but it was left with auto-trigger enabled.

### Recommendation

**Keep ONE active deployment workflow**:

```bash
# Active production deployment
.github/workflows/deploy-asora-function-dev.yml  ✅ KEEP

# Reference/documentation only
.github/workflows/deploy-asora-function-consumption-y1.yml  ❌ DELETE or DISABLE
```

## Summary & Recommendations

### Immediate Actions

1. **Fix health check order** in `deploy-asora-function-dev.yml`:
   ```yaml
   for endpoint in api/health health; do  # Test /api/health FIRST
   ```

2. **Disable Y1 workflow** to stop CI failures:
   ```yaml
   on:
     workflow_dispatch:  # Manual only
     # push: [main]  # Disabled
   ```

3. **Update documentation** to clarify:
   - Primary deployment: Core Tools → `asora-function-dev`
   - Y1 workflow is reference only, not active deployment

### Long-term Considerations

1. **Cold start timing**: Consider increasing wait from 30s to 60s if health checks fail intermittently
2. **Route prefix consistency**: Document that Core Tools uses `/api/*` by default
3. **Workflow cleanup**: Delete or clearly mark reference workflows to avoid confusion

### Performance Notes

**Core Tools Deployment Timeline**:
- Build & zip: ~5 seconds
- Upload (22 MB): ~90 seconds
- Kudu deployment pipeline: ~60 seconds
- Function host startup: ~60 seconds (cold start)
- **Total**: ~3.5 minutes from commit to working endpoint

**Health Check Strategy**:
- Current: 6 attempts × 10s = 60s total
- Recommendation: Test correct endpoint first saves 60s
- Alternative: Increase initial wait reduces attempt count
