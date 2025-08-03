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
  description = "Hive AI Deepfake Detection API key"
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
# OUTPUTS
############################################

output "postgresql_fqdn" {
  value = azurerm_postgresql_flexible_server.pg.fqdn
}

output "cosmos_endpoint" {
  value = azurerm_cosmosdb_account.cosmos.endpoint
}
