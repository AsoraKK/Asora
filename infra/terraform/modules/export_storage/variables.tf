variable "env" {
  type        = string
  description = "Short environment slug used in storage account naming."
}

variable "location" {
  type        = string
  description = "Azure region for the storage account."
}

variable "resource_group" {
  type        = string
  description = "Resource group where the storage account will be created."
}

variable "function_principal_id" {
  type        = string
  description = "Object ID of the Function App's system-assigned managed identity."

  validation {
    condition     = var.function_principal_id != ""
    error_message = "function_principal_id cannot be empty."
  }
}

variable "vnet_subnet_id" {
  type        = string
  description = "Optional subnet ID for a private endpoint to the Functions VNet."
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Additional tags to apply to the storage account."
  default     = {}
}
