# Function App IaC Enforcement

This Terraform module enforces critical app settings for the Azure Function App to prevent configuration drift.

## What It Enforces

- **Rate limiting**: `RATE_LIMITS_ENABLED=true`
- **Key Vault references**: `EMAIL_HASH_SALT` and `COSMOS_CONNECTION_STRING` wired to Key Vault
- **Managed identity**: Grants KV access to the function app's system-assigned identity
- **Runtime config**: Node 20, Functions v4, health check path

## Usage

```bash
cd infrastructure/function-app
terraform init
terraform plan
terraform apply
```

## Variables

- `resource_group_name`: Resource group (default: `asora-psql-flex`)
- `function_app_name`: Function app name (default: `asora-function-dev`)
- `key_vault_name`: Key Vault name (default: `kv-asora-dev`)
- `use_slot`: Use deployment slots (default: `false` for Flex)

## Notes

- This module uses `local-exec` provisioner (not slot) for Flex Consumption apps since slots aren't supported.
- The `ignore_changes` lifecycle rule allows CI/CD to update deployment packages without drift.
- Run `terraform apply` after any manual app setting changes to restore desired state.
