terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.114"
    }
  }
}

provider "azurerm" {
  features {}
}

data "azurerm_application_insights" "target" {
  name                = var.app_insights_name
  resource_group_name = var.resource_group_name
}

data "azurerm_linux_function_app" "target" {
  name                = var.function_app_name
  resource_group_name = var.resource_group_name
}

# Action group for health alerts
resource "azurerm_monitor_action_group" "health_alerts" {
  name                = "ag-${var.function_app_name}-health"
  resource_group_name = var.resource_group_name
  short_name          = "health"

  email_receiver {
    name                    = "DevOps Team"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }

  # Optional: webhook for PagerDuty/Slack
  dynamic "webhook_receiver" {
    for_each = var.webhook_url != "" ? [1] : []
    content {
      name        = "webhook"
      service_uri = var.webhook_url
    }
  }
}

# Alert: 5xx rate > 1% over 5 minutes
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "error_rate" {
  name                = "alert-${var.function_app_name}-5xx-rate"
  resource_group_name = var.resource_group_name
  location            = data.azurerm_application_insights.target.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT5M"
  scopes               = [data.azurerm_application_insights.target.id]
  severity             = 2

  criteria {
    query = <<-QUERY
      requests
      | where timestamp > ago(5m)
      | where cloud_RoleName == "${var.function_app_name}"
      | summarize
          total = count(),
          errors = countif(resultCode >= 500)
      | extend error_rate = todouble(errors) / todouble(total) * 100.0
      | where error_rate > 1.0
    QUERY

    time_aggregation_method = "Count"
    threshold               = 1.0
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  auto_mitigation_enabled          = true
  workspace_alerts_storage_enabled = false
  description                      = "Triggers when 5xx error rate exceeds 1% over 5 minutes"
  display_name                     = "${var.function_app_name} - High 5xx Error Rate"
  enabled                          = true
  skip_query_validation            = false

  action {
    action_groups = [azurerm_monitor_action_group.health_alerts.id]
  }
}

# Alert: Health endpoint failures
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "health_failure" {
  name                = "alert-${var.function_app_name}-health-fail"
  resource_group_name = var.resource_group_name
  location            = data.azurerm_application_insights.target.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT5M"
  scopes               = [data.azurerm_application_insights.target.id]
  severity             = 1

  criteria {
    query = <<-QUERY
      requests
      | where timestamp > ago(5m)
      | where cloud_RoleName == "${var.function_app_name}"
      | where name == "health" or url endswith "/api/health"
      | where resultCode >= 400
      | summarize failures = count()
      | where failures > 0
    QUERY

    time_aggregation_method = "Count"
    threshold               = 0
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  auto_mitigation_enabled          = true
  workspace_alerts_storage_enabled = false
  description                      = "Triggers when /api/health returns non-2xx status"
  display_name                     = "${var.function_app_name} - Health Check Failure"
  enabled                          = true
  skip_query_validation            = false

  action {
    action_groups = [azurerm_monitor_action_group.health_alerts.id]
  }
}

# Dashboard tile showing health status
resource "azurerm_portal_dashboard" "health_dashboard" {
  name                = "dash-${var.function_app_name}-health"
  resource_group_name = var.resource_group_name
  location            = data.azurerm_application_insights.target.location

  dashboard_properties = jsonencode({
    lenses = [
      {
        order = 0
        parts = [
          {
            position = {
              x       = 0
              y       = 0
              colSpan = 6
              rowSpan = 4
            }
            metadata = {
              type = "Extension/HubsExtension/PartType/MarkdownPart"
              settings = {
                content = {
                  settings = {
                    content = <<-MD
                      # ${var.function_app_name} Health Status
                      
                      ## Current Status
                      - **Version**: See Application Insights custom dimensions (`version`)
                      - **Last Deploy**: Check `GIT_SHA` app setting
                      - **Health Endpoint**: [/api/health](https://${var.function_app_name}.azurewebsites.net/api/health)
                      
                      ## Quick Links
                      - [Application Insights](https://portal.azure.com/#@/resource${data.azurerm_application_insights.target.id})
                      - [Function App](https://portal.azure.com/#@/resource${data.azurerm_linux_function_app.target.id})
                      - [Live Metrics](https://portal.azure.com/#@/resource${data.azurerm_application_insights.target.id}/quickPulse)
                    MD
                  }
                }
              }
            }
          },
          {
            position = {
              x       = 6
              y       = 0
              colSpan = 6
              rowSpan = 4
            }
            metadata = {
              type = "Extension/AppInsightsExtension/PartType/MetricsChartPart"
              inputs = [
                {
                  name  = "ComponentId"
                  value = data.azurerm_application_insights.target.id
                },
                {
                  name = "Query"
                  value = jsonencode({
                    query = <<-KQL
                      requests
                      | where name == "health" or url endswith "/api/health"
                      | summarize
                          Total = count(),
                          Success = countif(resultCode < 400),
                          Failures = countif(resultCode >= 400)
                        by bin(timestamp, 5m)
                      | project timestamp, Total, Success, Failures
                    KQL
                  })
                }
              ]
              settings = {
                title = "Health Endpoint Requests (5min bins)"
              }
            }
          }
        ]
      }
    ]
  })
}

output "action_group_id" {
  description = "ID of the health alerts action group"
  value       = azurerm_monitor_action_group.health_alerts.id
}

output "alert_ids" {
  description = "IDs of created alerts"
  value = {
    error_rate_alert  = azurerm_monitor_scheduled_query_rules_alert_v2.error_rate.id
    health_fail_alert = azurerm_monitor_scheduled_query_rules_alert_v2.health_failure.id
  }
}

output "dashboard_url" {
  description = "URL to the health dashboard"
  value       = "https://portal.azure.com/#@/dashboard/arm${azurerm_portal_dashboard.health_dashboard.id}"
}
