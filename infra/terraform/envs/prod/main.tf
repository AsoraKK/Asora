terraform {
  required_version = ">= 1.6.0"
}

provider "azurerm" {
  features {}
}

module "cosmos_sql" {
  source = "../../modules/cosmos_sql"

  resource_group            = "asora-psql-flex" # TODO: Use prod RG when ready
  account_name              = var.account_name
  database_name             = var.database_name
  index_dir                 = "${path.module}/../../../../database/cosmos/indexes"
  mode                      = "autoscale" # Production uses autoscale RU
  enable_analytical_storage = false       # Enable if BI/analytics needed
  manage_database           = false

  # Production: autoscale with max_throughput for each container
  containers = [
    {
      name           = "posts"
      partition_key  = "/authorId"
      index_file     = "posts.index.json"
      max_throughput = 10000
    },
    {
      name           = "comments"
      partition_key  = "/postId"
      index_file     = "comments.index.json"
      max_throughput = 4000
    },
    {
      name           = "likes"
      partition_key  = "/contentId"
      index_file     = "likes.index.json"
      max_throughput = 2000
    },
    {
      name           = "content_flags"
      partition_key  = "/targetId"
      index_file     = "flags.index.json"
      max_throughput = 4000
    },
    {
      name           = "appeals"
      partition_key  = "/id"
      index_file     = "appeals.index.json"
      max_throughput = 2000
    },
    {
      name           = "appeal_votes"
      partition_key  = "/appealId"
      index_file     = "votes.index.json"
      max_throughput = 2000
    },
    {
      name           = "users"
      partition_key  = "/id"
      index_file     = "users.index.json"
      max_throughput = 2000
    },
    {
      name           = "config"
      partition_key  = "/partitionKey"
      index_file     = "config.index.json"
      max_throughput = 1000
    },
    {
      name           = "moderation_decisions"
      partition_key  = "/itemId"
      index_file     = "moderation_decisions.index.json"
      max_throughput = 4000
    },
    {
      name          = "privacy_requests"
      partition_key = "/id"
      index_file    = "privacy_requests.index.json"
      max_throughput = 2000
    },
    {
      name          = "legal_holds"
      partition_key = "/scopeId"
      index_file    = "legal_holds.index.json"
      max_throughput = 1000
    },
    {
      name          = "audit_logs"
      partition_key = "/id"
      index_file    = "audit_logs.index.json"
      max_throughput = 1000
    }
  ]
}

module "export_storage_full" {
  source = "../../modules/export_storage"

  env                   = "prod"
  location              = var.storage_location
  resource_group        = var.storage_resource_group
  function_principal_id = var.function_principal_id
  vnet_subnet_id        = var.storage_vnet_subnet_id
  tags                  = var.storage_tags
}
