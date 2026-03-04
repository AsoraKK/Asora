resource "azurerm_cosmosdb_sql_container" "users" {
  name                = "users"
  partition_key_paths = ["/id"]
}

resource "azurerm_cosmosdb_sql_container" "posts" {
  name                = "posts"
  partition_key_paths = ["/id"]
}

resource "azurerm_cosmosdb_sql_container" "notification_events" {
  name                = "notification_events"
  partition_key_paths = ["/userId"]
}
