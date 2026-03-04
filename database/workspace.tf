variable "environment" {
  description = "Deployment environment; should match terraform.workspace (dev, stage, prod)"
  type        = string
  default     = null # Must be passed explicitly or use -var="environment=$(terraform workspace show)"

  validation {
    condition     = var.environment != null && var.environment != "default" && contains(["dev", "stage", "prod"], var.environment)
    error_message = "Invalid environment: must be one of dev, stage, prod. Pass via -var='environment=dev' or CI variable."
  }
}

locals {
  env_name = (
    var.environment == "prod" ? "prod" :
    var.environment == "stage" ? "stage" :
    var.environment == "dev" ? "dev" :
    var.environment
  )

  common_tags = {
    application = "Asora"
    env         = local.env_name
    managed_by  = "Terraform"
  }
}
