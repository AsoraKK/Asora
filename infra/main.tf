terraform {
  required_version = ">= 1.9.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.30.0"
    }
  }
}

variable "subscription_id" {
  description = "Azure Subscription ID - Set via TF_VAR_subscription_id environment variable"
  type        = string
  # Remove hardcoded default - must be provided via environment variable
  # Set via: export TF_VAR_subscription_id="your-subscription-id"
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

############################################
# VARIABLES
############################################

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
  default     = ""
}

# Local values for consistent naming
locals {
  env         = lower(var.environment)
  name_prefix = var.name_prefix != "" ? var.name_prefix : "asora-${local.env}"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "northeurope" # North Europe
}

variable "resource_group_name" {
  type    = string
  default = "asora-psql-flex"
}

variable "postgresql_admin" {
  type    = string
  default = "KyleKern"
}

variable "postgresql_password" {
  type        = string
  sensitive   = true
  description = "Admin password – define in terraform.tfvars or via TF_VAR_postgresql_password env var."
}

variable "client_ip" {
  type        = string
  description = "Client IP address for firewall rules - Set via TF_VAR_client_ip environment variable"
  # Remove hardcoded default - must be provided via environment variable
  # Set via: export TF_VAR_client_ip="your-client-ip"
}

# Note: Key Vault secrets (jwt_secret, email_hash_salt, hive_*_key) are managed
# via Azure Portal / CLI until Key Vault Terraform module is implemented.
# See: AZURE_FUNCTIONS_KEYVAULT_NOTES.md for current secret management approach.

variable "enable_redis_cache" {
  description = "Enable Redis cache for feed caching (use only if FEED_CACHE_BACKEND=redis)"
  type        = bool
  default     = false

  validation {
    condition     = can(var.enable_redis_cache)
    error_message = "enable_redis_cache must be a boolean value."
  }
}

# Note: feed_cache_backend, edge_telemetry_secret, and alert_email_address
# are reserved for future edge caching and alerting implementation.

############################################
# RESOURCE GROUP
############################################

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

############################################
# POSTGRESQL FLEXIBLE SERVER
############################################

resource "azurerm_postgresql_flexible_server" "pg" {
  zone                = "3"
  name                = "${local.name_prefix}-pg-${replace(var.location, " ", "")}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  administrator_login    = var.postgresql_admin
  administrator_password = var.postgresql_password

  sku_name   = "B_Standard_B1ms" # 1 vCPU / 2 GiB RAM
  storage_mb = 32768             # 32 GiB
  version    = 16

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  authentication {
    password_auth_enabled = true
  }

  tags = {
    application     = "Asora-Mobile"
    env             = title(local.env)
    region          = "NorthEU"
    confidentiality = "PII"
    sla             = "99.9%"
    department      = "Platform"
    costcenter      = "CC-12345"
    project         = "Asora-Launch"
  }
  lifecycle {
    prevent_destroy = true
  }
}

# Allow client IP firewall rule
resource "azurerm_postgresql_flexible_server_firewall_rule" "client_ip" {
  name             = "ClientIPAddress_2025-7-15_20-49-47"
  server_id        = azurerm_postgresql_flexible_server.pg.id
  start_ip_address = var.client_ip
  end_ip_address   = var.client_ip
}

############################################
# POSTGRESQL DATABASE
############################################

resource "azurerm_postgresql_flexible_server_database" "appdb" {
  name      = "asora_db"
  server_id = azurerm_postgresql_flexible_server.pg.id
  charset   = "UTF8"
  # Removed invalid collation argument. Use default or a supported value if needed.
}

############################################
# COSMOS DB (SERVERLESS, SQL API)
############################################

resource "azurerm_cosmosdb_account" "cosmos" {
  name                = "${local.name_prefix}-cosmos"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  capabilities {
    name = "EnableServerless"
  }

  geo_location {
    location          = azurerm_resource_group.rg.location
    failover_priority = 0
  }

  tags = {
    application     = "Asora-Mobile"
    env             = title(local.env)
    region          = "NorthEU"
    confidentiality = "PII"
    sla             = "99.9%"
    department      = "Platform"
    costcenter      = "CC-12345"
    project         = "Asora-Launch"
  }
  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_sql_database" "sqldb" {
  name                = "asora"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
}

resource "azurerm_cosmosdb_sql_container" "posts" {
  name                = "posts"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  database_name       = azurerm_cosmosdb_sql_database.sqldb.name
  partition_key_paths = ["/authorId"]
}

