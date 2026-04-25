# Azure Retirement Hardening 2026 — Runbook

This runbook documents the four Azure retirement areas addressed in
`infra/azure-retirement-hardening-node22-tls-kv-pg-ha` and provides verification,
rollback, and ongoing compliance commands.

---

## 1. Azure Storage — TLS 1.2 Minimum

### Retirement details
Microsoft retired TLS 1.0/1.1 support for Azure Storage on **3 February 2026**.
All Storage accounts must enforce a minimum TLS version of 1.2.

### What changed

| File | Change |
|------|--------|
| `deploy_y1_win_ne.sh` | Added `--min-tls-version TLS1_2` to `az storage account create` |
| `clean_flex_rebuild.sh` | Added `--min-tls-version TLS1_2 --https-only true` |
| `scripts/setup-media-storage.sh` | Already compliant (no change needed) |

### Verify live resources

```bash
# List all Storage accounts and their minimum TLS versions
az storage account list \
  --subscription 99df7ef7-776a-4235-84a4-c77899b2bb04 \
  --query "[].{name:name, rg:resourceGroup, minTls:minimumTlsVersion, httpsOnly:enableHttpsTrafficOnly}" \
  -o table

# Fix any non-compliant account
az storage account update \
  --name <storage-account-name> \
  --resource-group <rg-name> \
  --min-tls-version TLS1_2 \
  --https-only true
```

### Validation CI check
The `scripts/validate-azure-retirement.sh` script fails if any Storage account `create`
or `update` call in shell scripts lacks `--min-tls-version TLS1_2`.

---

## 2. Azure Key Vault — RBAC Authorization

### Retirement details
The legacy Key Vault **access policies** API (pre-2026-02-01) is retiring on **27 February 2027**.
All Key Vault resources should be migrated to Azure RBAC (`enableRbacAuthorization: true`).

### What changed

| File | Change |
|------|--------|
| `infrastructure/function-app/main.tf` | Replaced `azurerm_key_vault_access_policy` with `azurerm_role_assignment` (Key Vault Secrets User) |

### Pre-migration verification

Before applying Terraform, verify the live vault has RBAC enabled:

```bash
az keyvault show \
  --name kv-asora-flex-dev \
  --resource-group asora-psql-flex \
  --query "{name:name, enableRbacAuthorization:properties.enableRbacAuthorization}" \
  -o table
```

**Expected output**: `enableRbacAuthorization: true`

If the vault still uses access policies (`enableRbacAuthorization: null` or `false`),
you must enable RBAC first:

```bash
az keyvault update \
  --name kv-asora-flex-dev \
  --resource-group asora-psql-flex \
  --enable-rbac-authorization true
```

> **Warning**: Enabling RBAC removes all legacy access policies. Ensure all consumers
> of the vault have appropriate RBAC role assignments **before** switching.

### Verify role assignment post-deploy

```bash
# Get the Function App's managed identity principal ID
PRINCIPAL_ID=$(az functionapp identity show \
  -g asora-psql-flex -n asora-function-dev \
  --query "principalId" -o tsv)

# Check role assignments on the vault
az role assignment list \
  --scope "/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.KeyVault/vaults/kv-asora-flex-dev" \
  --query "[?principalId=='${PRINCIPAL_ID}'].{role:roleDefinitionName, principal:principalId}" \
  -o table
```

**Expected role**: `Key Vault Secrets User`

### Rollback

If the RBAC migration causes secret access failures, you can temporarily add a legacy
access policy (this is a short-term mitigation only):

```bash
az keyvault set-policy \
  --name kv-asora-flex-dev \
  --resource-group asora-psql-flex \
  --object-id "$PRINCIPAL_ID" \
  --secret-permissions get list
```

Then revert the Terraform change and re-apply.

---

## 3. Node.js 22 Migration (Azure Functions)

### Retirement details
Node.js 20 LTS reaches end-of-life on **30 April 2026**. Azure Functions will retire
Node.js 20 runtime support shortly after. All Function Apps must be on Node.js 22.

### What changed

