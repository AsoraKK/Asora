# Azure Functions Platform Failure (RESOLVED)

**Date:** October 8, 2025  
**Status:** RESOLVED - Was Worker Indexing issue, not platform failure  
**Severity:** User Error (misunderstanding of SKU null)  

## Summary

The "platform failure" was actually a **configuration issue** with Worker Indexing on Y1 Consumption plan. The `SKU: null` response from `az functionapp show` is **normal for Function Apps** and does not indicate a platform outage.

**Root Cause:** Attempting to use v4 JS programming model with Worker Indexing on Y1 (Windows Consumption), which is brittle and fails to index functions, resulting in 503 errors.

**Resolution:** Switched to classic function.json-based HTTP function, deployed via config-zip, and verified 200 response.

## Evidence

### Before Fix
- All apps showed `SKU: null` in CLI (normal behavior)
- Y1 app returned 503 on /api/health
- ZIP deploy failed with "Bad Request" on trigger sync
- No telemetry in Application Insights

### After Fix
- ✅ Y1 app returns **HTTP/2 200** on /api/health
- ✅ Classic function.json model deployed successfully
- ✅ No Worker Indexing required
- ✅ Config-zip deployment works without SAS tokens

## Key Learnings

1. **`SKU: null` is normal** - Azure CLI shows null for Function Apps; use `az appservice plan show` for actual SKU
2. **Y1 (Consumption) ≠ Flex** - Y1 requires classic function.json, not v4 programming model with Worker Indexing
3. **Avoid user-delegation SAS** - Use config-zip or shared-key SAS for WEBSITE_RUN_FROM_PACKAGE
4. **Worker Indexing brittle on Y1** - Classic model indexes immediately and reliably

## Configuration Applied

