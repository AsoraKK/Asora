# Azure OIDC for Terraform CI

This document describes the Azure federated credential setup required to enable `terraform plan` in CI.

## Overview

The `terraform-ci.yml` workflow uses Azure OIDC (OpenID Connect) to authenticate without storing long-lived credentials. When `PLAN=true`, the workflow logs into Azure and runs `terraform plan` against the dev workspace.

## Prerequisites

1. **Azure Service Principal** with Contributor access (or appropriate role) on the subscription/resource group where Terraform manages resources.
2. **Federated credential** configured for GitHub Actions OIDC.

## Setup Steps

### 1. Create Service Principal

```bash
az ad sp create-for-rbac \
  --name "github-terraform-ci" \
  --role Contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>
```

Note the output: `appId` (client ID), `tenant`, and `subscription`.

### 2. Configure Federated Credential

```bash
az ad app federated-credential create \
  --id <APP_ID> \
  --parameters '{
    "name": "github-asora-terraform-ci",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:AsoraKK/Asora:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

For PRs, add another credential with subject:
- `repo:AsoraKK/Asora:pull_request` (all PRs)

### 3. Add GitHub Secrets

In your GitHub repository settings (Settings → Secrets and variables → Actions), add:

| Secret Name             | Value                                  |
|-------------------------|----------------------------------------|
| `AZURE_CLIENT_ID`       | `<appId>` from service principal       |
| `AZURE_TENANT_ID`       | `<tenant>` from service principal      |
| `AZURE_SUBSCRIPTION_ID` | `<subscription>` from service principal|

### 4. Grant Storage Account Access

The service principal needs access to the tfstate storage account:

```bash
az role assignment create \
  --assignee <APP_ID> \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<TFSTATE_RG>/providers/Microsoft.Storage/storageAccounts/<TFSTATE_SA>
```

Replace:
- `<TFSTATE_RG>`: Resource group from bootstrap (e.g., `rg-asora-tfstate`)
- `<TFSTATE_SA>`: Storage account from bootstrap (e.g., `sttfstateasora123456`)

### 5. Enable Plan in CI

Set `PLAN: 'true'` in the `terraform-ci.yml` env block to enable planning on PRs.

## Verification

After setup:
1. Open a PR touching Terraform files.
2. The workflow should authenticate via OIDC and run `terraform plan` successfully.
3. Check the Actions log for "Azure Login (OIDC)" and plan output.

## Security Notes

- No secrets are stored in code; authentication uses short-lived OIDC tokens.
- Federated credentials are scoped to specific repos/branches/PRs.
- Service principal permissions should follow least-privilege: only what Terraform needs.

## Troubleshooting

- **Login fails**: Verify federated credential subject matches repo/branch pattern.
- **Plan fails on state access**: Ensure service principal has Storage Blob Data Contributor on tfstate SA.
- **Plan fails on resources**: Ensure service principal has Contributor (or specific roles) on managed resources.
