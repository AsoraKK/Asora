# Quick Moderation API Troubleshooting Guide

## TL;DR - Are the APIs working?

The Hive AI and Azure Content Safety moderation APIs are **fully implemented and tested**, but they require proper environment configuration to run.

### Quick Check (2 minutes)

```bash
# 1. Verify Hive client unit tests pass
cd /home/kylee/asora/functions
npm test -- --testPathPattern="hive-client.comprehensive"

# Expected: ✅ 31 tests passed

# 2. Run diagnostic script (requires API keys)
cd /home/kylee/asora
HIVE_API_KEY=$YOUR_HIVE_KEY ACS_ENDPOINT=$YOUR_ACS_ENDPOINT ACS_KEY=$YOUR_ACS_KEY \
  node test-apis-diagnostics.js

# Expected: ✅ HIVE API is OPERATIONAL
```

---

## Symptoms and Solutions

### ❌ Posts being created without moderation check

**Reason**: `HIVE_API_KEY` environment variable not set  
**Check**: `echo $HIVE_API_KEY`  
**Fix**: Set in Azure Functions app settings  

### ❌ "HIVE API error: 401 Unauthorized"

**Reason**: Invalid or expired API key  
**Check**: Verify key with Hive AI dashboard  
**Fix**: Update `HIVE_API_KEY` in app settings  

### ❌ "HIVE API request timed out"

**Reason**: Slow network or Hive API overloaded  
**Check**: Run diagnostic script to isolate  
**Workaround**: Increase timeout in `hiveClientConfig`  

### ⚠️ Moderation seems slow

**Expected**: 200-500ms per request  
**High retry rate?**: Check for transient 429/500 errors  
**Fix**: Verify network connectivity and Hive API status  

---

## Configuration Setup (5 minutes)

### Step 1: Get Hive API Key

1. Go to https://dashboard.thehive.ai
2. Navigate to API Keys section
3. Copy your API key

### Step 2: Set Environment Variable (Local Development)

Create/update `functions/local.settings.json`:

```json
{
  "Values": {
    "HIVE_API_KEY": "your_hive_api_key_here",
    "ACS_ENDPOINT": "https://yourregion.api.cognitive.microsoft.com",
    "ACS_KEY": "your_azure_content_safety_key",
    "MODERATION_FALLBACK": "true"
  }
}
```

### Step 3: Set in Azure Functions (Production)

```bash
# Using Azure CLI
az functionapp config appsettings set \
  --resource-group <your-resource-group> \
  --name <your-function-app-name> \
  --settings HIVE_API_KEY="your_hive_api_key_here"

# Or use Azure Portal:
# Function App > Configuration > Application settings > + New application setting
```

### Step 4: Verify in Azure Key Vault (Recommended)

```bash
# Store in Key Vault
az keyvault secret set \
  --vault-name <your-vault-name> \
  --name HiveApiKey \
  --value "your_hive_api_key_here"

# Reference in Function App settings:
# HIVE_API_KEY = @Microsoft.KeyVault(SecretUri=https://your-vault.vault.azure.net/secrets/HiveApiKey/)
```

---

## Testing the Integration

### Run Full Post Creation Test

```bash
cd /home/kylee/asora/functions
HIVE_API_KEY=test-key npm test -- --testPathPattern="createPost"

# Expected: ✅ 20 tests passed
```

### Test Specific Scenarios

```bash
# Test with no API key (should skip moderation)
HIVE_API_KEY="" npm test -- --testPathPattern="createPost"

# Test with invalid key (should error gracefully)
HIVE_API_KEY="invalid-key" npm test -- --testPathPattern="createPost"
```

---

## Monitoring

### Check Logs in Azure Functions

```bash
az functionapp log tail \
  --resource-group <rg> \
  --name <function-app-name> \
  --follow
```

Look for:
```
[moderation] Content moderation complete
[moderation] Moderation check failed
[moderation] Auto-moderation disabled by config
```

### Application Insights Query

```kusto
// Get moderation events
customEvents 
| where name == "moderation_error"
| project timestamp, tostring(customDimensions.errorCode), customDimensions.message
| limit 100
```

---

## Common Configuration Issues

| Issue | Check | Fix |
|-------|-------|-----|
| Moderation skipped | `HIVE_API_KEY` set? | Set in app settings |
| 401 Unauthorized | API key valid? | Update key in Azure |
| 429 Rate limited | Too many requests? | Increase retry delay |
| Timeout errors | Network slow? | Increase timeout to 15000ms |
| Fallback not working | `ACS_*` set? | Add Azure Content Safety creds |

---

## Code Locations Reference

| Purpose | File | Lines |
|---------|------|-------|
| Hive client | `functions/shared/hive-client.ts` | 560 |
| Post moderation | `functions/src/posts/service/moderationUtil.ts` | 253 |
| Flag service (AI analysis) | `functions/src/moderation/service/flagService.ts` | 424 |
| Azure Content Safety fallback | `functions/shared/acs-client.ts` | 60 |
| Unit tests | `functions/tests/shared/hive-client.comprehensive.test.ts` | 573 |

---

## Additional Resources

- 📖 [Full Status Report](./MODERATION_API_STATUS.md)
- 🧪 [Diagnostic Script](./test-apis-diagnostics.js)
- 📝 [Old Test Script](./test-hive-api.js) *(deprecated endpoint - for reference only)*
- 🔍 [Hive AI Documentation](https://docs.thehive.ai/docs)
- 🔍 [Azure Content Safety Docs](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/)

---

## Support

If APIs are still not working after following these steps:

1. ✅ Verify all environment variables are set
2. ✅ Run diagnostic script to isolate the issue
3. ✅ Check Azure Functions runtime logs
4. ✅ Verify network can reach `api.thehive.ai`
5. ✅ Contact Hive AI support with error codes from logs

---

**Last Updated**: 2026-01-18  
**Code Status**: ✅ All tests passing, configuration-dependent
