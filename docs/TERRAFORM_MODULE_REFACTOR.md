# Module Variable Refactoring: Environment-Agnostic Defaults

## Changes

The `infrastructure/function-app/` module variables have been refactored to remove hardcoded `-dev` environment suffixes:

### Before
```hcl
variable "function_app_name" {
  default = "asora-function-dev"
}

variable "key_vault_name" {
  default = "kv-asora-dev"
}
```

### After
```hcl
variable "function_app_name" {
  description = "Name of the Azure Function App (should include environment suffix, e.g., asora-function-dev)"
  type        = string
  # No default: caller must provide env-specific name
}

variable "key_vault_name" {
  description = "Name of the Azure Key Vault containing secrets (should include environment suffix, e.g., kv-asora-dev)"
  type        = string
  # No default: caller must provide env-specific name
}
```

## Rationale

- **Removes dev bias**: Defaults no longer assume development environment.
- **Explicit naming**: Callers must specify resources per environment, reducing risk of accidental cross-env references.
- **Aligns with workspace strategy**: Works with `local.env_name` patterns in parent modules.

## Migration Impact

**Low risk**: This module is used for configuration enforcement, not resource creation. Variables are:
- Data lookups (existing resources)
- App settings enforcement via `azurerm_linux_function_app_slot` or local-exec

**If you have existing module calls**, update them to pass explicit values:

```hcl
module "function_app_config" {
  source              = "./function-app"
  resource_group_name = "asora-psql-flex"
  function_app_name   = "asora-function-${local.env_name}"
  key_vault_name      = "kv-asora-${local.env_name}"
  use_slot            = false
}
```

## Recommended Pattern

For new modules that create resources, use a `name_prefix` or `name_suffix` variable:

```hcl
variable "name_prefix" {
  description = "Prefix for resource names (e.g., asora-func)"
  type        = string
}

resource "azurerm_linux_function_app" "main" {
  name = "${var.name_prefix}-${local.env_name}"
  # ...
}
```

This keeps naming logic DRY while remaining env-aware.

## Verification

No resources are recreated by this change; it only affects how modules are called. Verify by:
1. Running `terraform plan` in each workspace after updating module calls.
2. Confirming "No changes" or only data source refreshes.
