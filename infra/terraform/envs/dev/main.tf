terraform {
  required_version = ">= 1.6.0"
}

provider "azurerm" {
  features {}
}

data "azurerm_client_config" "current" {}

locals {
  effective_function_app_resource_id = length(trimspace(var.function_app_resource_id)) > 0 ? var.function_app_resource_id : "/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${var.observability_resource_group}/providers/Microsoft.Web/sites/${var.function_app_name}"
}

module "cosmos_sql" {
  source = "../../modules/cosmos_sql"

  resource_group  = var.cosmos_resource_group
  account_name    = var.account_name
  database_name   = var.database_name
  index_dir       = "${path.module}/../../../../database/cosmos/indexes"
  mode            = "serverless"
  manage_database = false

  containers = [
    {
      name          = "posts"
      partition_key = "/authorId"
      index_file    = "posts.index.json"
    },
    {
      name          = "comments"
      partition_key = "/postId"
      index_file    = "comments.index.json"
    },
    {
      name          = "likes"
      partition_key = "/contentId"
      index_file    = "likes.index.json"
    },
    {
      name          = "content_flags"
      partition_key = "/targetId"
      index_file    = "flags.index.json"
    },
    {
      name          = "appeals"
      partition_key = "/id"
      index_file    = "appeals.index.json"
    },
    {
      name          = "receipt_events"
      partition_key = "/postId"
      index_file    = "receipt_events.index.json"
    },
    {
      name          = "appeal_votes"
      partition_key = "/appealId"
      index_file    = "votes.index.json"
    },
    {
      name          = "users"
      partition_key = "/id"
      index_file    = "users.index.json"
    },
    {
      name          = "auth_sessions"
      partition_key = "/partitionKey"
      index_file    = "auth_sessions.index.json"
    },
    {
      name          = "invites"
      partition_key = "/_partitionKey"
      index_file    = "invites.index.json"
    },
    {
      name          = "profiles"
      partition_key = "/id"
      index_file    = "profiles.index.json"
    },
    {
      name          = "publicProfiles"
      partition_key = "/userId"
      index_file    = "publicProfiles.index.json"
    },
    {
      name          = "counters"
      partition_key = "/userId"
      index_file    = "counters.index.json"
    },
    {
      name          = "messages"
      partition_key = "/conversationId"
      index_file    = "messages.index.json"
    },
    {
      name          = "userFeed"
      partition_key = "/recipientId"
      index_file    = "userFeed.index.json"
    },
    {
      name          = "posts_v2"
      partition_key = "/postId"
      index_file    = "posts_v2.index.json"
    },
    {
      name          = "notifications"
      partition_key = "/userId"
      index_file    = "notifications.index.json"
    },
    {
      name          = "notification_preferences"
      partition_key = "/userId"
      index_file    = "notification_preferences.index.json"
    },
    {
      name          = "device_tokens"
      partition_key = "/userId"
      index_file    = "device_tokens.index.json"
    },
    {
      name          = "notification_events"
      partition_key = "/userId"
      index_file    = "notification_events.index.json"
    },
    {
      name          = "custom_feeds"
      partition_key = "/partitionKey"
      index_file    = "custom_feeds.index.json"
    },
    {
      name          = "config"
      partition_key = "/partitionKey"
      index_file    = "config.index.json"
    },
    {
      name          = "moderation_decisions"
      partition_key = "/itemId"
      index_file    = "moderation_decisions.index.json"
    },
    {
      name          = "privacy_requests"
      partition_key = "/id"
      index_file    = "privacy_requests.index.json"
    },
    {
      name          = "legal_holds"
      partition_key = "/scopeId"
      index_file    = "legal_holds.index.json"
    },
    {
      name          = "audit_logs"
      partition_key = "/id"
      index_file    = "audit_logs.index.json"
    },
    {
      name          = "privacy_audit"
      partition_key = "/id"
      index_file    = "privacy_audit.index.json"
    },
    {
      name          = "reputation_audit"
      partition_key = "/_partitionKey"
      index_file    = "reputation_audit.index.json"
    },
    {
      name          = "ModerationWeights"
      partition_key = "/className"
      index_file    = "ModerationWeights.index.json"
    }
  ]
}

module "export_storage_full" {
  source = "../../modules/export_storage"

  env                   = "dev"
  location              = var.storage_location
  resource_group        = var.storage_resource_group
  function_principal_id = var.function_principal_id
  vnet_subnet_id        = var.storage_vnet_subnet_id
  tags                  = var.storage_tags
}

module "observability" {
  count  = var.observability_enabled ? 1 : 0
  source = "../../modules/observability"

  resource_group_name      = var.observability_resource_group
  location                 = var.observability_location
  name_prefix              = var.observability_name_prefix
  environment              = "development"
  alert_email_addresses    = var.observability_alert_email_addresses
  function_app_resource_id = local.effective_function_app_resource_id
  tags                     = var.observability_tags
}
