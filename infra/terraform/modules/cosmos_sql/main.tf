terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.114"
    }
  }
}

locals {
  index_policies = {
    for container in var.containers :
    container.name => jsondecode(file("${var.index_dir}/${container.index_file}"))
  }
}

data "azurerm_resource_group" "rg" {
  name = var.resource_group
}

data "azurerm_cosmosdb_account" "acct" {
  name                = var.account_name
  resource_group_name = data.azurerm_resource_group.rg.name
}

data "azurerm_cosmosdb_sql_database" "db" {
  name                = var.database_name
  resource_group_name = data.azurerm_resource_group.rg.name
  account_name        = data.azurerm_cosmosdb_account.acct.name
}

resource "azurerm_cosmosdb_sql_database" "database" {
  count               = var.manage_database ? 1 : 0
  name                = var.database_name
  resource_group_name = data.azurerm_resource_group.rg.name
  account_name        = data.azurerm_cosmosdb_account.acct.name
}

locals {
  containers = {
    for container in var.containers :
    container.name => merge(container, {
      policy = local.index_policies[container.name]
    })
  }
}

resource "azurerm_cosmosdb_sql_container" "container" {
  for_each = local.containers

  name                  = each.value.name
  resource_group_name   = data.azurerm_resource_group.rg.name
  account_name          = data.azurerm_cosmosdb_account.acct.name
  database_name         = var.manage_database ? azurerm_cosmosdb_sql_database.database[0].name : data.azurerm_cosmosdb_sql_database.db.name
  partition_key_paths   = [each.value.partition_key]
  partition_key_version = 2

  indexing_policy {
    indexing_mode = each.value.policy.indexingMode

    dynamic "included_path" {
      for_each = try(each.value.policy.includedPaths, [])
      content {
        path = included_path.value.path
      }
    }

    dynamic "excluded_path" {
      for_each = try(each.value.policy.excludedPaths, [])
      content {
        path = excluded_path.value.path
      }
    }

    dynamic "composite_index" {
      for_each = try(each.value.policy.compositeIndexes, [])
      content {
        dynamic "index" {
          for_each = composite_index.value
          content {
            path  = index.value.path
            order = index.value.order
          }
        }
      }
    }

    dynamic "spatial_index" {
      for_each = try(each.value.policy.spatialIndexes, [])
      content {
        path  = spatial_index.value.path
        types = spatial_index.value.types
      }
    }
  }

  dynamic "autoscale_settings" {
    for_each = var.mode == "autoscale" ? [1] : []
    content {
      max_throughput = try(each.value.max_throughput, null)
    }
  }

  throughput = var.mode == "provisioned" ? try(each.value.throughput, null) : null

  # Only when explicitly enabled and not serverless
  analytical_storage_ttl = var.enable_analytical_storage && var.mode != "serverless" ? -1 : null

  lifecycle {
    ignore_changes = [
      throughput,
      indexing_policy,      # Prevent drift from JSON↔API normalization
      partition_key_version # Existing v1 containers must not be force-replaced to v2
    ]

    # Enforce serverless/autoscale throughput rules
    precondition {
      condition     = var.mode != "serverless" ? (try(each.value.max_throughput, null) != null || try(each.value.throughput, null) != null) : (try(each.value.max_throughput, null) == null && try(each.value.throughput, null) == null)
      error_message = "Serverless must not set throughput; autoscale/provisioned must set max_throughput or throughput."
    }

    precondition {
      condition     = var.mode != "autoscale" || try(each.value.max_throughput != null, false)
      error_message = "Containers must supply max_throughput when mode is autoscale."
    }

    precondition {
      condition     = var.mode != "provisioned" || try(each.value.throughput != null, false)
      error_message = "Containers must supply throughput when mode is provisioned."
    }
  }
}
