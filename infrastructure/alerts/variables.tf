variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
  default     = "asora-psql-flex"
}

variable "function_app_name" {
  description = "Name of the Azure Function App"
  type        = string
  default     = "asora-function-dev"
}

variable "app_insights_name" {
  description = "Name of the Application Insights instance"
  type        = string
  default     = "appi-asora-dev"
}

variable "alert_email" {
  description = "Email address for alert notifications"
  type        = string
  default     = "devops@asora.app"
}

variable "webhook_url" {
  description = "Optional webhook URL for alert notifications (e.g., PagerDuty, Slack)"
  type        = string
  default     = ""
}
