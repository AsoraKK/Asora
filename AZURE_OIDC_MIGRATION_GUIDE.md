# Azure OIDC Migration Guide

This guide walks through the complete migration from Service Principal secrets to OIDC (OpenID Connect) for GitHub Actions authentication to Azure.

## ✅ Completed (in IDE)

- [x] Added legacy secret guard to `deploy-functions-flex.yml`
- [x] Added legacy secret guard to `e2e-integration.yml`
- [x] Both workflows already configured with OIDC login using `azure/login@v2`
- [x] Workflows already have correct `permissions` blocks

## 🔧 Required Manual Steps (Azure CLI)

### Step 1: Azure Login and Subscription Setup

```bash
az login
az account set --subscription 99df7ef7-776a-4235-84a4-c77899b2bb04
```

### Step 2: Create or Confirm Federated Credentials

Create federated credentials for both the main branch and dev environment:

```bash
APP_ID=06c8564f-030d-414f-a552-678d756f9ec3

# For main branch
SUBJECT='repo:AsoraKK/Asora:ref:refs/heads/main'
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "gha-oidc-repo-AsoraKK-Asora-ref-refs-heads-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "'"$SUBJECT"'",
  "audiences": ["api://AzureADTokenExchange"]
}'

# For dev environment
SUBJECT='repo:AsoraKK/Asora:environment:dev'
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "gha-oidc-repo-AsoraKK-Asora-environment-dev",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "'"$SUBJECT"'",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

**Note:** If these already exist, you'll get an error message - that's fine and expected.

### Step 3: List and Delete Existing Client Secrets

```bash
# List all secrets
az ad app credential list --id 06c8564f-030d-414f-a552-678d756f9ec3

# For each keyId returned, delete it:
# Replace <secretId> with actual keyId from the list above
az ad app credential delete --id 06c8564f-030d-414f-a552-678d756f9ec3 --key-id <secretId>
```

### Step 4: Remove Legacy Service Principal Role Assignments

```bash
# Remove App Service access
az role assignment delete --assignee "github-actions-asora-deployer" \
  --scope "/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.Web/sites/asora-function-dev" || true

# Remove Key Vault access
az role assignment delete --assignee "github-actions-asora-deployer" \
  --scope "/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.KeyVault/vaults/kv-asora-dev" || true
```

### Step 5: Verify Federated Credentials

```bash
# List all federated credentials to confirm both exist
az ad app federated-credential list --id 06c8564f-030d-414f-a552-678d756f9ec3 --query "[].{name:name, subject:subject}" -o table
```

Expected output should show both:
- `repo:AsoraKK/Asora:ref:refs/heads/main`
- `repo:AsoraKK/Asora:environment:dev`

## 🔑 Required Manual Steps (GitHub Secrets)

### Step 6: Set Required OIDC Secrets (if not already set)

Using GitHub CLI:

```bash
# Navigate to the repository
cd /home/kylee/asora

# Set the three required secrets
gh secret set AZURE_CLIENT_ID --body "06c8564f-030d-414f-a552-678d756f9ec3"
gh secret set AZURE_TENANT_ID --body "275643fa-37e0-4f67-b616-85a7da674bea"
gh secret set AZURE_SUBSCRIPTION_ID --body "99df7ef7-776a-4235-84a4-c77899b2bb04"
```

Or via GitHub UI:
1. Go to `https://github.com/AsoraKK/Asora/settings/secrets/actions`
2. Add/update these secrets:
   - `AZURE_CLIENT_ID` = `06c8564f-030d-414f-a552-678d756f9ec3`
   - `AZURE_TENANT_ID` = `275643fa-37e0-4f67-b616-85a7da674bea`
   - `AZURE_SUBSCRIPTION_ID` = `99df7ef7-776a-4235-84a4-c77899b2bb04`

### Step 7: Delete Legacy Secrets

Using GitHub CLI:

```bash
gh secret delete AZURE_CLIENT_SECRET || true
gh secret delete AZURE_CREDENTIALS || true
```

Or via GitHub UI - delete these if they exist:
- `AZURE_CLIENT_SECRET`
- `AZURE_CREDENTIALS`

### Step 8: List All Secrets to Verify

```bash
gh secret list
```

Expected output should show:
- ✅ AZURE_CLIENT_ID
- ✅ AZURE_TENANT_ID
- ✅ AZURE_SUBSCRIPTION_ID
- ✅ COSMOS_CONNECTION_STRING (existing, keep)
- ❌ No AZURE_CLIENT_SECRET
- ❌ No AZURE_CREDENTIALS

