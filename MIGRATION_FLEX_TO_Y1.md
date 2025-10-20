# Migration from Flex Consumption to Linux Consumption Y1

**Date:** 2025-10-20  
**Reason:** Azure Functions Flex Consumption storage-based deployment has unresolved issues with Node.js v4 function discovery

## Summary

After extensive troubleshooting of Flex Consumption deployment (see `FLEX_DEPLOYMENT_TROUBLESHOOTING.md`), we're migrating to the more stable **Linux Consumption (Y1)** plan with zip deploy.

## Prerequisites

### Create New Function App (Y1 Linux Consumption)

```bash
RG="asora-psql-flex"
APP_NAME="asora-function-y1-linux"
STORAGE="asoraflexdev1404"
LOCATION="northeurope"

# Create Linux Consumption Function App
az functionapp create \
  --resource-group "$RG" \
  --name "$APP_NAME" \
  --storage-account "$STORAGE" \
  --consumption-plan-location "$LOCATION" \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --os-type Linux \
  --disable-app-insights false

# Enable system-assigned managed identity
az functionapp identity assign \
  --resource-group "$RG" \
  --name "$APP_NAME"

# Configure app settings
az functionapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP_NAME" \
  --settings \
    FUNCTIONS_EXTENSION_VERSION="~4" \
    FUNCTIONS_WORKER_RUNTIME="node"
```

### Grant RBAC for Deployment

The GitHub Actions workflow uses Azure/functions-action@v1 which requires publish profile or RBAC permissions:

**Option A: Using OIDC (Recommended)**
```bash
# The gh-deployer service principal needs "Website Contributor" or "Contributor"
# on the Function App resource
FUNC_APP_ID=$(az functionapp show -g "$RG" -n "$APP_NAME" --query id -o tsv)
SP_OBJ_ID="fc575cee-fef6-412b-9e0d-7d93d9d31eea"  # gh-deployer object ID

az role assignment create \
  --assignee-object-id "$SP_OBJ_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Website Contributor" \
  --scope "$FUNC_APP_ID"
```

**Option B: Using Publish Profile (Fallback)**
```bash
# Download publish profile and add as GitHub secret
az functionapp deployment list-publishing-profiles \
  --resource-group "$RG" \
  --name "$APP_NAME" \
  --xml > profile.xml

# Then add content of profile.xml as GitHub secret:
# AZURE_FUNCTIONAPP_PUBLISH_PROFILE_Y1
```

## Deployment Workflow

The new workflow `.github/workflows/deploy-asora-function-consumption-y1.yml` uses:

1. **Azure/functions-action@v1** - Official GitHub Action for Function deployment
2. **Zip Deploy** - Stable deployment method with Kudu support
3. **OIDC Authentication** - No secrets needed (uses federated credentials)

### Key Differences from Flex

| Aspect | Flex Consumption | Y1 Linux Consumption |
|--------|------------------|---------------------|
| Deployment | Storage blob + ARM API | Zip deploy (Kudu) |
| Authentication | System MI → Storage | OIDC → Function App |
| Discovery | Via deployment.storage | Automatic on deploy |
| Logs | Limited (no Kudu) | Full access via SCM site |
| Stability | ❌ Brittle for Node v4 | ✅ Proven stable |
| Cost | ~same | ~same |
| Cold start | Slightly faster | Standard |

## Migration Steps

### 1. Create Y1 Function App
Run the prerequisite commands above to create the new Function App.

### 2. Configure GitHub Environment
No changes needed - workflow uses existing `dev` environment with OIDC variables.

### 3. Update Deployment Workflow
The new workflow is ready at `.github/workflows/deploy-asora-function-consumption-y1.yml`.

To activate it, either:
- **Option A**: Rename files to swap workflows
  ```bash
  mv .github/workflows/deploy-asora-function-dev.yml .github/workflows/deploy-asora-function-flex-DISABLED.yml
  mv .github/workflows/deploy-asora-function-consumption-y1.yml .github/workflows/deploy-asora-function-dev.yml
  ```

- **Option B**: Update `on.push.branches` in both files to control which deploys

### 4. Test Deployment
```bash
# Trigger workflow manually or push to main
gh workflow run deploy-asora-function-consumption-y1.yml

# Monitor
gh run watch

# Verify
curl https://asora-function-y1-linux.azurewebsites.net/health
```

### 5. Update DNS/Frontend (if needed)
If using custom domains or the Flutter app points to specific Function App URLs, update:
- Frontend API base URL
- Any external integrations
- Monitoring/alerting endpoints

### 6. Decommission Flex App (after validation)
```bash
# After Y1 is stable for >24 hours
az functionapp delete \
  --resource-group asora-psql-flex \
  --name asora-function-dev
```

## Rollback Plan

If Y1 deployment fails:
1. Re-enable Flex workflow
2. Check Function App exists and is running
3. Manually trigger sync: `az rest --method post --uri ".../syncfunctiontriggers"`
4. File Azure support ticket with `FLEX_DEPLOYMENT_TROUBLESHOOTING.md`

## Post-Migration Validation

- [ ] Health endpoint returns 200: `curl https://asora-function-y1-linux.azurewebsites.net/health`
- [ ] Functions listed: `az functionapp function list -g asora-psql-flex -n asora-function-y1-linux`
- [ ] Logs accessible: `az webapp log tail -g asora-psql-flex -n asora-function-y1-linux`
- [ ] Feed endpoint works: `curl https://asora-function-y1-linux.azurewebsites.net/feed?limit=10`
- [ ] Deployment succeeds in <5 minutes consistently

## Known Issues & Workarounds

### Issue: Functions Action requires publish profile
**Workaround**: Grant "Website Contributor" RBAC to gh-deployer SP on Function App resource

### Issue: Cold start latency
**Workaround**: Consider Azure Functions Premium plan if cold starts become problematic

## References

- [Azure Functions Consumption Plan](https://learn.microsoft.com/en-us/azure/azure-functions/consumption-plan)
- [Azure Functions GitHub Action](https://github.com/Azure/functions-action)
- [Node.js v4 Programming Model](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=javascript%2Cwindows%2Cazure-cli&pivots=nodejs-model-v4)
- [Flex Troubleshooting](./FLEX_DEPLOYMENT_TROUBLESHOOTING.md)
