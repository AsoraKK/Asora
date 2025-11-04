# Health and Readiness Endpoint Pattern

## Overview

The Asora Function App implements a two-tier health check pattern to ensure reliable deployments and accurate service status reporting:

1. **`/api/health`** - Liveness probe (process is alive and can execute code)
2. **`/api/ready`** - Readiness probe (all dependencies are available)

This separation prevents transient configuration or dependency issues from blocking deployments while still providing visibility into the app's ability to serve traffic.

## Endpoints

### `/api/health` - Liveness Probe

**Purpose:** Verify the Functions host process can execute code

**Auth Level:** `anonymous` (no key required)

**Response:**
```json
{
  "status": "ok",
  "version": "abc123...",
  "uptimeSeconds": 42,
  "timestamp": "2025-11-04T12:34:56.789Z"
}
```

**Guarantees:**
- ✅ Returns 200 if the process is running
- ✅ **No external dependencies** (no DB, no Key Vault, no auth providers)
- ✅ Uses only static data and `process.env.GIT_SHA`
- ✅ Always registered, even if other routes fail to load

**Use Cases:**
- CI/CD deployment probes (must pass for deployment to succeed)
- Azure health check configuration (`health_check_path`)
- External monitoring/uptime services

**Implementation:** `functions/src/shared/routes/health.ts`

---

### `/api/ready` - Readiness Probe

**Purpose:** Verify all critical dependencies are available

**Auth Level:** `function` (requires function key in query param `?code=...`)

**Response (healthy):**
```json
{
  "ready": true,
  "checks": [
    { "name": "environment", "status": "ok" }
  ],
  "timestamp": "2025-11-04T12:34:56.789Z"
}
```

**Response (unhealthy):**
```json
{
  "ready": false,
  "checks": [
    { 
      "name": "environment", 
      "status": "fail",
      "message": "Missing: COSMOS_CONNECTION_STRING, EMAIL_HASH_SALT"
    }
  ],
  "timestamp": "2025-11-04T12:34:56.789Z"
}
```

**Checks Performed:**
1. Environment variables (`COSMOS_CONNECTION_STRING`, `EMAIL_HASH_SALT`)
2. *(Future)* Cosmos DB connectivity with 1s timeout
3. *(Future)* Redis connectivity with 1s timeout

**HTTP Status:**
- `200` - All checks passed, ready to serve traffic
- `503` - One or more checks failed, not ready

**Use Cases:**
- Pre-traffic validation after deployment
- Load balancer health checks (when supported)
- Manual dependency verification
- Debugging configuration issues

**Implementation:** `functions/src/shared/routes/ready.ts`

**Calling Example:**
```bash
# Get function key
FUNC_KEY=$(az functionapp keys list -g <RG> -n <FUNC_APP> \
  --query "functionKeys.default" -o tsv)

# Check readiness
curl "https://<FUNC_APP>.azurewebsites.net/api/ready?code=$FUNC_KEY"
```

---

## CI/CD Integration

### Deployment Workflow

The GitHub Actions workflow (`.github/workflows/deploy-asora-function-dev.yml`) uses the following strategy:

1. **Deploy package** to Azure Storage and trigger publish
2. **Restart** the function app to ensure fresh start
3. **Validate app settings** (extension version, runtime, Key Vault refs)
4. **Probe `/api/health`** with exponential backoff (30 attempts, up to 60s sleep)
   - Success (200) → Deployment complete
   - Failure (500/503) → Stream logs and fail deployment
5. **Validate `/api/health` response** (check required fields)
6. **Run cold-start regression test** (3-minute probe to catch intermittent issues)

### Health Probe Implementation

```bash
PASSED=0
for i in $(seq 1 30); do
  RESPONSE=$(curl -sS "$HEALTH_URL" 2>&1 || echo "connection-failed")
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
  
  echo "probe $i/$30: http=$CODE"
  
  if [ "$CODE" = "200" ]; then
    echo "✅ Health check passed"
    PASSED=1
    break
  elif [ "$CODE" = "500" ] || [ "$CODE" = "503" ]; then
    echo "⚠️  Server error response:"
    echo "$RESPONSE" | head -20
  fi
  
  # Exponential backoff: 2s, 4s, 6s, ..., up to 60s max
  SLEEP_TIME=$((i * 2))
  if [ $SLEEP_TIME -gt 60 ]; then SLEEP_TIME=60; fi
  sleep $SLEEP_TIME
done
```

