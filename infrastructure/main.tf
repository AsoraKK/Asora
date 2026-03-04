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

data "azurerm_resource_group" "target" {
  name = var.resource_group
}

data "azurerm_cosmosdb_account" "target" {
  name                = var.account_name
  resource_group_name = data.azurerm_resource_group.target.name
}

data "azurerm_cosmosdb_sql_database" "target" {
  name                = var.database_name
  resource_group_name = data.azurerm_resource_group.target.name
  account_name        = data.azurerm_cosmosdb_account.target.name
}

locals {
  index_policy_file = coalesce(var.index_policy_file, "${path.module}/../database/cosmos-target-indexing-policies.json")
  expected_policies = jsondecode(file(local.index_policy_file))
}

output "cosmos_account_endpoint" {
  description = "Endpoint of the Cosmos DB account under validation"
  value       = data.azurerm_cosmosdb_account.target.endpoint
}

output "expected_containers" {
  description = "Container names with committed indexing policies"
  value       = keys(local.expected_policies)
}