## ✅ Verification Steps

### 1. Test Workflow Locally (Optional)

If you have `act` installed for local GitHub Actions testing:

```bash
act -j deploy --secret-file .env.secrets
```

### 2. Trigger a Test Deployment

Push a small change to the main branch or manually trigger the workflow:

```bash
# Manual trigger
gh workflow run "Deploy Functions (Flex)" --ref main
```

### 3. Monitor the Workflow

```bash
# Watch the workflow run
gh run watch
```

### 4. Check for Success Indicators

The workflow should:
- ✅ Pass the "Block legacy SP secrets" step (no secrets found)
- ✅ Successfully complete "Azure login (OIDC)" step
- ✅ Complete "Set Azure subscription context" step
- ✅ Complete deployment to `asora-function-dev`

## 🔍 Troubleshooting

### Error: "ACTIONS_ID_TOKEN_REQUEST_URL missing"

**Cause:** Workflow doesn't have `id-token: write` permission.

**Solution:** Already fixed in the workflows - check that the workflow file has:

```yaml
permissions:
  id-token: write
  contents: read
```

### Error: "No matching federated identity record found"

**Cause:** Federated credential not configured or subject mismatch.

**Solution:** Re-run Step 2 to create federated credentials.

### Error: "Insufficient privileges to complete the operation"

**Cause:** The Entra app doesn't have the necessary role assignments.

**Solution:** Verify the app has the correct roles:

```bash
# Check role assignments for the app
az role assignment list --assignee 06c8564f-030d-414f-a552-678d756f9ec3 -o table
```

Expected roles:
- `Website Contributor` on `asora-function-dev`
- `Key Vault Secrets User` on `kv-asora-dev`

### Error: Legacy secret guard triggers

**Cause:** Old secrets still exist in GitHub.

**Solution:** Complete Step 7 to delete legacy secrets.

## 📋 Acceptance Checklist

Run through this checklist to confirm migration success:

- [ ] Azure CLI: Federated credentials exist for both `main` and `environment:dev`
- [ ] Azure CLI: No client secrets exist on the Entra app
- [ ] Azure CLI: Legacy SP has no role assignments
- [ ] GitHub: Three OIDC secrets are set (CLIENT_ID, TENANT_ID, SUBSCRIPTION_ID)
- [ ] GitHub: Legacy secrets deleted (AZURE_CLIENT_SECRET, AZURE_CREDENTIALS)
- [ ] GitHub Actions: Deploy workflow runs successfully
- [ ] GitHub Actions: "Block legacy SP secrets" step passes
- [ ] GitHub Actions: "Azure login (OIDC)" step succeeds
- [ ] GitHub Actions: Deployment to Function App succeeds
- [ ] Key Vault: Function App system-assigned identity has access
- [ ] Key Vault: Legacy SP has no access

## 📚 Reference Information

### Scope Details

| Resource | ID |
|----------|-----|
| Tenant | `275643fa-37e0-4f67-b616-85a7da674bea` |
| Subscription | `99df7ef7-776a-4235-84a4-c77899b2bb04` |
| Entra App (Client) | `06c8564f-030d-414f-a552-678d756f9ec3` |
| Resource Group | `asora-psql-flex` |
| Function App | `asora-function-dev` |
| Key Vault | `kv-asora-dev` |

### Federated Credential Subjects

- Main branch: `repo:AsoraKK/Asora:ref:refs/heads/main`
- Dev environment: `repo:AsoraKK/Asora:environment:dev`

### ADR Compliance

This migration satisfies **ADR 002 CI/CD Security Requirements**:
- ✅ OIDC-only authentication (no passwords in CI)
- ✅ Federated identity with GitHub Actions
- ✅ Least-privilege role assignments
- ✅ No client secrets stored in GitHub or code
- ✅ Key Vault references resolved at runtime via managed identity

## 🎯 Next Steps After Migration

1. Document the OIDC setup in the main README
2. Update team documentation about CI/CD authentication
3. Add this pattern to any new workflows
4. Consider enabling branch protection rules that require OIDC-only deployments
5. Schedule a review in 3 months to audit role assignments

## ❓ Questions or Issues

If you encounter any issues during migration:

1. Check the workflow run logs in GitHub Actions
2. Check Azure Activity Logs for authentication failures
3. Verify federated credentials match the repository and branches exactly
4. Ensure the Entra app has the correct role assignments

For urgent issues, escalate to the platform team with:
- Workflow run ID
- Error messages from GitHub Actions logs
- Azure Activity Log entries (if applicable)
