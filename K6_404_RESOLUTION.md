# k6 Load Testing 404 Resolution

## Root Cause Analysis

The 404 errors in k6 load testing were caused by **`asora-function-dev` having no deployed functions**. While the app existed and DNS resolved correctly, there was no deployment workflow targeting this app.

### Evidence
- `asora-func-y1-win-ne` had a deployment workflow ✅
- `asora-function-dev` had **NO** deployment workflow ❌
- k6 tests expected `/health` and `/feed` routes on `asora-function-dev`
- `curl` returned 404 because no functions were deployed

## Resolution Steps Implemented

### 1. Created Deployment Workflow ✅
**File:** `.github/workflows/deploy-asora-function-dev.yml`

Implements all recommended best practices:

#### Package Structure
```
asora-function-dev.zip/
├── host.json              # routePrefix: "" for clean URLs
├── package.json           # Node app metadata
├── Health/
│   ├── function.json      # route: "health"
│   └── index.js           # Classic handler
└── Feed/
    ├── function.json      # route: "feed"
    └── index.js           # Classic handler with guest/limit params
```

#### Key Configuration
- **Route Prefix:** Empty (`"routePrefix": ""`) → URLs are `/health`, `/feed` (not `/api/health`)
- **Auth Level:** Anonymous for both endpoints
- **Runtime:** Node 20 with Functions v4 runtime
- **Deployment Method:** `config-zip` via Kudu (Y1 Windows compatible)

### 2. Function Verification Steps ✅
The workflow includes comprehensive checks:

```yaml
- name: List deployed functions
  # Shows all deployed functions in table format

- name: Assert functions are present
  # Fails if fewer than 2 functions (health + feed)
  
- name: Verify health endpoint
  # Tests GET /health returns 200

- name: Verify feed endpoint  
  # Tests GET /feed?guest=1&limit=10 returns 200
```

### 3. Updated Integration Tests ✅
**File:** `.github/workflows/e2e-integration.yml`

Fixed workflow trigger:
```yaml
workflow_run:
  workflows: ["Deploy to asora-function-dev"]  # Was: "Deploy Functions (Flex)"
```

### 4. Enhanced Existing Workflows ✅
**File:** `.github/workflows/deploy-y1-win-ne.yml`

Added function listing and verification for consistency.

## Deployment Architecture

### Function: Health (`/health`)
```javascript
module.exports = async function (context, req) {
  context.res = {
    status: 200,
    headers: { "content-type": "application/json" },
    body: { 
      ok: true, 
      timestamp: new Date().toISOString(), 
      service: "asora-function-dev" 
    }
  };
};
```

### Function: Feed (`/feed`)
```javascript
module.exports = async function (context, req) {
  const guest = req.query.guest === "1";
  const limit = parseInt(req.query.limit || "10", 10);
  
  context.res = {
    status: 200,
    headers: { "content-type": "application/json" },
    body: {
      data: [],
      meta: {
        total: 0,
        limit: limit,
        offset: 0,
        guest: guest
      }
    }
  };
};
```

## k6 Test Configuration

### Updated Scripts
Both `load/k6/smoke.js` and `load/k6/feed-read.js` now:
- Validate `K6_BASE_URL` is not a placeholder
- Use correct routes: `/health` and `/feed` (no `/api` prefix)
- Default to `https://asora-function-dev.azurewebsites.net`

### CI/CD Validation
`.github/workflows/canary-k6.yml` adds pre-flight checks:
- DNS resolution verification
- Connectivity probe with `curl`
- Fails fast if environment is unreachable

## Expected Outcomes

After the deployment workflow runs:

1. ✅ `asora-function-dev` will have 2 functions deployed
2. ✅ `GET /health` will return `200 OK`
3. ✅ `GET /feed?guest=1&limit=10` will return `200 OK`
4. ✅ k6 smoke tests will pass (no more DNS/404 errors)
5. ✅ k6 will evaluate **real SLO thresholds** (p95 < 200ms, p99 < 400ms, error_rate < 1%)

## Verification Commands

### Local Testing
```bash
# Test health endpoint
curl -v https://asora-function-dev.azurewebsites.net/health

# Test feed endpoint
curl -v "https://asora-function-dev.azurewebsites.net/feed?guest=1&limit=10"

# Run k6 smoke test
npm run k6:smoke
```

### Azure CLI
```bash
# List deployed functions
az functionapp function list \
  -g asora-psql-flex \
  -n asora-function-dev \
  -o table

# Check app settings
az functionapp config appsettings list \
  -g asora-psql-flex \
  -n asora-function-dev \
  --query "[?name=='FUNCTIONS_EXTENSION_VERSION' || name=='FUNCTIONS_WORKER_RUNTIME'].{Name:name, Value:value}" \
  -o table
```

## Migration Path to Real Functions

These stub functions serve as infrastructure validation. To integrate real backend logic:

1. **Replace stub handlers** with production TypeScript from `functions/src/`
2. **Build production package** with proper dependencies
3. **Update deployment script** to use compiled `dist/` output
4. **Add Cosmos DB connection** via app settings
5. **Wire in authentication** via bearer tokens

The deployment workflow structure remains the same—only the package contents change.

## References

- **Deployment Workflow:** `.github/workflows/deploy-asora-function-dev.yml`
- **k6 Smoke Test:** `load/k6/smoke.js`
- **k6 Feed Test:** `load/k6/feed-read.js`
- **NPM Scripts:** `package.json` (k6:smoke, k6:feed)
- **Azure Functions Docs:** https://learn.microsoft.com/azure/azure-functions/