### App Settings (Y1 Consumption)
```bash
AzureWebJobsStorage="<full connection string>"
FUNCTIONS_EXTENSION_VERSION="~4"
FUNCTIONS_WORKER_RUNTIME="node"
WEBSITE_NODE_DEFAULT_VERSION="~18"
AzureWebJobsFeatureFlags=""  # Disabled Worker Indexing
WEBSITE_RUN_FROM_PACKAGE=""  # Disabled
WEBSITE_SKIP_CONTENTSHARE=""  # Disabled
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

## Verification

```bash
$ curl -i https://asora-function-consumption.azurewebsites.net/api/health
HTTP/2 200
content-type: text/plain; charset=utf-8
date: Wed, 08 Oct 2025 18:58:19 GMT
server: Kestrel
```

## Related Documents

- `Y1_CONFIGURATION_STATUS.md` - Updated with successful deployment
- `AZURE_FUNCTIONS_IDENTITY_STORAGE_MIGRATION.md` - Flex troubleshooting (separate issue)
- CI/CD pipelines should now pass (host.json version fixed to 2.0)

## Timeline

- **Oct 8, 17:55 UTC**: Created Y1 app with correct settings
- **Oct 8, 19:55 UTC**: Discovered 503 errors, assumed platform issue
- **Oct 8, 20:15 UTC**: Applied classic function.json fix
- **Oct 8, 20:58 UTC**: Verified 200 response - RESOLVED

---

**Status:** ✅ RESOLVED - Y1 app serving traffic successfully
- `FUNCTIONS_EXTENSION_VERSION`: "~4"
- `FUNCTIONS_WORKER_RUNTIME`: "node"
- `AzureWebJobsFeatureFlags`: "EnableWorkerIndexing"

✅ Package structure correct:
- `host.json` with `"version": "4.0"` + extension bundle
- `package.json` with `@azure/functions` ^4
- `index.js` with Node v4 handler format (request, context)
- `node_modules/` at root level

❌ Result: 503 Service Unavailable, SKU: null

### Flex Consumption (asora-function-dev)

✅ Managed Identity configured
✅ Storage Blob Data Contributor RBAC granted
✅ AzureWebJobsStorage identity-based auth configured
✅ Deployment storage container URI set via ARM API

❌ Result: 502 Bad Gateway, SKU: null

## Root Cause

**Platform Issue:** Azure Resource Manager is not correctly setting or returning the SKU property for Function Apps in this subscription/region. This renders the apps non-functional because:

1. The Functions runtime cannot determine the hosting plan type
2. Trigger sync fails during deployment
3. Workers fail to initialize
4. Deployment operations return "Bad Request"

## Impact

- **Zero working Function Apps** in the subscription
- Cannot deploy any code (Y1, Flex, Premium)
- Existing apps that may have worked previously are now broken
- All debugging/troubleshooting effort is blocked by platform failure

## Attempted Mitigations (All Failed)

1. ✅ Created fresh Y1 app → SKU: null
2. ✅ Deleted and recreated Flex app → SKU: null
3. ✅ Configured all required settings → No effect
4. ✅ Used ARM API instead of CLI → No effect
5. ✅ Corrected package structure → No effect
6. ✅ Added extension bundle to host.json → No effect
7. ✅ Tried ZIP deploy instead of RUN_FROM_PACKAGE → Fails with "Bad Request"

## Recommended Actions

### Immediate (Next 1 Hour)

1. **Open Azure Support Ticket (Priority 1)**
   - Title: "All Function Apps show SKU: null - Platform Failure"
   - Subscription: `99df7ef7-776a-4235-84a4-c77899b2bb04`
   - Resource Group: `asora-psql-flex`
   - Region: North Europe
   - Affected Resources: ALL function apps in RG
   - Impact: Production service outage
   - Attach this document

2. **Try Different Region**
   ```bash
   # Create test RG in another region (West Europe)
   az group create -n asora-test-we -l westeurope
   
   # Create Y1 app in West Europe
   az functionapp create \
     -g asora-test-we \
     -n asora-test-$(date +%s) \
     --consumption-plan-location westeurope \
     --runtime node \
     --runtime-version 20 \
     --functions-version 4 \
     --storage-account <storage-name>
   
   # Check if SKU is set correctly
   az functionapp show -g asora-test-we -n asora-test-XXX --query "{SKU:sku}"
   ```

3. **Try Different Subscription (if available)**
   - Deploy identical Y1 app in another Azure subscription
   - Verify if issue is subscription-specific or global

### Short-term (Next 24 Hours)

1. **Azure Status Page**
   - Check: https://status.azure.com/status
   - Filter: Azure Functions, North Europe
   - Look for known incidents

2. **Alternative Hosting**
   - Consider Azure Container Apps as temporary workaround
   - Deploy Node.js app to Azure App Service (Web Apps)
   - Use Azure Static Web Apps + Managed Functions

3. **Monitor Ticket Progress**
   - Escalate if no response within 4 hours
   - Request callback from Azure Functions engineering team

### Long-term (Next Week)

1. **Multi-Region Strategy**
   - Once platform issue resolved, deploy to 2+ regions
   - Use Traffic Manager for failover
   - Implement health checks and auto-failover

2. **Hosting Plan Diversity**
   - Don't rely solely on Consumption/Flex
   - Maintain Premium (EP1) instance for critical functions
   - Document SKU verification as deployment gate

## Verification Commands

```bash
# Check if issue is resolved
for app in asora-function-consumption asora-function-dev asora-function-test asora-function-flex; do
  echo "=== $app ==="
  az functionapp show -g asora-psql-flex -n $app --query "{SKU:sku,State:state}" -o json | jq .
done

# Expected output when fixed:
# asora-function-consumption → SKU: "Dynamic"
# asora-function-dev → SKU: "FlexConsumption" or specific FC SKU
```

## Related Documents

- `AZURE_FUNCTIONS_IDENTITY_STORAGE_MIGRATION.md` - Initial Flex troubleshooting
- `FLEX_RECREATION_COMPLETE.md` - Flex app recreation attempt
- `Y1_CONFIGURATION_STATUS.md` - Y1 app configuration attempt
- `AZURE_FUNCTIONS_V4_PITFALLS.md` - Historical issues and solutions

## Timeline

- **Oct 7, 2025**: Initial Flex app 502 errors observed
- **Oct 8, 17:00 UTC**: Deleted broken Flex app, recreated resources
- **Oct 8, 17:55 UTC**: Created Y1 app with all correct settings
- **Oct 8, 19:55 UTC**: Discovered all apps have SKU: null
- **Oct 8, 20:00 UTC**: Confirmed platform issue affects all apps in RG

## Key Takeaway

**This is NOT a configuration issue.** All documented Azure Functions best practices have been followed. The platform itself is failing to correctly provision or report SKU information, rendering the entire Functions service unusable in this resource group.

---

**Next Update:** After Azure Support response or successful deployment in alternate region.
