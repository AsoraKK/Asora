# ─────────────────────────────────────────────────────────────────────────────
# Cosmos DB Containers - Asora Application
# ─────────────────────────────────────────────────────────────────────────────
# This file defines all Cosmos DB containers used by the Asora backend.
# Each container is configured with its appropriate partition key and
# indexing policy based on the application's query patterns.
#
# Container inventory (from functions/src/shared/clients/cosmos.ts):
#   - Core: users, posts, posts_v2
#   - Auth: auth_sessions, invites
#   - Feed: userFeed, comments, reactions
#   - Moderation: flags, appeals, appeal_votes
#   - Notifications: notifications, notification_preferences, device_tokens, notification_events
#   - Social: publicProfiles, messages, counters
#   - Reputation: reputation_audit
#   - Privacy: privacy_requests, legal_holds, audit_logs
# ─────────────────────────────────────────────────────────────────────────────

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

# ─────────────────────────────────────────────────────────────────────────────
# Core Containers
# ─────────────────────────────────────────────────────────────────────────────

resource "azurerm_cosmosdb_sql_container" "users" {
  name                = "users"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/id"]

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
        path  = "/email"
        order = "ascending"
      }
    }

    composite_index {
      index {
        path  = "/role"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "posts" {
  name                = "posts"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/id"]

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

    composite_index {
      index {
        path  = "/status"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

# NOTE: posts_v2 is defined in cosmos_privacy_indexes.tf

# ─────────────────────────────────────────────────────────────────────────────
# Auth Containers
# ─────────────────────────────────────────────────────────────────────────────

resource "azurerm_cosmosdb_sql_container" "auth_sessions" {
  name                = "auth_sessions"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/partitionKey"]
  default_ttl         = 3600 # 1 hour - sessions are short-lived

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
        path  = "/userId"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }
  }
}

resource "azurerm_cosmosdb_sql_container" "invites" {
  name                = "invites"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/_partitionKey"]

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
        path  = "/createdBy"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }

    composite_index {
      index {
        path  = "/email"
        order = "ascending"
      }
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Feed Containers
# ─────────────────────────────────────────────────────────────────────────────

resource "azurerm_cosmosdb_sql_container" "userFeed" {
  name                = "userFeed"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/recipientId"]

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
        path  = "/recipientId"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }

    composite_index {
      index {
        path  = "/recipientId"
        order = "ascending"
      }
      index {
        path  = "/relevanceScore"
        order = "descending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "comments" {
  name                = "comments"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/_partitionKey"] # postId for co-location

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
        path  = "/_partitionKey"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
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

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "reactions" {
  name                = "reactions"
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
        path  = "/postId"
        order = "ascending"
      }
      index {
        path  = "/type"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }

    composite_index {
      index {
        path  = "/userId"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Moderation Containers
# ─────────────────────────────────────────────────────────────────────────────

resource "azurerm_cosmosdb_sql_container" "flags" {
  name                = "flags"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/contentId"]

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
        path  = "/status"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }

    composite_index {
      index {
        path  = "/reporterId"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "appeals" {
  name                = "appeals"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/contentId"]

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
        path  = "/status"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }

    composite_index {
      index {
        path  = "/submitterId"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "appeal_votes" {
  name                = "appeal_votes"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/appealId"]

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
        path  = "/appealId"
        order = "ascending"
      }
      index {
        path  = "/voterId"
        order = "ascending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Notification Containers
# ─────────────────────────────────────────────────────────────────────────────

resource "azurerm_cosmosdb_sql_container" "notifications" {
  name                = "notifications"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/recipientId"]
  default_ttl         = 2592000 # 30 days

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
        path  = "/recipientId"
        order = "ascending"
      }
      index {
        path  = "/read"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "notification_preferences" {
  name                = "notification_preferences"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/userId"]

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "device_tokens" {
  name                = "device_tokens"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/userId"]

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
        path  = "/userId"
        order = "ascending"
      }
      index {
        path  = "/platform"
        order = "ascending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "notification_events" {
  name                = "notification_events"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/userId"]
  default_ttl         = 604800 # 7 days

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
        path  = "/userId"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Social/Profile Containers
# ─────────────────────────────────────────────────────────────────────────────

resource "azurerm_cosmosdb_sql_container" "publicProfiles" {
  name                = "publicProfiles"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/userId"]

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }

    excluded_path {
      path = "/bio/?"
    }

    composite_index {
      index {
        path  = "/username"
        order = "ascending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "messages" {
  name                = "messages"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/conversationId"]

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
        path  = "/conversationId"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }

    composite_index {
      index {
        path  = "/senderId"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "counters" {
  name                = "counters"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/userId"]
  default_ttl         = 604800 # 7 days - for daily limit counters

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
        path  = "/userId"
        order = "ascending"
      }
      index {
        path  = "/counterType"
        order = "ascending"
      }
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Reputation Containers
# ─────────────────────────────────────────────────────────────────────────────

resource "azurerm_cosmosdb_sql_container" "reputation_audit" {
  name                = "reputation_audit"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/_partitionKey"]
  default_ttl         = 7776000 # 90 days

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
        path  = "/userId"
        order = "ascending"
      }
      index {
        path  = "/appliedAt"
        order = "descending"
      }
    }

    composite_index {
      index {
        path  = "/reason"
        order = "ascending"
      }
      index {
        path  = "/appliedAt"
        order = "descending"
      }
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Privacy/DSR Containers
# ─────────────────────────────────────────────────────────────────────────────

resource "azurerm_cosmosdb_sql_container" "privacy_requests" {
  name                = "privacy_requests"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/id"]

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
        path  = "/status"
        order = "ascending"
      }
      index {
        path  = "/requestedAt"
        order = "descending"
      }
    }

    composite_index {
      index {
        path  = "/type"
        order = "ascending"
      }
      index {
        path  = "/requestedAt"
        order = "descending"
      }
    }

    composite_index {
      index {
        path  = "/userId"
        order = "ascending"
      }
      index {
        path  = "/requestedAt"
        order = "descending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "legal_holds" {
  name                = "legal_holds"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/scopeId"]

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
        path  = "/scope"
        order = "ascending"
      }
      index {
        path  = "/active"
        order = "ascending"
      }
    }

    composite_index {
      index {
        path  = "/active"
        order = "ascending"
      }
      index {
        path  = "/startedAt"
        order = "descending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "audit_logs" {
  name                = "audit_logs"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/subjectId"]
  default_ttl         = 31536000 # 365 days - 1 year retention for audit

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
        path  = "/subjectId"
        order = "ascending"
      }
      index {
        path  = "/timestamp"
        order = "descending"
      }
    }

    composite_index {
      index {
        path  = "/actorId"
        order = "ascending"
      }
      index {
        path  = "/timestamp"
        order = "descending"
      }
    }

    composite_index {
      index {
        path  = "/eventType"
        order = "ascending"
      }
      index {
        path  = "/timestamp"
        order = "descending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Previously unmanaged containers – added to align TF with live state
# ─────────────────────────────────────────────────────────────────────────────

resource "azurerm_cosmosdb_sql_container" "config" {
  name                = "config"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/partitionKey"]

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "custom_feeds" {
  name                = "custom_feeds"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/partitionKey"]

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
        path  = "/ownerId"
        order = "ascending"
      }
      index {
        path  = "/updatedAt"
        order = "descending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "moderation_decisions" {
  name                = "moderation_decisions"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/itemId"]

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
        path  = "/itemId"
        order = "ascending"
      }
      index {
        path  = "/decidedAt"
        order = "descending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "receipt_events" {
  name                = "receipt_events"
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
        path  = "/postId"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "ascending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "profiles" {
  name                = "profiles"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/userId"]

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
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
        path  = "/createdAt"
        order = "descending"
      }
      index {
        path  = "/id"
        order = "descending"
      }
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

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "privacy_audit" {
  name                = "privacy_audit"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/id"]

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_container" "moderation_weights" {
  name                = "ModerationWeights"
  account_name        = var.cosmos_account
  database_name       = var.cosmos_db
  resource_group_name = var.resource_group
  partition_key_paths = ["/id"]

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
        path  = "/apiType"
        order = "ascending"
      }
      index {
        path  = "/active"
        order = "ascending"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Outputs
# ─────────────────────────────────────────────────────────────────────────────

output "container_names" {
  description = "List of all provisioned Cosmos DB containers"
  value = [
    azurerm_cosmosdb_sql_container.users.name,
    azurerm_cosmosdb_sql_container.posts.name,
    azurerm_cosmosdb_sql_container.posts_v2.name,
    azurerm_cosmosdb_sql_container.auth_sessions.name,
    azurerm_cosmosdb_sql_container.invites.name,
    azurerm_cosmosdb_sql_container.userFeed.name,
    azurerm_cosmosdb_sql_container.comments.name,
    azurerm_cosmosdb_sql_container.reactions.name,
    azurerm_cosmosdb_sql_container.flags.name,
    azurerm_cosmosdb_sql_container.appeals.name,
    azurerm_cosmosdb_sql_container.appeal_votes.name,
    azurerm_cosmosdb_sql_container.notifications.name,
    azurerm_cosmosdb_sql_container.notification_preferences.name,
    azurerm_cosmosdb_sql_container.device_tokens.name,
    azurerm_cosmosdb_sql_container.notification_events.name,
    azurerm_cosmosdb_sql_container.publicProfiles.name,
    azurerm_cosmosdb_sql_container.messages.name,
    azurerm_cosmosdb_sql_container.counters.name,
    azurerm_cosmosdb_sql_container.reputation_audit.name,
    azurerm_cosmosdb_sql_container.privacy_requests.name,
    azurerm_cosmosdb_sql_container.legal_holds.name,
    azurerm_cosmosdb_sql_container.audit_logs.name,
    azurerm_cosmosdb_sql_container.config.name,
    azurerm_cosmosdb_sql_container.custom_feeds.name,
    azurerm_cosmosdb_sql_container.moderation_decisions.name,
    azurerm_cosmosdb_sql_container.receipt_events.name,
    azurerm_cosmosdb_sql_container.profiles.name,
    azurerm_cosmosdb_sql_container.privacy_audit.name,
    azurerm_cosmosdb_sql_container.moderation_weights.name,
  ]
}

output "partition_keys" {
  description = "Partition key mapping for each container"
  value = {
    users                    = "/id"
    posts                    = "/id"
    posts_v2                 = "/postId"
    auth_sessions            = "/partitionKey"
    invites                  = "/_partitionKey"
    userFeed                 = "/recipientId"
    comments                 = "/_partitionKey"
    reactions                = "/postId"
    flags                    = "/contentId"
    appeals                  = "/contentId"
    appeal_votes             = "/appealId"
    notifications            = "/recipientId"
    notification_preferences = "/userId"
    device_tokens            = "/userId"
    notification_events      = "/userId"
    publicProfiles           = "/userId"
    messages                 = "/conversationId"
    counters                 = "/userId"
    reputation_audit         = "/_partitionKey"
    privacy_requests         = "/id"
    legal_holds              = "/scopeId"
    audit_logs               = "/subjectId"
    config                   = "/partitionKey"
    custom_feeds             = "/partitionKey"
    moderation_decisions     = "/itemId"
    receipt_events           = "/postId"
    profiles                 = "/userId"
    privacy_audit            = "/id"
    ModerationWeights        = "/id"
  }
}
