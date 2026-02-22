variable "resource_group_name" {
  description = "Name of the Azure resource group containing all targets"
  type        = string
  default     = "asora-psql-flex"
}

variable "alert_targets" {
  description = <<-DESC
    Map of Function App name → alert configuration.
    Each entry creates a pair of alert rules (5xx rate + health failure).
    The key must match both the Function App name and (by default) the
    Application Insights component name.
  DESC

  type = map(object({
    severity          = number         # Azure Monitor severity (1-4)
    app_insights_name = optional(string) # Override if AI name differs from FA name
  }))

  default = {
    "asora-function-flex" = {
      severity          = 2    # Production — Warning
      app_insights_name = null # same as function app name
    }
    "asora-function-dev" = {
      severity          = 3    # Dev — Informational
      app_insights_name = null
    }
  }
}

variable "alert_email" {
  description = "Email address for alert notifications"
  type        = string
  default     = "kyle@asora.co.za"
}

variable "webhook_url" {
  description = "Optional webhook URL for alert notifications (e.g., PagerDuty, Slack)"
  type        = string
  default     = ""
}
