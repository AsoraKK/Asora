terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 3.100" }
  }
}

provider "azurerm" {
  features {}
}

variable "cosmos_account" {
  description = "Cosmos DB account name"
  type        = string
}

variable "cosmos_db" {
  description = "Cosmos DB database name"
  type        = string
}

variable "resource_group" {
  description = "Resource group name"
  type        = string
}

resource "azurerm_cosmosdb_sql_container" "posts_v2" {
  name                = "posts_v2"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/postId"]

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }

    composite_index {
      index {
        path  = "/authorId"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }
  }
}
