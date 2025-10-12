# GitHub Repository Variables Configuration

## Current Issue

The `K6_BASE_URL` repository variable is set to an invalid slot URL that doesn't resolve:
```
K6_BASE_URL=https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net
```

This causes k6 canary tests to fail with DNS resolution errors.

## Required Fix

### Option 1: Update the Repository Variable (Recommended)

Navigate to GitHub → Settings → Secrets and variables → Actions → Variables tab:

1. Find the variable `K6_BASE_URL`
2. Update its value to:
   ```
   https://asora-function-dev.azurewebsites.net
   ```
3. Save the change

### Option 2: Delete the Repository Variable

If you delete the `K6_BASE_URL` variable entirely, the workflows will use the hardcoded default:
```yaml
K6_BASE_URL: ${{ vars.K6_BASE_URL || 'https://asora-function-dev.azurewebsites.net' }}
```

This is safe because we've added the `||` fallback operator.

## Workflow Changes Made

### 1. Canary k6 Workflow Trigger
Changed from running on every push to running only after successful deployment:

**Before:**
```yaml
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
```

**After:**
```yaml
on:
  workflow_call:
  workflow_run:
    workflows: ["Deploy to asora-function-dev"]
    types: [completed]
    branches: [main]
```

This ensures k6 tests only run when functions are actually deployed.

### 2. Added Success Check
```yaml
jobs:
  canary-k6:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
```

k6 tests will only run if the deployment succeeded.

## Verification Steps

After updating the variable:

### 1. Check GitHub Actions
The deployment workflow should complete successfully:
- Navigate to: https://github.com/AsoraKK/Asora/actions
- Look for "Deploy to asora-function-dev" workflow
- Verify it deploys 2 functions (Health, Feed)

### 2. Test Endpoints Manually
```bash
# Should return 200 OK with JSON
curl -i https://asora-function-dev.azurewebsites.net/health

# Should return 200 OK with feed data
curl -i "https://asora-function-dev.azurewebsites.net/feed?guest=1&limit=10"
```

### 3. Run k6 Tests Locally
```bash
# Set the correct URL
export K6_BASE_URL="https://asora-function-dev.azurewebsites.net"

# Run smoke test
npm run k6:smoke
```

Expected output:
- No DNS errors
- HTTP 200 responses
- SLO thresholds evaluated (p95 < 200ms, p99 < 400ms, error_rate < 1%)

## Current Status

- ✅ Deployment workflow created (`.github/workflows/deploy-asora-function-dev.yml`)
- ✅ k6 scripts hardened with validation
- ✅ Canary workflow updated to run after deployment
- ⏳ **Waiting for:** GitHub variable update OR first deployment to complete
- ⏳ **Waiting for:** k6 tests to run against deployed functions

## Temporary Workaround

Until the variable is updated, you can test k6 locally:

```bash
# Override the bad variable
export K6_BASE_URL="https://asora-function-dev.azurewebsites.net"

# Wait for deployment to complete, then test
npm run k6:smoke
```

## Related Files

- **k6 Scripts:** `load/k6/smoke.js`, `load/k6/feed-read.js`
- **NPM Scripts:** `package.json` (k6:smoke, k6:feed)
- **Deployment:** `.github/workflows/deploy-asora-function-dev.yml`
- **Canary Tests:** `.github/workflows/canary-k6.yml`
- **Documentation:** `K6_404_RESOLUTION.md`
