variable "account_name" {
  description = "Cosmos account name for development"
  type        = string
}

variable "database_name" {
  description = "Cosmos SQL database name"
  type        = string
}

variable "cosmos_resource_group" {
  description = "Resource group hosting the Cosmos account for this environment"
  type        = string
  default     = "asora-psql-flex"
}

variable "storage_location" {
  description = "Azure region for the DSR export storage account"
  type        = string
  default     = "eastus"
}

variable "storage_resource_group" {
  description = "Resource group for the DSR export storage account"
  type        = string
  default     = "asora-psql-flex"
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
  description = "Enable observability module resources for this environment"
  type        = bool
  default     = false
}

variable "observability_resource_group" {
  description = "Resource group for observability resources"
  type        = string
  default     = "asora-psql-flex"
}

variable "observability_location" {
  description = "Azure region for observability resources"
  type        = string
  default     = "eastus"
}

variable "observability_name_prefix" {
  description = "Name prefix for observability resources"
  type        = string
  default     = "asora-dev"
}

variable "observability_alert_email_addresses" {
  description = "Alert receiver emails for this environment"
  type        = list(string)
  default     = []
}

variable "function_app_resource_id" {
  description = "Function App resource ID monitored by observability alerts"
  type        = string
  default     = ""
}

variable "observability_tags" {
  description = "Additional tags applied to observability resources"
  type        = map(string)
  default     = {}
}
