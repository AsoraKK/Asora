# Deploy Hive API Fix to Production

## Overview

The Hive moderation API has been fixed and tested. Follow these steps to deploy to production.

---

## Pre-Deployment Checklist ✓

- [x] Fixed authentication header (Bearer → Token)
- [x] Updated request/response formats for Hive v2 API
- [x] All 31 unit tests passing
- [x] Integration tests passing (20/20)
- [x] Live API connection verified
- [x] No breaking changes to external APIs
- [x] Error handling intact
- [x] Fallback system still functional

---

## Deployment Steps

### Step 1: Verify API Key is in Key Vault

```bash
# Check if Hive text key exists in Key Vault
az keyvault secret list \
  --vault-name kv-asora-dev \
  --query "[?contains(name, 'hive')].name" \
  -o table

# Expected output:
# hive-text-key         ✓
# hive-image-key        ✓
# hive-deepfake-key     ✓
```

### Step 2: Ensure App Settings Reference Key Vault

```bash
# Check if Hive API key app setting exists
az functionapp config appsettings list \
  --resource-group asora-psql-flex \
  --name asora-function-flex \
  --query "[?name=='HIVE_API_KEY']"

# If not present, add it:
az functionapp config appsettings set \
  --resource-group asora-psql-flex \
  --name asora-function-flex \
  --settings HIVE_API_KEY="@Microsoft.KeyVault(SecretUri=https://kv-asora-dev.vault.azure.net/secrets/hive-text-key/)"
```

### Step 3: Deploy Code Changes

```bash
# Option A: Via CI/CD Pipeline (Recommended)
git add functions/shared/hive-client.ts
git add functions/shared/hive-client.d.ts
git add functions/tests/shared/hive-client.comprehensive.test.ts
git commit -m "fix: correct Hive v2 API authentication and request format

- Change auth from Bearer to Token header
- Update request format to use text_data field
- Update response parsing for v2 API structure
- All 31 unit tests passing
- Live API verified working"

git push origin main

# Option B: Manual Deployment
cd /home/kylee/asora/functions
npm run build
# Upload dist/ folder to Function App

# Option C: Using Azure Functions Core Tools
func azure functionapp publish asora-function-flex
```

### Step 4: Verify Deployment

```bash
# Check function is running
az functionapp show \
  --resource-group asora-psql-flex \
  --name asora-function-flex \
  --query "{state:state, url:defaultHostName}"

# Check logs for any errors
az functionapp log tail \
  --resource-group asora-psql-flex \
  --name asora-function-flex \
  --follow

# Look for success messages:
# "[moderation] Content moderation complete"
```

---

## Post-Deployment Validation

### Quick Health Check (5 minutes)

```bash
# 1. Function App is healthy
curl https://asora-function-flex.azurewebsites.net/api/health

# 2. Create a test post (should be moderated)
curl -X POST https://asora-function-flex.azurewebsites.net/api/posts/create \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello, this is a test post",
    "userId": "test-user-123"
  }'

# Expected: Post created with moderation decision in response
```

### Monitor Moderation Events (30 minutes)

```bash
# Check Application Insights for moderation events
az monitor metrics list \
  --resource /subscriptions/{subscriptionId}/resourceGroups/asora-psql-flex/providers/Microsoft.Insights/components/asora-appinsights \
  --metric "customEvents" \
  --start-time 2026-01-18T00:00:00Z \
  --interval PT1M \
  --filter "name eq 'moderation_success'"

# Or run custom query:
az monitor app-insights query \
  --app asora-appinsights \
  --resource-group asora-psql-flex \
  --analytics-query "customEvents | where name == 'moderation_error' | summarize count() by tostring(customDimensions.errorCode)"
```

### Verify Moderation Decisions

```kusto
// Query Application Insights with this KQL
customEvents
| where name == "moderation_complete"
| extend action = tostring(customDimensions.action)
| summarize count() by action
| render columnchart

// You should see:
// action | count
// ALLOW  | xxx
// WARN   | xxx  
// BLOCK  | xxx
```

---

## Rollback Plan

If issues occur after deployment:

### Quick Rollback (< 2 minutes)

