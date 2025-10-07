# Azure OIDC Migration - Implementation Summary

## ✅ What Has Been Completed (Automated in IDE)

### 1. Workflow Updates

#### deploy-functions-flex.yml
- ✅ Added "Block legacy SP secrets" guard step
- ✅ Already configured with OIDC login using `azure/login@v2`
- ✅ Already has correct `permissions` block with `id-token: write`
- ✅ Already using the three OIDC secrets (CLIENT_ID, TENANT_ID, SUBSCRIPTION_ID)

#### e2e-integration.yml
- ✅ Added "Block legacy SP secrets" guard step
- ✅ Already configured with OIDC login using `azure/login@v2`
- ✅ Already has correct `permissions` block with `id-token: write`
- ✅ Already using the three OIDC secrets

### 2. Documentation Created

- ✅ `AZURE_OIDC_MIGRATION_GUIDE.md` - Comprehensive migration guide
- ✅ `scripts/migrate-to-oidc.sh` - Azure CLI automation script
- ✅ `scripts/migrate-github-secrets.sh` - GitHub secrets management script

### 3. Security Guardrails

Both deployment workflows now have an early guard that will fail if legacy secrets are detected:

```yaml
- name: Block legacy SP secrets
  env:
    AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
    AZURE_CREDENTIALS: ${{ secrets.AZURE_CREDENTIALS }}
  run: |
    if [ -n "${AZURE_CLIENT_SECRET:-}" ] || [ -n "${AZURE_CREDENTIALS:-}" ]; then
      echo "::error::Legacy Azure SP secret present. Migrate to OIDC only." >&2
      exit 1
    fi
```

## 🔧 What You Need to Do (Manual Steps)

### Step 1: Run Azure CLI Migration Script

From your terminal in the repository root:

```bash
bash scripts/migrate-to-oidc.sh
```

This script will:
- Login to Azure with the correct tenant and subscription
- Create/verify federated credentials for main branch and dev environment
- List and optionally delete existing client secrets
- Remove legacy Service Principal role assignments
- Verify the Entra app has correct permissions

**Expected Duration:** 2-3 minutes

### Step 2: Run GitHub Secrets Migration Script

From your terminal in the repository root:

```bash
bash scripts/migrate-github-secrets.sh
```

This script will:
- Verify GitHub CLI is installed and authenticated
- Set the three required OIDC secrets
- Delete legacy secrets (AZURE_CLIENT_SECRET, AZURE_CREDENTIALS)
- Verify final state

**Expected Duration:** 1 minute

**Prerequisites:** 
- GitHub CLI (`gh`) must be installed
- Run `gh auth login` if not already authenticated

### Step 3: Verify and Test

Trigger a test deployment:

```bash
gh workflow run "Deploy Functions (Flex)" --ref main
```

Monitor the workflow:

```bash
gh run watch
```

**Expected Results:**
- ✅ "Block legacy SP secrets" step passes (no secrets found)
- ✅ "Azure login (OIDC)" step succeeds
- ✅ Deployment completes successfully

## 📋 Quick Reference Commands

### Azure CLI Commands (Manual Alternative)

If you prefer to run commands manually instead of using the script:

```bash
# Login
az login --tenant 275643fa-37e0-4f67-b616-85a7da674bea
az account set --subscription 99df7ef7-776a-4235-84a4-c77899b2bb04

# Create federated credentials
APP_ID=06c8564f-030d-414f-a552-678d756f9ec3
SUBJECT='repo:AsoraKK/Asora:ref:refs/heads/main'
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "gha-oidc-repo-AsoraKK-Asora-ref-refs-heads-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "'"$SUBJECT"'",
  "audiences": ["api://AzureADTokenExchange"]
}'

SUBJECT='repo:AsoraKK/Asora:environment:dev'
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "gha-oidc-repo-AsoraKK-Asora-environment-dev",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "'"$SUBJECT"'",
  "audiences": ["api://AzureADTokenExchange"]
}'

# List and delete secrets
az ad app credential list --id 06c8564f-030d-414f-a552-678d756f9ec3
# For each keyId: az ad app credential delete --id <APP_ID> --key-id <keyId>

# Remove legacy SP access
az role assignment delete --assignee "github-actions-asora-deployer" \
  --scope "/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.Web/sites/asora-function-dev" || true

az role assignment delete --assignee "github-actions-asora-deployer" \
  --scope "/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.KeyVault/vaults/kv-asora-dev" || true
```

### GitHub Secrets Commands (Manual Alternative)

