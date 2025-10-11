# OIDC Migration Complete ✅

**Date:** October 11, 2025  
**Service Principal:** gh-deployer  
**App ID:** e9835371-8877-47a5-be8f-e0995d173cb4

## Summary

Successfully migrated Azure authentication from client secrets to OpenID Connect (OIDC) federated credentials across all GitHub Actions workflows.

## Azure SP Configuration

### ✅ Federated Credentials (2 active)
```bash
az ad app federated-credential list --id e9835371-8877-47a5-be8f-e0995d173cb4 -o table
```

| Name        | Issuer                                      | Subject                                  |
|-------------|---------------------------------------------|------------------------------------------|
| gh-main     | https://token.actions.githubusercontent.com | repo:AsoraKK/Asora:ref:refs/heads/main   |
| gh-env-prod | https://token.actions.githubusercontent.com | repo:AsoraKK/Asora:environment:prod      |

### ✅ Client Secrets (0 remaining)
```bash
az ad app credential list --id e9835371-8877-47a5-be8f-e0995d173cb4 -o table
```
**Result:** Empty (no passwords/secrets)

## GitHub Repository Variables

Set as **Variables** (not Secrets) for transparency:

```bash
gh variable list --repo AsoraKK/Asora
```

| Variable                | Value                                |
|-------------------------|--------------------------------------|
| AZURE_CLIENT_ID         | e9835371-8877-47a5-be8f-e0995d173cb4 |
| AZURE_TENANT_ID         | 275643fa-37e0-4f67-b616-85a7da674bea |
| AZURE_SUBSCRIPTION_ID   | 99df7ef7-776a-4235-84a4-c77899b2bb04 |

## Workflows Updated

All workflows now use OIDC authentication with the following pattern:

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: azure/login@v2
    with:
      client-id: ${{ vars.AZURE_CLIENT_ID }}
      tenant-id: ${{ vars.AZURE_TENANT_ID }}
      subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
```

### Updated Workflows:
- ✅ `.github/workflows/deploy-functions-flex.yml`
- ✅ `.github/workflows/e2e-integration.yml`
- ✅ `.github/workflows/mobile-security-check.yml`
- ✅ `.github/workflows/deploy-y1-win-ne.yml`

### Legacy Secret Guardrails Added

Each workflow now includes a preflight check to block legacy secrets:

```yaml
- name: Fail if legacy Azure secrets are present
  env:
    AZURE_CREDENTIALS: ${{ secrets.AZURE_CREDENTIALS }}
    AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
    ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
  run: |
    set -euo pipefail
    [ -z "${AZURE_CREDENTIALS:-}" ] || { echo "ERROR: legacy secret AZURE_CREDENTIALS present"; exit 1; }
    [ -z "${AZURE_CLIENT_SECRET:-}" ] || { echo "ERROR: legacy secret AZURE_CLIENT_SECRET present"; exit 1; }
    [ -z "${ARM_CLIENT_SECRET:-}" ] || { echo "ERROR: legacy secret ARM_CLIENT_SECRET present"; exit 1; }
```

## Security Posture

| Aspect                  | Before                | After               |
|-------------------------|-----------------------|---------------------|
| Authentication Method   | Client Secret (JSON)  | OIDC Federated      |
| Secret Storage          | GitHub Secrets        | None (Variables)    |
| Credential Lifespan     | 1 year (renewable)    | Per-workflow token  |
| Secret Rotation         | Manual                | Automatic (OIDC)    |
| Zero Trust              | ❌                    | ✅                  |

## Verification

### Test OIDC Login
Trigger any workflow (e.g., `deploy-functions-flex.yml`) manually via workflow_dispatch:

```bash
gh workflow run deploy-functions-flex.yml
```

Expected outcome:
- ✅ Azure login succeeds via OIDC
- ✅ No `AZURE_CREDENTIALS` or client secrets referenced
- ✅ Guardrail step passes (no legacy secrets detected)

### Verify Federation
```bash
APP_ID="e9835371-8877-47a5-be8f-e0995d173cb4"
az ad app federated-credential list --id "$APP_ID" -o table
az ad app credential list --id "$APP_ID" -o table  # Should be empty
```

## Migration Steps Executed

1. ✅ Created federated credentials for `main` branch and `prod` environment
2. ✅ Deleted all client secrets from service principal
3. ✅ Set GitHub repository variables (AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID)
4. ✅ Updated all workflows to use `vars.*` instead of `secrets.*` for Azure IDs
5. ✅ Added `permissions: { id-token: write, contents: read }` to all Azure jobs
6. ✅ Added legacy secret guardrails to all workflows
7. ✅ Verified zero client secrets on SP

## Maintenance

### Adding New Environments
To add a federated credential for a new environment (e.g., `staging`):

```bash
APP_ID="e9835371-8877-47a5-be8f-e0995d173cb4"
REPO="AsoraKK/Asora"
ENV_NAME="staging"

az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name":"gh-env-'"$ENV_NAME"'",
  "issuer":"https://token.actions.githubusercontent.com",
  "subject":"repo:'"$REPO"':environment:'"$ENV_NAME"'",
  "audiences":["api://AzureADTokenExchange"]
}'
```

### Adding New Branches
To add a federated credential for a new branch (e.g., `develop`):

```bash
APP_ID="e9835371-8877-47a5-be8f-e0995d173cb4"
REPO="AsoraKK/Asora"
BRANCH="develop"

az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name":"gh-'"$BRANCH"'",
  "issuer":"https://token.actions.githubusercontent.com",
  "subject":"repo:'"$REPO"':ref:refs/heads/'"$BRANCH"'",
  "audiences":["api://AzureADTokenExchange"]
}'
```

## References

- [Azure OIDC Setup Guide](./AZURE_OIDC_SETUP_GUIDE.md)
- [Azure OIDC Implementation Summary](./AZURE_OIDC_IMPLEMENTATION_SUMMARY.md)
- [Security Secrets Audit](./SECURITY_SECRETS_AUDIT.md)
- [Microsoft Docs: OIDC with Azure](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure)

## Done Criteria Met ✅

- [x] Azure: Federated credential exists on deployment SP for repo/env
- [x] Azure: No client secrets on SP (only federation)
- [x] GitHub: No AZURE_CREDENTIALS or SP secrets in repo Actions secrets
- [x] Workflows: All jobs use `permissions: { id-token: write, contents: read }`
- [x] Workflows: All jobs use `azure/login@v2` with client-id/tenant-id/subscription-id from `vars`
- [x] Guardrails: Legacy secret checks added to all workflows
- [x] Verification: SP credential list returns empty

---

**Status:** Migration Complete 🎉  
**Next Step:** Trigger a workflow to validate OIDC authentication in production
