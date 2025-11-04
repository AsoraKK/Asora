terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.114"
    }
  }
}

provider "azurerm" {
  features {}
}

data "azurerm_linux_function_app" "target" {
  name                = var.function_app_name
  resource_group_name = var.resource_group_name
}

data "azurerm_key_vault" "target" {
  name                = var.key_vault_name
  resource_group_name = var.resource_group_name
}

# Enforce critical app settings that must remain consistent
resource "azurerm_linux_function_app_slot" "main" {
  count                      = var.use_slot ? 1 : 0
  name                       = "production"
  function_app_id            = data.azurerm_linux_function_app.target.id
  storage_account_name       = data.azurerm_linux_function_app.target.storage_account_name
  storage_account_access_key = data.azurerm_linux_function_app.target.storage_account_access_key

  site_config {
    application_stack {
      node_version = "20"
    }

    # Health endpoint must be accessible
    health_check_path                 = "/api/health"
    health_check_eviction_time_in_min = 2
  }

  app_settings = merge(
    data.azurerm_linux_function_app.target.app_settings,
    {
      # Rate limiting must be enabled in production
      RATE_LIMITS_ENABLED = "true"

      # Key Vault references for secrets
      EMAIL_HASH_SALT           = "@Microsoft.KeyVault(SecretUri=${data.azurerm_key_vault.target.vault_uri}secrets/email-hash-salt/)"
      COSMOS_CONNECTION_STRING  = "@Microsoft.KeyVault(SecretUri=${data.azurerm_key_vault.target.vault_uri}secrets/COSMOS-CONN/)"

      # Runtime settings (do NOT set FUNCTIONS_WORKER_RUNTIME for Flex)
      WEBSITE_NODE_DEFAULT_VERSION = "~20"
      FUNCTIONS_EXTENSION_VERSION  = "~4"

      # Observability
      APPINSIGHTS_INSTRUMENTATIONKEY = data.azurerm_linux_function_app.target.app_settings["APPINSIGHTS_INSTRUMENTATIONKEY"]
      APPLICATIONINSIGHTS_CONNECTION_STRING = data.azurerm_linux_function_app.target.app_settings["APPLICATIONINSIGHTS_CONNECTION_STRING"]
    }
  )

  identity {
    type = "SystemAssigned"
  }

  lifecycle {
    ignore_changes = [
      # Allow CI/CD to update deployment package without drift
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["GIT_SHA"],
    ]
  }
}

# If not using slots, enforce settings directly on the function app
resource "null_resource" "enforce_app_settings" {
  count = var.use_slot ? 0 : 1

  triggers = {
    rate_limits = "true"
    kv_uri      = data.azurerm_key_vault.target.vault_uri
  }

  provisioner "local-exec" {
    command = <<-EOT
      az functionapp config appsettings set \
        -g ${var.resource_group_name} \
        -n ${var.function_app_name} \
        --settings \
          "RATE_LIMITS_ENABLED=true" \
          "EMAIL_HASH_SALT=@Microsoft.KeyVault(SecretUri=${data.azurerm_key_vault.target.vault_uri}secrets/email-hash-salt/)" \
          "COSMOS_CONNECTION_STRING=@Microsoft.KeyVault(SecretUri=${data.azurerm_key_vault.target.vault_uri}secrets/COSMOS-CONN/)" \
        >/dev/null
    EOT
  }
}

# Grant Key Vault access to the function app's managed identity
resource "azurerm_key_vault_access_policy" "function_app" {
  key_vault_id = data.azurerm_key_vault.target.id
  tenant_id    = data.azurerm_linux_function_app.target.identity[0].tenant_id
  object_id    = data.azurerm_linux_function_app.target.identity[0].principal_id

  secret_permissions = [
    "Get",
    "List"
  ]
}

output "function_app_identity" {
  description = "Managed identity of the function app"
  value = {
    principal_id = data.azurerm_linux_function_app.target.identity[0].principal_id
    tenant_id    = data.azurerm_linux_function_app.target.identity[0].tenant_id
  }
}

output "enforced_settings" {
  description = "App settings enforced by IaC"
  value = {
    rate_limits_enabled           = "true"
    email_hash_salt_source        = "Key Vault: email-hash-salt"
    cosmos_connection_string_source = "Key Vault: COSMOS-CONN"
  }
  sensitive = false
}
