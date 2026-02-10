# ─────────────────────────────────────────────────────────────────────────────
# posts_v2 container (migrated from posts)
# Provider, variables defined in cosmos_containers.tf
# ─────────────────────────────────────────────────────────────────────────────

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

  # Note: azurerm_cosmosdb_sql_container does not support tags directly;
  # tags should be applied at the account or database level.
  lifecycle {
    prevent_destroy = true # Protect production data
  }
}
