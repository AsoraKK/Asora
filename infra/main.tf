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

variable "location" {
  description = "Azure region"
  type        = string
  default     = "northeurope"  # North Europe
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
  type      = string
  sensitive = true
  description = "Admin password – define in terraform.tfvars or via TF_VAR_postgresql_password env var."
}

variable "client_ip" {
  type        = string
  description = "Client IP address for firewall rules - Set via TF_VAR_client_ip environment variable"
  # Remove hardcoded default - must be provided via environment variable
  # Set via: export TF_VAR_client_ip="your-client-ip"
}

# Secrets for Key Vault
variable "jwt_secret" {
  type        = string
  sensitive   = true
  description = "JWT secret for token signing"
}

variable "email_hash_salt" {
  type        = string
  sensitive   = true
  description = "Salt for email hashing"
}

variable "hive_text_key" {
  type        = string
  sensitive   = true
  description = "Hive AI Text Classification API key"
}

variable "hive_image_key" {
  type        = string
  sensitive   = true
  description = "Hive AI Image Classification API key"
}

variable "hive_deepfake_key" {
  type        = string
  sensitive   = true
  description = "Hive AI AI-Generated & Deepfake Detection API key"
}

variable "enable_redis_cache" {
  description = "Enable Redis cache for feed caching (use only if FEED_CACHE_BACKEND=redis)"
  type        = bool
  default     = false
  
  validation {
    condition     = can(var.enable_redis_cache)
    error_message = "enable_redis_cache must be a boolean value."
  }
}

variable "feed_cache_backend" {
  description = "Feed caching backend to use (edge, redis, or none)"
  type        = string
  default     = "edge"
  
  validation {
    condition = contains(["edge", "redis", "none"], var.feed_cache_backend)
    error_message = "feed_cache_backend must be one of: edge, redis, none."
  }
}

variable "edge_telemetry_secret" {
  description = "Shared secret for edge telemetry authentication"
  type        = string
  sensitive   = true
}

variable "alert_email_address" {
  description = "Email address for receiving alerts from Application Insights"
  type        = string
  default     = null
}

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
  zone                    = "3"
  name                   = "asora-pg-dev-ne"
  resource_group_name    = azurerm_resource_group.rg.name
  location               = azurerm_resource_group.rg.location

  administrator_login     = var.postgresql_admin
  administrator_password  = var.postgresql_password

  sku_name                = "B_Standard_B1ms"   # 1 vCPU / 2 GiB RAM
  storage_mb              = 32768               # 32 GiB
  version                 = 16

  backup_retention_days   = 7
  geo_redundant_backup_enabled = false

  authentication {
    password_auth_enabled = true
  }

  tags = {
    application     = "Asora-Mobile"
    env             = "Development"
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
  name                = "asora-cosmos-dev"
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
    env             = "Development"
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

############################################
# REDIS CACHE (Optional - only when enable_redis_cache=true)
############################################

# Redis Cache for feed caching fallback (when FEED_CACHE_BACKEND=redis)
resource "azurerm_redis_cache" "asora_redis" {
  count = var.enable_redis_cache ? 1 : 0
  
  name                = "asora-redis-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name
  capacity            = 0  # Basic C0 SKU
  family              = "C"
  sku_name           = "Basic"
  
  # Enable TLS for secure connections
  minimum_tls_version = "1.2"
  
  # Disable public network access in production
  public_network_access_enabled = var.environment == "development" ? true : false
  
  # Redis configuration
  redis_configuration {
    # maxmemory_policy = "volatile-lru"  # Would enable this for Standard+ SKUs
  }
  
  tags = {
    Environment = var.environment
    Project     = "asora"
    Purpose     = "feed-caching-fallback"
    azd-env-name = var.environment
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

output "redis_primary_connection_string" {
  description = "Primary connection string for Redis cache"
  value       = var.enable_redis_cache ? azurerm_redis_cache.asora_redis[0].primary_connection_string : ""
  sensitive   = true
}
