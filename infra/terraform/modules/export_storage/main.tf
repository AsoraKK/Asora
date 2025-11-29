terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.114"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

data "azurerm_subscription" "primary" {}

data "azurerm_role_definition" "blob_contributor" {
  name  = "Storage Blob Data Contributor"
  scope = data.azurerm_subscription.primary.id
}

data "azurerm_role_definition" "queue_contributor" {
  name  = "Storage Queue Data Contributor"
  scope = data.azurerm_subscription.primary.id
}

data "azurerm_role_definition" "account_contributor" {
  name  = "Storage Account Contributor"
  scope = data.azurerm_subscription.primary.id
}

resource "random_id" "suffix" {
  byte_length = 4
}

locals {
  account_base = format("stasoradsr%s%s", var.env, random_id.suffix.hex)
  account_name = lower(substr(local.account_base, 0, 24))
  subnet_ids   = compact(var.vnet_subnet_id != "" && var.vnet_subnet_id != null ? [var.vnet_subnet_id] : [])
}

resource "azurerm_storage_account" "dsr" {
  name                          = local.account_name
  resource_group_name           = var.resource_group
  location                      = var.location
  account_tier                  = "Standard"
  account_replication_type      = "LRS"
  account_kind                  = "StorageV2"
  min_tls_version               = "TLS1_2"
  public_network_access_enabled = false

  tags = merge(
    {
      env     = var.env
      purpose = "dsr-storage"
    },
    var.tags
  )

  network_rules {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    virtual_network_subnet_ids = local.subnet_ids
  }

  blob_properties {
    versioning_enabled = true
  }
}

resource "azurerm_storage_container" "exports" {
  name                  = "dsr-exports"
  storage_account_name  = azurerm_storage_account.dsr.name
  container_access_type = "private"
}

resource "azurerm_storage_queue" "requests" {
  name                 = "dsr-requests"
  storage_account_name = azurerm_storage_account.dsr.name
}

resource "azurerm_storage_management_policy" "exports" {
  storage_account_id = azurerm_storage_account.dsr.id

  rule {
    name    = "dsr-export-lifecycle"
    enabled = true

    filters {
      prefix_match = ["dsr-exports/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = 30
      }
      snapshot {
        delete_after_days_since_creation_greater_than = 30
      }
    }
  }
}

resource "azurerm_private_endpoint" "blob" {
  count               = length(local.subnet_ids)
  name                = "dsr-exports-pe-${var.env}"
  location            = var.location
  resource_group_name = var.resource_group
  subnet_id           = local.subnet_ids[count.index]

  private_service_connection {
    name                           = "privatelink-${azurerm_storage_account.dsr.name}"
    private_connection_resource_id = azurerm_storage_account.dsr.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }
}

resource "azurerm_role_assignment" "function_blob_contributor" {
  scope              = azurerm_storage_account.dsr.id
  role_definition_id = data.azurerm_role_definition.blob_contributor.id
  principal_id       = var.function_principal_id
}

resource "azurerm_role_assignment" "function_queue_contributor" {
  scope              = azurerm_storage_account.dsr.id
  role_definition_id = data.azurerm_role_definition.queue_contributor.id
  principal_id       = var.function_principal_id
}

resource "azurerm_role_assignment" "function_account_contributor" {
  scope              = azurerm_storage_account.dsr.id
  role_definition_id = data.azurerm_role_definition.account_contributor.id
  principal_id       = var.function_principal_id
}