| File | Change |
|------|--------|
| `.nvmrc` | `20` → `22` |
| `functions/package.json` | `"engines": {"node": ">=22 <23"}`, `@types/node ^22` |
| `infrastructure/function-app/main.tf` | `node_version = "22"`, `WEBSITE_NODE_DEFAULT_VERSION = "~22"` |
| `infra/main.tf` | `node_version = "22"`, `WEBSITE_NODE_DEFAULT_VERSION = "~22"` |
| `local.settings.json.example` | `WEBSITE_NODE_DEFAULT_VERSION: "~22"` |
| `deploy_y1_win_ne.sh` | `--runtime-version 22` |
| `clean_flex_rebuild.sh` | `--runtime-version 22`, embedded package.json updated |
| `deploy-staging.sh` | `WEBSITE_NODE_DEFAULT_VERSION=~22`, `NODE\|22` |
| `heal_flex_and_probe.sh` | `"engines": {"node": ">=22 <23"}` |
| `fix_ep1_runfrompackage.sh` | `"engines": {"node": ">=22 <23"}` |
| `ci-local.sh` | `nvm use 22`, version checks updated |
| `scripts/canary-setup.sh` | Comment updated to `--runtime-version 22` |
| `scripts/diagnostics-v4.sh` | Diagnostic text updated to `node@22` |
| `.github/workflows/ci.yml` | All `node-version: '20'` → `'22'` |
| `.github/workflows/deploy-asora-function-dev.yml` | `NODE_VERSION: 22` |
| `.github/workflows/deploy-functionapp.yml` | All Node 22 updates |
| `.github/workflows/deploy-functionapp-fixed.yml` | All Node 22 updates |
| `.github/workflows/flutter-ci.yml` | `node-version: '22'` (marketing site) |
| `.github/workflows/openapi.yml` | `node-version: 22` |
| `.github/workflows/api-contract.yml` | `node-version: '22'` |
| `.github/workflows/cache-check.yml` | Both `node-version: '22'` |
| `.github/workflows/deploy-asora-function-consumption-y1.yml` | `NODE_VERSION: '22'` |
| `.github/copilot-instructions.md` | Node.js 22 references updated |

### Verify live Flex runtime

```bash
# Check ARM-level runtime configuration (Flex Consumption)
az functionapp show \
  -g asora-psql-flex \
  -n asora-function-dev \
  --query "properties.functionAppConfig.runtime" \
  -o json

# Expected: {"name": "node", "version": "22"}
```

### Rollback plan

1. Revert `NODE_VERSION` to `20` in `.github/workflows/deploy-asora-function-dev.yml`
2. Revert `node_version` to `"20"` in both Terraform files
3. Revert `.nvmrc` to `20`
4. Revert `engines` in `functions/package.json` to `">=20 <21"` and `@types/node` to `^20`
5. Run `npm install` in `functions/` to regenerate lock file
6. Commit and redeploy via the same CI pipeline

### Local development

Ensure you have Node 22 installed. With nvm:

```bash
nvm install 22
nvm use 22
node --version  # Should print v22.x.x
```

---

## 4. PostgreSQL HA Posture

See [postgresql-ha-2026.md](./postgresql-ha-2026.md) for full details.

**Summary**: No active PostgreSQL IaC exists. Cosmos DB is the primary database.
No action required unless PostgreSQL is reintroduced. If it is, ensure all
`azurerm_postgresql_flexible_server` resources declare `high_availability.mode`
explicitly (do not rely on defaults ahead of the 1 September 2026 auto-migration).

---

## CI Validation

The `scripts/validate-azure-retirement.sh` script enforces these standards at PR time.
It is invoked by the `azure-retirement-validation` job in `.github/workflows/ci.yml`.

Run locally:

```bash
bash scripts/validate-azure-retirement.sh
```

A non-zero exit code means at least one standard is violated. Review the output for
the specific check that failed.

---

## Contacts and References

- [Azure Storage TLS deprecation](https://aka.ms/azstorage/TLSDeprecation)
- [Key Vault RBAC access policies retirement](https://learn.microsoft.com/azure/key-vault/general/rbac-access-policy)
- [Azure Functions Node.js support](https://learn.microsoft.com/azure/azure-functions/functions-reference-node)
- [PostgreSQL HA](https://learn.microsoft.com/azure/postgresql/flexible-server/concepts-high-availability)
