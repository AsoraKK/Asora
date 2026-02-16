variable "account_name" {
  description = "Cosmos account name for production"
  type        = string
}

variable "database_name" {
  description = "Cosmos SQL database name"
  type        = string
}

variable "cosmos_resource_group" {
  description = "Resource group hosting the Cosmos account for production"
  type        = string
  default     = "asora-prod-rg"

  validation {
    condition     = var.cosmos_resource_group != "asora-psql-flex"
    error_message = "Production Cosmos must not target shared dev/staging resource group asora-psql-flex."
  }
}

variable "storage_location" {
  description = "Azure region for the DSR export storage account"
  type        = string
  default     = "eastus2"
}

variable "storage_resource_group" {
  description = "Resource group for the DSR export storage account"
  type        = string
  default     = "asora-prod-rg"

  validation {
    condition     = var.storage_resource_group != "asora-psql-flex"
    error_message = "Production storage must not target shared dev/staging resource group asora-psql-flex."
  }
}

variable "function_principal_id" {
  description = "Managed identity object ID for the privacy function app"
  type        = string
}

variable "storage_vnet_subnet_id" {
  description = "Optional subnet ID to bind a private endpoint"
  type        = string
  default     = ""
}

variable "storage_tags" {
  description = "Additional tags applied to DSR storage"
  type        = map(string)
  default     = {}
}

variable "observability_enabled" {
  description = "Enable observability module resources for production"
  type        = bool
  default     = true
}

variable "observability_resource_group" {
  description = "Resource group for observability resources"
  type        = string
  default     = "asora-prod-rg"

  validation {
    condition     = var.observability_resource_group != "asora-psql-flex"
    error_message = "Production observability must not target shared dev/staging resource group asora-psql-flex."
  }
}

variable "observability_location" {
  description = "Azure region for observability resources"
  type        = string
  default     = "eastus2"
}

variable "observability_name_prefix" {
  description = "Name prefix for observability resources"
  type        = string
  default     = "asora-prod"
}

variable "observability_alert_email_addresses" {
  description = "Alert receiver emails for production"
  type        = list(string)
  default     = []
}

variable "function_app_resource_id" {
  description = "Production Function App resource ID monitored by observability alerts"
  type        = string
  default     = ""
}

variable "observability_tags" {
  description = "Additional tags applied to observability resources"
  type        = map(string)
  default     = {}
}
