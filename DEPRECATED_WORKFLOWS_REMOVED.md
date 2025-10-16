# Deprecated Workflows Removed

**Date:** 2025-10-16  
**Action:** Deleted deprecated Y1 Windows deployment workflows

---

## Files Removed

1. `.github/workflows/deploy-functions-flex.yml`
2. `.github/workflows/deploy-y1-win-ne.yml`

---

## Rationale

Both workflows were marked `[DEPRECATED]` and superseded by `deploy-asora-function-dev.yml`.

### deploy-functions-flex.yml
- Originally deployed to Flex Consumption using Azure Functions Action + Kudu
- Encountered HNS/blob name issues and configuration conflicts
- Superseded by storage-based deployment (upload blob → ARM `/publish`)

### deploy-y1-win-ne.yml
- Deployed to Y1 Windows Consumption plan (`asora-func-y1-win-ne`)
- Used legacy `function.json` approach
- Y1 Windows plan is not actively used

---

## Active Workflow

**Primary:** `.github/workflows/deploy-asora-function-dev.yml`
- **Target:** Flex Consumption plan (`asora-function-dev`)
- **Method:** Storage-based deployment (no Kudu)
  1. Build `dist-func.zip` locally
  2. Upload to blob storage (`deployments/functionapp.zip`)
  3. PATCH functionAppConfig (merge to preserve `deployment.storage`)
  4. ARM POST `/publish` with `packageUri`
  5. Restart Function App to pick up deployment
- **RBAC:**
  - GitHub OIDC: Storage Blob Data Contributor (upload)
  - Function App MI: Storage Blob Data Reader (fetch package)
- **Triggers:** Push to main, workflow_dispatch

---

## References Updated

- `.github/copilot-instructions.md` - Updated to reference `deploy-asora-function-dev.yml`

---

## Historical Documentation

The following docs reference the deleted workflows for historical context (no updates needed):
- `AZURE_OIDC_MIGRATION_GUIDE.md`
- `AZURE_OIDC_MIGRATION_SUMMARY.md`
- `OIDC_MIGRATION_COMPLETE.md`
- `K6_404_RESOLUTION.md`
- `AZURE_FUNCTIONS_IDENTITY_STORAGE_MIGRATION.md`

These remain as-is since they document the evolution of the deployment approach.

---

## Commit

```bash
git rm .github/workflows/deploy-functions-flex.yml \
       .github/workflows/deploy-y1-win-ne.yml

# Updated copilot instructions to reference current workflow
git add .github/copilot-instructions.md

git commit -m "chore: Remove deprecated Y1 Windows workflow files

Removed deploy-functions-flex.yml and deploy-y1-win-ne.yml as both were
marked DEPRECATED and superseded by deploy-asora-function-dev.yml.

Active deployment: deploy-asora-function-dev.yml (Flex Consumption, storage-based)
Updated copilot instructions to reference current workflow."
```
