variable "resource_group" {
  description = "Resource group containing the Cosmos DB account"
  type        = string
}

variable "account_name" {
  description = "Cosmos DB account name"
  type        = string
}

variable "database_name" {
  description = "Cosmos DB SQL database name"
  type        = string
}

variable "index_policy_file" {
  description = "Override path to the committed indexing policies JSON"
  type        = string
  default     = null
}