variable "environment" {
  description = "Deployment environment; defaults to terraform.workspace"
  type        = string
  default     = terraform.workspace

  validation {
    condition     = var.environment != "default" && contains(["dev", "stage", "prod"], var.environment)
    error_message = "Invalid environment: must be one of dev, stage, prod and not 'default'. Use 'terraform workspace select <env>'."
  }
}

locals {
  env_name = (
    var.environment == "prod"  ? "prod"  :
    var.environment == "stage" ? "stage" :
    var.environment == "dev"   ? "dev"   :
    var.environment
  )

  common_tags = {
    application = "Asora"
    env         = local.env_name
  }
}