```bash
# Revert to previous function app version via Azure Portal
# Function App → Deployment slots → Swap

# Or via CLI:
az functionapp deployment slot swap \
  --resource-group asora-psql-flex \
  --name asora-function-flex \
  --slot staging
```

### Code Rollback

```bash
# Revert commits in git
git revert <commit-hash>
git push origin main

# Re-deploy previous version
func azure functionapp publish asora-function-flex
```

---

## Monitoring Setup (After Deployment)

### Alert: Moderation API Errors

```bash
# Create alert for Hive API errors
az monitor metrics alert create \
  --resource-group asora-psql-flex \
  --name "Hive API Errors" \
  --scopes /subscriptions/{subscriptionId}/resourceGroups/asora-psql-flex/providers/Microsoft.Insights/components/asora-appinsights \
  --condition "avg(moderation_error) > 10" \
  --window-size PT5M \
  --evaluation-frequency PT1M
```

### Alert: Slow Moderation (>1000ms)

```bash
# Create alert for slow API calls
az monitor metrics alert create \
  --resource-group asora-psql-flex \
  --name "Slow Hive API Calls" \
  --scopes /subscriptions/{subscriptionId}/resourceGroups/asora-psql-flex/providers/Microsoft.Insights/components/asora-appinsights \
  --condition "avg(moderation_latency) > 1000" \
  --window-size PT5M \
  --evaluation-frequency PT1M
```

### Dashboard: Moderation Metrics

Add to Azure Dashboard:
- Moderation API latency (p50, p95, p99)
- Error rate by error type
- Success rate by decision (ALLOW/WARN/BLOCK)
- Request volume over time
- API key validation failures

---

## Troubleshooting

### Issue: "Invalid Auth Method" Errors

**Cause:** Old code still running or API key format wrong

**Solution:**
```bash
# Check current code is deployed
az functionapp deployment source show \
  --resource-group asora-psql-flex \
  --name asora-function-flex

# Force redeploy
func azure functionapp publish asora-function-flex --force
```

### Issue: Moderation Latency High (>1s)

**Cause:** Hive API overload or network issues

**Solution:**
```bash
# Check Hive API status
curl -I https://api.thehive.ai/api/v2/task/sync

# Increase timeout
# Edit hive-client.ts: timeoutMs: 15000 (was 10000)
# Re-deploy
```

### Issue: "text_data field required" Errors

**Cause:** Mixed code versions or old cache

**Solution:**
```bash
# Restart function app to clear cache
az functionapp restart \
  --resource-group asora-psql-flex \
  --name asora-function-flex

# Verify code version
curl https://asora-function-flex.azurewebsites.net/api/version
# Should show recent deployment timestamp
```

---

## Success Criteria

Your deployment is successful when:

✅ Function App is running without errors  
✅ At least 10 posts created with moderation decisions  
✅ No "Bearer" auth errors in logs  
✅ No "text_data" field errors  
✅ Moderation latency < 1 second  
✅ Fallback to Azure Content Safety not triggered (normal)  
✅ Dashboard shows ALLOW/WARN/BLOCK distribution  

---

## Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Build & Test | 5 min | `npm run build && npm test` |
| Deploy | 2 min | Push to main, CI/CD runs |
| Warm-up | 1 min | First requests may be slow |
| Validation | 5 min | Quick health checks |
| Monitoring | 30 min | Watch metrics for issues |
| **Total** | **~45 min** | From push to fully validated |

---

## Contact & Support

If you encounter any issues:

1. **Check logs:** `az functionapp log tail`
2. **Review fix summary:** `HIVE_API_FIX_SUMMARY.md`
3. **Test locally:** Run `npm test -- --testPathPattern="hive-client"`
4. **Check Azure Status:** Portal → Function App → Monitor

---

## Files Deployed

```
functions/shared/hive-client.ts          (Core fix)
functions/shared/hive-client.d.ts        (Types)
functions/tests/shared/hive-client.comprehensive.test.ts  (Tests)
dist/shared/hive-client.js               (Compiled)
dist/shared/hive-client.d.ts             (Types)
```

---

**Status:** Ready for Production Deployment  
**Risk Level:** Low (Well-tested, no breaking changes)  
**Estimated Impact:** Immediate moderation availability  
**Last Updated:** January 18, 2026
