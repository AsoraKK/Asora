# Health Endpoint Returns 500 - Runbook

## Symptom
The `/api/health` endpoint returns HTTP 500 instead of 200.

## Quick Checks

### 1. Verify Package Deployment
```bash
# Check last deployment time and status
az functionapp show -g asora-psql-flex -n asora-function-dev \
  --query "{name:name, state:state, lastModified:properties.lastModifiedTimeUtc}" -o table

# Confirm package exists in storage (if using storage-based deployment)
DEPLOY_VALUE=$(az functionapp show -g asora-psql-flex -n asora-function-dev \
  --query "properties.functionAppConfig.deployment.storage.value" -o tsv)
echo "Deployment storage: $DEPLOY_VALUE"

# List recent blobs
STG=$(echo "$DEPLOY_VALUE" | sed -n 's#https://\([^.]*\)\.blob\.core\.windows\.net/.*#\1#p')
CONT=$(echo "$DEPLOY_VALUE" | sed -n 's#https://[^/]*/\([^?]*\).*#\1#p')
az storage blob list --account-name "$STG" --container-name "$CONT" \
  --auth-mode login --query "[].{name:name, lastModified:properties.lastModified}" -o table
```

**Fix**: Re-run the deployment workflow if package is missing or stale.

---

### 2. Validate Key Vault Resolution
```bash
# Check if secrets are configured as Key Vault references
az functionapp config appsettings list -g asora-psql-flex -n asora-function-dev \
  --query "[?name=='EMAIL_HASH_SALT' || name=='COSMOS_CONNECTION_STRING'].{name:name, value:value}" -o table

# Verify managed identity has Key Vault access
PRINCIPAL_ID=$(az functionapp identity show -g asora-psql-flex -n asora-function-dev --query principalId -o tsv)
KV_NAME="asora-kv-dev"  # Replace with actual Key Vault name
az keyvault show -n "$KV_NAME" --query properties.accessPolicies \
  | jq ".[] | select(.objectId==\"$PRINCIPAL_ID\")"
```

**Fix**: If references are missing or identity lacks access:
```bash
# Wire Key Vault references
bash .github/scripts/wire-keyvault-secrets.sh asora-psql-flex asora-function-dev asora-kv-dev

# Grant Key Vault access to managed identity
az keyvault set-policy -n asora-kv-dev -g asora-psql-flex \
  --object-id "$PRINCIPAL_ID" \
  --secret-permissions get list
```

---

### 3. Check Cold-Start Logs
```bash
# Tail live logs from App Insights (requires AI CLI or portal)
# OR use Azure CLI to fetch recent logs
az monitor app-insights query \
  --app asora-ai-dev \
  --analytics-query "traces | where timestamp > ago(10m) | where message contains 'health' or customDimensions.FunctionName == 'health' | order by timestamp desc | take 50" \
  --query "tables[0].rows" -o table

# Check for cold-start errors in the past hour
az monitor app-insights query \
  --app asora-ai-dev \
  --analytics-query "exceptions | where timestamp > ago(1h) | where outerMessage contains 'health' or operation_Name == 'health' | project timestamp, outerMessage, innermostMessage" -o table
```

**Fix**: If errors mention missing config (e.g., `COSMOS_CONNECTION_STRING missing`), follow step 2. If unrelated errors, investigate stack traces.

---

### 4. Route Protection (Health Should Be Unwrapped)
```bash
# Verify health endpoint is NOT wrapped by rate-limit middleware
# Check source: functions/src/shared/routes/health.ts should register the plain handler
grep -A 5 "app.http('health'" functions/src/shared/routes/health.ts

# Expected:
#   handler: health,  <-- NOT rateLimitedHealth
```

**Fix**: If health is wrapped by `withRateLimit`, remove it:
```typescript
// BAD
const rateLimitedHealth = withRateLimit(health, ...);
app.http('health', { ..., handler: rateLimitedHealth });

// GOOD
app.http('health', { ..., handler: health });
```

Rebuild and redeploy.

---

## Root Causes (Historical)

1. **Rate-limit middleware dependency**: Health was wrapped by `withRateLimit`, which required `EMAIL_HASH_SALT` and Cosmos. Removed in commit `1e48975`.
2. **Missing Key Vault references**: `EMAIL_HASH_SALT` and `COSMOS_CONNECTION_STRING` were hardcoded or missing. Wired as KV refs in latest deployment.
3. **Deployment not picked up**: Package uploaded to storage but host didn't restart. Added explicit restart + retry logic.
4. **Cold-start timeout**: Health endpoint took too long during cold starts due to Cosmos/KV calls. Made health fully static (no external deps).

---

## Prevention

- **IaC enforcement**: Ensure `RATE_LIMITS_ENABLED=true` and KV refs are set via Bicep/ARM templates, not ad-hoc CLI.
- **CI regression test**: 3-minute cold-start probe runs on every deploy (see workflow step "Health endpoint cold-start regression test").
- **App Insights alert**: 5xx rate >1% over 5 minutes triggers PagerDuty/email.
- **Dashboard tile**: Shows last health status, version (GIT_SHA), and deploy timestamp.

---

## Escalation

If health still returns 500 after these checks:
1. Capture full response: `curl -i https://asora-function-dev.azurewebsites.net/api/health`
2. Check App Insights live metrics for real-time errors
3. Verify `functionAppConfig` runtime settings: `az functionapp show -g asora-psql-flex -n asora-function-dev --query properties.functionAppConfig`
4. Contact platform team if Flex-specific issue (e.g., ARM publish failures).
