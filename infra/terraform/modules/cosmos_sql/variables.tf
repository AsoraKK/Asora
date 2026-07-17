variable "resource_group" {
  description = "Existing resource group containing the Cosmos DB account."
  type        = string
}

variable "account_name" {
  description = "Existing Cosmos DB account name."
  type        = string
}

variable "database_name" {
  description = "Existing or explicitly managed SQL database name."
  type        = string
}

variable "index_dir" {
  description = "Directory containing container indexing-policy JSON files."
  type        = string
}

variable "mode" {
  description = "Cosmos capacity mode used to validate per-container throughput settings."
  type        = string

  validation {
    condition     = contains(["serverless", "autoscale", "provisioned"], var.mode)
    error_message = "mode must be serverless, autoscale, or provisioned."
  }
}

variable "manage_database" {
  description = "Whether this module is explicitly authorised to create the SQL database."
  type        = bool
  default     = false
}

variable "enable_analytical_storage" {
  description = "Whether analytical storage is enabled for non-serverless containers."
  type        = bool
  default     = false
}

variable "containers" {
  description = "Container definitions and indexing-policy file names."
  type = list(object({
    name           = string
    partition_key  = string
    index_file     = string
    throughput     = optional(number)
    max_throughput = optional(number)
  }))
}