**Why Exponential Backoff?**
- Early probes can hit the host before it's fully initialized
- Gives the runtime more time to stabilize after restart
- Reduces flakiness from cold starts or RBAC propagation delays

---

## Defensive Startup Pattern

The entrypoint (`functions/src/index.ts`) ensures `/api/health` is always available:

```typescript
// 1. Import health synchronously (always registers)
import './shared/routes/health';
import './shared/routes/ready';

// 2. Lazy-load other routes asynchronously with error handling
async function registerFeatureRoutes() {
  const tryImport = async (label, loader) => {
    try {
      await loader();
      console.log(`[routes] loaded: ${label}`);
    } catch (err) {
      console.error(`[routes] failed to load ${label}:`, err.message);
    }
  };

  await Promise.all([
    tryImport('auth', () => import('./auth')),
    tryImport('feed', () => import('./feed')),
    // ...
  ]);
}

void registerFeatureRoutes();
```

**Key Points:**
- Health/ready routes import synchronously (no `await`)
- Feature routes import asynchronously and catch errors
- Failures in feature modules don't crash the host
- Health endpoint serves 200 even if auth/feed/moderation fail

---

## Troubleshooting 500 Errors

If `/api/health` returns 500 during deployment:

### 1. Check App Settings

```bash
az functionapp config appsettings list -g <RG> -n <FUNC_APP> -o table
```

**Required Settings:**
- `FUNCTIONS_EXTENSION_VERSION=~4`
- `FUNCTIONS_WORKER_RUNTIME` should **NOT** be set (Flex requirement)
- `EMAIL_HASH_SALT` → Key Vault reference
- `COSMOS_CONNECTION_STRING` → Key Vault reference

### 2. Stream Logs

```bash
az functionapp log tail -g <RG> -n <FUNC_APP>
```

Look for:
- Module load errors (missing dependencies, syntax errors)
- Key Vault access denied (RBAC not propagated)
- Cosmos connection failures (wrong connection string, firewall)

### 3. Query Application Insights

```bash
az monitor app-insights query \
  --app <FUNC_APP> \
  --resource-group <RG> \
  --analytics-query "union exceptions, traces | where timestamp > ago(10m) | order by timestamp desc | take 50"
```

### 4. Verify Node Runtime

```bash
az functionapp show -g <RG> -n <FUNC_APP> \
  --query "siteConfig.linuxFxVersion" -o tsv
```

Should return: `Node|20` or similar

### 5. Check Key Vault Access

```bash
az keyvault show -n <VAULT_NAME> -g <RG> \
  --query "properties.accessPolicies[?objectId=='<FUNCTION_APP_PRINCIPAL_ID>']"
```

Ensure function app's managed identity has `Get` + `List` permissions.

---

## Testing

### Unit Tests

```bash
cd functions
npm test -- --testPathPattern="health|ready"
```

- `tests/shared/health.test.ts` - 4 tests covering response format, headers, uptime
- `tests/shared/ready.test.ts` - 5 tests covering env checks, 200/503 responses

### Local Testing

```bash
cd functions
npm start  # Starts Functions host on port 7072

# In another terminal
curl http://localhost:7072/api/health
curl "http://localhost:7072/api/ready?code=<local_function_key>"
```

### Production Validation

```bash
# Health (anonymous)
curl https://asora-function-dev.azurewebsites.net/api/health

# Ready (requires key)
FUNC_KEY=$(az functionapp keys list -g asora-psql-flex -n asora-function-dev \
  --query "functionKeys.default" -o tsv)
curl "https://asora-function-dev.azurewebsites.net/api/ready?code=$FUNC_KEY"
```

---

## Best Practices

### DO ✅

- Keep `/api/health` static with **zero external dependencies**
- Return 200 from `/api/health` as long as the process can execute code
- Put dependency checks in `/api/ready` with tight timeouts (≤1s)
- Use exponential backoff in deployment probes
- Stream logs when health checks fail to diagnose root cause
- Validate app settings before deployment

### DON'T ❌

- Don't add DB/cache/auth checks to `/api/health` (use `/api/ready` instead)
- Don't use short, fixed-interval probes (causes false negatives on cold starts)
- Don't set `FUNCTIONS_WORKER_RUNTIME` on Flex apps (breaks runtime detection)
- Don't block deployments on transient dependency issues (separate liveness from readiness)

---

## References

- [Azure Functions health checks](https://learn.microsoft.com/en-us/azure/azure-functions/functions-best-practices#health-endpoint)
- [Kubernetes liveness vs readiness probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Functions v4 programming model](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [Flex Consumption plan](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan)
