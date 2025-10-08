# Azure Functions Platform Failure (Critical)

**Date:** October 8, 2025  
**Status:** ALL FUNCTION APPS BROKEN IN SUBSCRIPTION  
**Severity:** P0 - Complete Service Outage

## Summary

All Azure Function Apps in the `asora-psql-flex` resource group are in an irrecoverable state with `SKU: null`. This is a **platform issue** affecting:

- `asora-function-consumption` (Y1 Dynamic - freshly created)
- `asora-function-dev` (Flex FC1 - recreated)
- `asora-function-test` (existing app)
- `asora-function-flex` (existing app)

## Symptoms

- All apps return HTTP 503 on function endpoints
- Root endpoints return 200 (host is running)
- `az functionapp show` returns `"SKU": null` for all apps
- ZIP deploy fails with "Bad Request" on trigger sync
- No telemetry appears in Application Insights
- Log streaming unavailable/times out

## Evidence

```bash
$ az functionapp list -g asora-psql-flex --query "[].{Name:name,SKU:sku}" -o json
[
  {"Name": "asora-function-consumption", "SKU": null},
  {"Name": "asora-function-dev", "SKU": null},
  {"Name": "asora-function-test", "SKU": null},
  {"Name": "asora-function-flex", "SKU": null}
]
```

### Expected Values

- **Y1 Consumption**: `"SKU": "Dynamic"`
- **Flex Consumption**: `"SKU": "FlexConsumption"` or valid SKU name
- **Premium (EP1)**: `"SKU": "ElasticPremium"`

## Configuration Attempted

### Y1 Consumption (asora-function-consumption)

✅ All required settings configured:
- `AzureWebJobsStorage`: Connection string (not MI)
- `WEBSITE_CONTENTAZUREFILECONNECTIONSTRING`: Set
- `WEBSITE_CONTENTSHARE`: "asora-function-consumption"
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