```bash
# Set OIDC secrets
echo "06c8564f-030d-414f-a552-678d756f9ec3" | gh secret set AZURE_CLIENT_ID
echo "275643fa-37e0-4f67-b616-85a7da674bea" | gh secret set AZURE_TENANT_ID
echo "99df7ef7-776a-4235-84a4-c77899b2bb04" | gh secret set AZURE_SUBSCRIPTION_ID

# Delete legacy secrets
gh secret delete AZURE_CLIENT_SECRET || true
gh secret delete AZURE_CREDENTIALS || true

# Verify
gh secret list
```

## 🎯 Acceptance Criteria

After completing the migration, verify these conditions:

### Azure Portal / CLI

- [ ] Federated credentials exist for `repo:AsoraKK/Asora:ref:refs/heads/main`
- [ ] Federated credentials exist for `repo:AsoraKK/Asora:environment:dev`
- [ ] No client secrets exist on Entra app `06c8564f-030d-414f-a552-678d756f9ec3`
- [ ] Legacy SP `github-actions-asora-deployer` has no role assignments
- [ ] Entra app has `Website Contributor` role on `asora-function-dev`
- [ ] Entra app has Key Vault access (or Function App has system-assigned identity with access)

### GitHub

- [ ] Secret `AZURE_CLIENT_ID` is set to `06c8564f-030d-414f-a552-678d756f9ec3`
- [ ] Secret `AZURE_TENANT_ID` is set to `275643fa-37e0-4f67-b616-85a7da674bea`
- [ ] Secret `AZURE_SUBSCRIPTION_ID` is set to `99df7ef7-776a-4235-84a4-c77899b2bb04`
- [ ] Secret `AZURE_CLIENT_SECRET` does NOT exist
- [ ] Secret `AZURE_CREDENTIALS` does NOT exist

### GitHub Actions

- [ ] Deploy workflow runs successfully
- [ ] "Block legacy SP secrets" step passes
- [ ] "Azure login (OIDC)" step succeeds with no errors
- [ ] Function App deployment completes
- [ ] E2E integration tests pass

## 🚨 Troubleshooting

### Issue: "ACTIONS_ID_TOKEN_REQUEST_URL missing"

**Solution:** Already fixed - workflows have `id-token: write` permission.

### Issue: "No matching federated identity record found"

**Cause:** Federated credential not created or subject mismatch.

**Solution:** Re-run `scripts/migrate-to-oidc.sh` or manually create credentials.

### Issue: Legacy secret guard triggers in workflow

**Cause:** Old secrets still exist in GitHub.

**Solution:** Run `scripts/migrate-github-secrets.sh` or manually delete secrets.

### Issue: "Insufficient privileges to complete the operation"

**Cause:** Entra app missing role assignments.

**Solution:** Verify role assignments:

```bash
az role assignment list --assignee 06c8564f-030d-414f-a552-678d756f9ec3 -o table
```

Expected to see `Website Contributor` on the Function App.

## 📊 Migration Status Tracker

Use this checklist to track your progress:

- [ ] Step 1: Run `scripts/migrate-to-oidc.sh`
  - [ ] Azure login successful
  - [ ] Federated credentials created/verified
  - [ ] Client secrets deleted
  - [ ] Legacy SP role assignments removed
  
- [ ] Step 2: Run `scripts/migrate-github-secrets.sh`
  - [ ] OIDC secrets set
  - [ ] Legacy secrets deleted
  - [ ] Verification passed

- [ ] Step 3: Test deployment
  - [ ] Workflow triggered
  - [ ] OIDC authentication successful
  - [ ] Deployment completed
  - [ ] E2E tests passed

- [ ] Step 4: Documentation
  - [ ] Team notified of change
  - [ ] Documentation updated
  - [ ] This migration guide archived

## 🔗 Additional Resources

- **Full Migration Guide:** `AZURE_OIDC_MIGRATION_GUIDE.md`
- **Azure OIDC Docs:** https://docs.microsoft.com/azure/active-directory/develop/workload-identity-federation
- **GitHub Actions OIDC:** https://docs.github.com/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect
- **ADR 002:** CI/CD Security Requirements (in repository docs)

## ✅ Post-Migration

After successful migration:

1. Delete or archive this summary document
2. Update team documentation
3. Add OIDC setup instructions to onboarding docs
4. Schedule a 3-month review of role assignments
5. Consider enabling branch protection to enforce OIDC-only deployments

---

**Migration Date:** October 7, 2025  
**Migrated By:** [Your Name]  
**Status:** In Progress → Complete (update after verification)
