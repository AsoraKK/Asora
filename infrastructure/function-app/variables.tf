variable "resource_group_name" {
  description = "Name of the Azure resource group containing the function app"
  type        = string
  default     = "asora-psql-flex"
}

variable "function_app_name" {
  description = "Name of the Azure Function App"
  type        = string
  default     = "asora-function-dev"
}

variable "key_vault_name" {
  description = "Name of the Azure Key Vault containing secrets"
  type        = string
  default     = "kv-asora-dev"
}

variable "use_slot" {
  description = "Whether to use deployment slots (false for Flex Consumption)"
  type        = bool
  default     = false
}
