variable "account_name" {
  description = "Cosmos account name for development"
  type        = string
}

variable "database_name" {
  description = "Cosmos SQL database name"
  type        = string
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