resource "azurerm_cosmosdb_sql_container" "flags" {
  name                = "flags"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  database_name       = azurerm_cosmosdb_sql_database.sqldb.name
  partition_key_paths = ["/contentId"]
}

resource "azurerm_cosmosdb_sql_container" "appeals" {
  name                = "appeals"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  database_name       = azurerm_cosmosdb_sql_database.sqldb.name
  partition_key_paths = ["/contentId"]
}

resource "azurerm_cosmosdb_sql_container" "moderation_decisions" {
  name                = "moderation_decisions"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  database_name       = azurerm_cosmosdb_sql_database.sqldb.name
  partition_key_paths = ["/contentId"]
}

############################################
# REDIS CACHE (Optional - only when enable_redis_cache=true)
############################################

# Redis Cache for feed caching fallback (when FEED_CACHE_BACKEND=redis)
resource "azurerm_redis_cache" "asora_redis" {
  count = var.enable_redis_cache ? 1 : 0

  name                = "asora-redis-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name
  capacity            = 0 # Basic C0 SKU
  family              = "C"
  sku_name            = "Basic"

  # Enable TLS for secure connections
  minimum_tls_version = "1.2"

  # Disable public network access in production
  public_network_access_enabled = var.environment == "development" ? true : false

  # Redis configuration
  redis_configuration {
    # maxmemory_policy = "volatile-lru"  # Would enable this for Standard+ SKUs
  }

  tags = {
    Environment  = var.environment
    Project      = "asora"
    Purpose      = "feed-caching-fallback"
    azd-env-name = var.environment
  }
}

############################################
# STORAGE ACCOUNT (for Function App)
############################################

resource "azurerm_storage_account" "function_storage" {
  name                     = "${replace(local.name_prefix, "-", "")}funcstorage"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  tags = {
    application     = "Asora-Mobile"
    env             = title(local.env)
    region          = "NorthEU"
    confidentiality = "PII"
    sla             = "99.9%"
    department      = "Platform"
    costcenter      = "CC-12345"
    project         = "Asora-Launch"
  }
}

############################################
# APP SERVICE PLAN (for Function App)
############################################

resource "azurerm_service_plan" "function_plan" {
  name                = "${local.name_prefix}-function-plan"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"
  sku_name            = "Y1" # Consumption plan

  tags = {
    application     = "Asora-Mobile"
    env             = title(local.env)
    region          = "NorthEU"
    confidentiality = "PII"
    sla             = "99.9%"
    department      = "Platform"
    costcenter      = "CC-12345"
    project         = "Asora-Launch"
  }
}

############################################
# FUNCTION APP
############################################

resource "azurerm_linux_function_app" "function_app" {
  name                       = "${local.name_prefix}-function"
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  service_plan_id            = azurerm_service_plan.function_plan.id
  storage_account_name       = azurerm_storage_account.function_storage.name
  storage_account_access_key = azurerm_storage_account.function_storage.primary_access_key

  site_config {
    application_stack {
      node_version = "20"
    }
  }

  app_settings = {
    FUNCTIONS_EXTENSION_VERSION  = "~4"
    FUNCTIONS_WORKER_RUNTIME     = "node"
    WEBSITE_NODE_DEFAULT_VERSION = "~20"
  }

  tags = {
    application     = "Asora-Mobile"
    env             = title(local.env)
    region          = "NorthEU"
    confidentiality = "PII"
    sla             = "99.9%"
    department      = "Platform"
    costcenter      = "CC-12345"
    project         = "Asora-Launch"
  }
}

############################################
# OUTPUTS
############################################

output "postgresql_fqdn" {
  value = azurerm_postgresql_flexible_server.pg.fqdn
}

output "cosmos_endpoint" {
  value = azurerm_cosmosdb_account.cosmos.endpoint
}

output "redis_cache_name" {
  description = "Name of the Redis cache instance"
  value       = var.enable_redis_cache ? azurerm_redis_cache.asora_redis[0].name : ""
}

output "redis_cache_hostname" {
  description = "Hostname of the Redis cache"
  value       = var.enable_redis_cache ? azurerm_redis_cache.asora_redis[0].hostname : ""
}

output "function_app_name" {
  description = "Name of the Function App"
  value       = azurerm_linux_function_app.function_app.name
}

output "redis_primary_connection_string" {
  description = "Primary connection string for Redis cache"
  value       = var.enable_redis_cache ? azurerm_redis_cache.asora_redis[0].primary_connection_string : ""
  sensitive   = true
}
