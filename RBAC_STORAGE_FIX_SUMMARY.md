# RBAC Storage Fix Summary

## Issue
GitHub Actions workflow failed with "required permissions" error when uploading blobs to Azure Storage using `--auth-mode login`.

## Root Cause
Two GitHub OIDC service principals exist, but only one had Storage Blob Data Contributor role:

1. **github-actions-asora-deployer**
   - App ID: `06c8564f-030d-414f-a552-678d756f9ec3`
   - Object ID: `6d9e43cf-c68a-4e1e-bd29-441e9e32e256`
   - ✅ Granted RBAC: 2025-10-16T18:32:40Z

2. **gh-deployer** (actively used by workflow)
   - App ID: `e9835371-8877-47a5-be8f-e0995d173cb4`
   - Object ID: `fc575cee-fef6-412b-9e0d-7d93d9d31eea`
   - ✅ Granted RBAC: 2025-10-16T19:35:39Z

## Resolution

### RBAC Grants
Both service principals now have Storage Blob Data Contributor on `asoraflexdev1404`:

```bash
az role assignment create \
  --assignee-object-id "6d9e43cf-c68a-4e1e-bd29-441e9e32e256" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.Storage/storageAccounts/asoraflexdev1404"

az role assignment create \
  --assignee-object-id "fc575cee-fef6-412b-9e0d-7d93d9d31eea" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.Storage/storageAccounts/asoraflexdev1404"
```

### Workflow Improvements
- Added RBAC verification step that checks assignment exists before deployment
- Added 90-second RBAC propagation wait (60s for read, 30s for write)
- Added diagnostic logging to show which OIDC identity is being used

## RBAC Propagation
Azure RBAC permissions can take **5-10 minutes** to fully propagate. The workflow now:
1. Verifies RBAC assignment exists in Azure AD
2. Tests read access with retry logic
3. Waits additional time for write permissions to propagate
4. Proceeds with blob upload

## Next Steps
- Wait 5-10 minutes for RBAC to fully propagate
- Re-run the GitHub Actions workflow
- The deployment should now succeed

## Verification
Check current RBAC assignments:
```bash
az role assignment list \
  --scope "/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.Storage/storageAccounts/asoraflexdev1404" \
  --query "[?principalId=='fc575cee-fef6-412b-9e0d-7d93d9d31eea'].{role:roleDefinitionName}" -o table
```

Expected output:
```
Role
-----------------------------
Storage Blob Data Contributor
```

## Files Modified
- `.github/workflows/deploy-asora-function-dev.yml` - Added RBAC verification and propagation wait
- `grant-oidc-storage-rbac.sh` - Helper script for manual RBAC grants (one-time use)
