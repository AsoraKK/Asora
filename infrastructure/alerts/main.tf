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

# ──────────────────────────────────────────────────────────────
# Locals – derive per-target configuration from the targets map
# ──────────────────────────────────────────────────────────────
locals {
  targets = {
    for k, v in var.alert_targets : k => merge(v, {
      app_insights_name = coalesce(v.app_insights_name, k)
    })
  }
}

# ──────────────────────────────────────────────────────────────
# Data sources – one per target
# ──────────────────────────────────────────────────────────────
data "azurerm_application_insights" "target" {
  for_each            = local.targets
  name                = each.value.app_insights_name
  resource_group_name = var.resource_group_name
}

data "azurerm_linux_function_app" "target" {
  for_each            = local.targets
  name                = each.key
  resource_group_name = var.resource_group_name
}

# ──────────────────────────────────────────────────────────────
# Action group – one shared group for all targets
# ──────────────────────────────────────────────────────────────
resource "azurerm_monitor_action_group" "health_alerts" {
  name                = "ag-lythaus-health"
  resource_group_name = var.resource_group_name
  short_name          = "health"

  email_receiver {
    name                    = "Platform Owner"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }

  dynamic "webhook_receiver" {
    for_each = var.webhook_url != "" ? [1] : []
    content {
      name        = "webhook"
      service_uri = var.webhook_url
    }
  }
}

# ──────────────────────────────────────────────────────────────
# Alert: 5xx error rate > 1% over 5 minutes (per target)
# ──────────────────────────────────────────────────────────────
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "error_rate" {
  for_each            = local.targets
  name                = "alert-${each.key}-5xx-rate"
  resource_group_name = var.resource_group_name
  location            = data.azurerm_application_insights.target[each.key].location

  evaluation_frequency = "PT5M"
  window_duration      = "PT5M"
  scopes               = [data.azurerm_application_insights.target[each.key].id]
  severity             = each.value.severity

  criteria {
    query = <<-QUERY
      requests
      | where timestamp > ago(5m)
      | where cloud_RoleName == "${each.key}"
      | summarize
          total = count(),
          errors = countif(toint(resultCode) >= 500)
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
  description                      = "Triggers when 5xx error rate exceeds 1%% over 5 min on ${each.key}"
  display_name                     = "${each.key} - High 5xx Error Rate"
  enabled                          = true
  skip_query_validation            = false

  action {
    action_groups = [azurerm_monitor_action_group.health_alerts.id]
  }
}

# ──────────────────────────────────────────────────────────────
# Alert: Health endpoint failures (per target)
# ──────────────────────────────────────────────────────────────
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "health_failure" {
  for_each            = local.targets
  name                = "alert-${each.key}-health-fail"
  resource_group_name = var.resource_group_name
  location            = data.azurerm_application_insights.target[each.key].location

  evaluation_frequency = "PT5M"
  window_duration      = "PT5M"
  scopes               = [data.azurerm_application_insights.target[each.key].id]
  severity             = max(each.value.severity - 1, 1)

  criteria {
    query = <<-QUERY
      requests
      | where timestamp > ago(5m)
      | where cloud_RoleName == "${each.key}"
      | where name == "health" or url endswith "/api/health"
      | where toint(resultCode) >= 400
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
  description                      = "Triggers when /api/health returns non-2xx on ${each.key}"
  display_name                     = "${each.key} - Health Check Failure"
  enabled                          = true
  skip_query_validation            = false

  action {
    action_groups = [azurerm_monitor_action_group.health_alerts.id]
  }
}

# ──────────────────────────────────────────────────────────────
# Dashboard – combined health view for all targets
# ──────────────────────────────────────────────────────────────
resource "azurerm_portal_dashboard" "health_dashboard" {
  name                = "dash-lythaus-health"
  resource_group_name = var.resource_group_name
  location            = data.azurerm_application_insights.target["asora-function-flex"].location

  dashboard_properties = jsonencode({
    lenses = {
      "0" = {
        order = 0
        parts = merge(
          { for i, k in keys(local.targets) : tostring(i * 2) => {
            position = {
              x       = 0
              y       = i * 4
              colSpan = 6
              rowSpan = 4
            }
            metadata = {
              type = "Extension/HubsExtension/PartType/MarkdownPart"
              settings = {
                content = {
                  settings = {
                    content = "# ${k} Health (Sev ${local.targets[k].severity})\n\n- **Health**: [/api/health](https://${k}.azurewebsites.net/api/health)\n- [App Insights](https://portal.azure.com/#@/resource${data.azurerm_application_insights.target[k].id})\n- [Function App](https://portal.azure.com/#@/resource${data.azurerm_linux_function_app.target[k].id})\n- [Live Metrics](https://portal.azure.com/#@/resource${data.azurerm_application_insights.target[k].id}/quickPulse)"
                  }
                }
              }
            }
          }},
          { for i, k in keys(local.targets) : tostring(i * 2 + 1) => {
            position = {
              x       = 6
              y       = i * 4
              colSpan = 6
              rowSpan = 4
            }
            metadata = {
              type = "Extension/AppInsightsExtension/PartType/MetricsChartPart"
              inputs = [
                {
                  name  = "ComponentId"
                  value = data.azurerm_application_insights.target[k].id
                },
                {
                  name  = "Query"
                  value = "requests | where cloud_RoleName == '${k}' | where name == 'health' or url endswith '/api/health' | summarize Total = count(), Success = countif(resultCode < 400), Failures = countif(resultCode >= 400) by bin(timestamp, 5m) | project timestamp, Total, Success, Failures"
                }
              ]
              settings = {
                title = "${k} Health Requests (5 min)"
              }
            }
          }}
        )
      }
    }
  })
}

# ──────────────────────────────────────────────────────────────
# Outputs
# ──────────────────────────────────────────────────────────────
output "action_group_id" {
  description = "ID of the health alerts action group"
  value       = azurerm_monitor_action_group.health_alerts.id
}

output "alert_ids" {
  description = "IDs of created alert rules, keyed by target"
  value = {
    for k in keys(local.targets) : k => {
      error_rate  = azurerm_monitor_scheduled_query_rules_alert_v2.error_rate[k].id
      health_fail = azurerm_monitor_scheduled_query_rules_alert_v2.health_failure[k].id
    }
  }
}

output "dashboard_url" {
  description = "Direct link to the combined health dashboard"
  value       = "https://portal.azure.com/#@/dashboard/arm${azurerm_portal_dashboard.health_dashboard.id}"
}
