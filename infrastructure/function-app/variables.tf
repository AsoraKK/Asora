variable "resource_group_name" {
  description = "Name of the Azure resource group containing the function app"
  type        = string
  default     = "asora-psql-flex" # Note: env-agnostic; override per environment
}

variable "function_app_name" {
  description = "Name of the Azure Function App (should include environment suffix, e.g., asora-function-dev)"
  type        = string
  # No default: caller must provide env-specific name to avoid accidental dev bias
}

variable "key_vault_name" {
  description = "Name of the Azure Key Vault containing secrets (should include environment suffix, e.g., kv-asora-dev)"
  type        = string
  # No default: caller must provide env-specific name to avoid accidental dev bias
}

variable "use_slot" {
  description = "Whether to use deployment slots (false for Flex Consumption)"
  type        = bool
  default     = false
}
