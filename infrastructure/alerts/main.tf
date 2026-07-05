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
# Alert: Auth 401 spike (per target)
# Fires when 401 responses exceed threshold in 5 minutes.
# Detects: brute-force attempts, token expiry storms, config issues
# ──────────────────────────────────────────────────────────────
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "auth_401_spike" {
  for_each            = local.targets
  name                = "alert-${each.key}-auth-401-spike"
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
      | where toint(resultCode) == 401
      | summarize count_401 = count()
      | where count_401 > ${var.auth_alert_401_threshold}
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
  description                      = "Triggers when 401 responses exceed ${var.auth_alert_401_threshold} in 5 min on ${each.key} — possible brute-force or token expiry storm"
  display_name                     = "${each.key} - Auth 401 Spike"
  enabled                          = true
  skip_query_validation            = false

  action {
    action_groups = [azurerm_monitor_action_group.health_alerts.id]
  }
}

# ──────────────────────────────────────────────────────────────
# Alert: Refresh token reuse detection (per target)
# Fires when ANY token reuse event is detected.
# Severity: Critical — indicates possible credential theft.
# ──────────────────────────────────────────────────────────────
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "auth_token_reuse" {
  for_each            = local.targets
  name                = "alert-${each.key}-token-reuse"
  resource_group_name = var.resource_group_name
  location            = data.azurerm_application_insights.target[each.key].location

  evaluation_frequency = "PT5M"
  window_duration      = "PT5M"
  scopes               = [data.azurerm_application_insights.target[each.key].id]
  severity             = 1

  criteria {
    query = <<-QUERY
      traces
      | where timestamp > ago(5m)
      | where cloud_RoleName == "${each.key}"
      | where message has "Refresh token reuse"
         or customDimensions.eventType == "auth.security.token_reuse"
      | summarize reuse_count = count()
      | where reuse_count >= ${var.auth_alert_reuse_threshold}
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
  description                      = "CRITICAL: Refresh token reuse detected on ${each.key} — possible credential theft. Investigate immediately."
  display_name                     = "${each.key} - Token Reuse (Critical)"
  enabled                          = true
  skip_query_validation            = false

  action {
    action_groups = [azurerm_monitor_action_group.health_alerts.id]
  }
}

# ──────────────────────────────────────────────────────────────
# Alert: Auth failure rate > 10% (per target)
# Fires when >10% of auth-related requests fail over 5 minutes.
# Detects: misconfigured clients, JWT secret rotation issues.
# ──────────────────────────────────────────────────────────────
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "auth_failure_rate" {
  for_each            = local.targets
  name                = "alert-${each.key}-auth-fail-rate"
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
      | where name has "auth" or url has "/api/auth/"
      | summarize
          total = count(),
          failures = countif(toint(resultCode) == 401 or toint(resultCode) == 403)
      | where total >= 10
      | extend fail_rate = todouble(failures) / todouble(total) * 100.0
      | where fail_rate > 10.0
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
  description                      = "Triggers when >10%% of auth requests fail (401/403) over 5 min on ${each.key}"
  display_name                     = "${each.key} - High Auth Failure Rate"
  enabled                          = true
  skip_query_validation            = false

  action {
    action_groups = [azurerm_monitor_action_group.health_alerts.id]
  }
}

# ──────────────────────────────────────────────────────────────
# Alert: DSR requests stuck queued > 5 minutes (per target)
# Uses privacyDsrQueueMonitor telemetry.
# ──────────────────────────────────────────────────────────────
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "dsr_stuck_queued" {
  for_each            = local.targets
  name                = "alert-${each.key}-dsr-stuck-queued"
  resource_group_name = var.resource_group_name
  location            = data.azurerm_application_insights.target[each.key].location

  evaluation_frequency = "PT5M"
  window_duration      = "PT10M"
  scopes               = [data.azurerm_application_insights.target[each.key].id]
  severity             = max(each.value.severity - 1, 1)

  criteria {
    query = <<-QUERY
      traces
      | where timestamp > ago(10m)
      | where operation_Name == "privacyDsrQueueMonitor"
      | where message startswith "dsr.queue.monitor"
      | extend stuckQueuedCount = toint(extract(@"stuckQueuedCount:\s*(\d+)", 1, message))
      | summarize arg_max(timestamp, stuckQueuedCount)
      | where stuckQueuedCount > 0
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
  description                      = "Triggers when privacy_requests has queued DSR requests older than 5 minutes on ${each.key}"
  display_name                     = "${each.key} - DSR Stuck Queued"
  enabled                          = true
  skip_query_validation            = false

  action {
    action_groups = [azurerm_monitor_action_group.health_alerts.id]
  }
}

# ──────────────────────────────────────────────────────────────
# Alert: DSR queue depth > 0 for more than 5 minutes (per target)
# Uses privacyDsrQueueMonitor telemetry.
# ──────────────────────────────────────────────────────────────
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "dsr_queue_depth" {
  for_each            = local.targets
  name                = "alert-${each.key}-dsr-queue-depth"
  resource_group_name = var.resource_group_name
  location            = data.azurerm_application_insights.target[each.key].location

  evaluation_frequency = "PT5M"
  window_duration      = "PT10M"
  scopes               = [data.azurerm_application_insights.target[each.key].id]
  severity             = max(each.value.severity - 1, 1)

  criteria {
    query = <<-QUERY
      traces
      | where timestamp > ago(10m)
      | where operation_Name == "privacyDsrQueueMonitor"
      | where message startswith "dsr.queue.monitor"
      | extend approximateMessageCount = toint(extract(@"approximateMessageCount:\s*(\d+)", 1, message))
      | summarize samples=count(), positiveSamples=countif(approximateMessageCount > 0)
      | where samples >= 2 and positiveSamples >= 2
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
  description                      = "Triggers when DSR queue depth is greater than 0 across two monitor samples on ${each.key}"
  display_name                     = "${each.key} - DSR Queue Depth"
  enabled                          = true
  skip_query_validation            = false

  action {
    action_groups = [azurerm_monitor_action_group.health_alerts.id]
  }
}

# ──────────────────────────────────────────────────────────────
# Alert: DSR failures > 0 (per target)
# Covers failed queue handler events and persisted failed DSR requests.
# ──────────────────────────────────────────────────────────────
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "dsr_failures" {
  for_each            = local.targets
  name                = "alert-${each.key}-dsr-failures"
  resource_group_name = var.resource_group_name
  location            = data.azurerm_application_insights.target[each.key].location

  evaluation_frequency = "PT5M"
  window_duration      = "PT10M"
  scopes               = [data.azurerm_application_insights.target[each.key].id]
  severity             = max(each.value.severity - 1, 1)

  criteria {
    query = <<-QUERY
      let failedHandlerEvents =
        traces
        | where timestamp > ago(10m)
        | where message startswith "dsr.queue.failed"
        | summarize failedHandlerCount = count();
      let failedRequestSnapshots =
        traces
        | where timestamp > ago(10m)
        | where operation_Name == "privacyDsrQueueMonitor"
        | where message startswith "dsr.queue.monitor"
        | extend failedRequestCount = toint(extract(@"failedRequestCount:\s*(\d+)", 1, message))
        | summarize arg_max(timestamp, failedRequestCount);
      failedHandlerEvents
      | extend joinKey = 1
      | join kind=fullouter (failedRequestSnapshots | extend joinKey = 1) on joinKey
      | extend totalFailures = coalesce(failedHandlerCount, 0) + coalesce(failedRequestCount, 0)
      | where totalFailures > 0
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
  description                      = "Triggers when DSR queue failures or persisted failed DSR requests are detected on ${each.key}"
  display_name                     = "${each.key} - DSR Failures"
  enabled                          = true
  skip_query_validation            = false

  action {
    action_groups = [azurerm_monitor_action_group.health_alerts.id]
  }
}

# ──────────────────────────────────────────────────────────────
# Alert: DSR poison queue exists or has messages (per target)
# Uses privacyDsrQueueMonitor telemetry.
# ──────────────────────────────────────────────────────────────
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "dsr_poison_queue" {
  for_each            = local.targets
  name                = "alert-${each.key}-dsr-poison-queue"
  resource_group_name = var.resource_group_name
  location            = data.azurerm_application_insights.target[each.key].location

  evaluation_frequency = "PT5M"
  window_duration      = "PT10M"
  scopes               = [data.azurerm_application_insights.target[each.key].id]
  severity             = 1

  criteria {
    query = <<-QUERY
      traces
      | where timestamp > ago(10m)
      | where operation_Name == "privacyDsrQueueMonitor"
      | where message startswith "dsr.queue.monitor"
      | extend poisonQueueExists = tobool(extract(@"poisonQueueExists:\s*(true|false)", 1, message))
      | extend poisonApproximateMessageCount = toint(extract(@"poisonApproximateMessageCount:\s*(\d+)", 1, message))
      | summarize arg_max(timestamp, poisonQueueExists, poisonApproximateMessageCount)
      | where poisonQueueExists == true or poisonApproximateMessageCount > 0
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
  description                      = "CRITICAL: DSR poison queue exists or contains messages on ${each.key}"
  display_name                     = "${each.key} - DSR Poison Queue"
  enabled                          = true
  skip_query_validation            = false

  action {
    action_groups = [azurerm_monitor_action_group.health_alerts.id]
  }
}

# ──────────────────────────────────────────────────────────────
# Alert: DSR enqueue without completion telemetry (per target)
# Detects queue work that was accepted but did not produce dsr.queue.completed.
# ──────────────────────────────────────────────────────────────
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "dsr_missing_completion" {
  for_each            = local.targets
  name                = "alert-${each.key}-dsr-missing-completion"
  resource_group_name = var.resource_group_name
  location            = data.azurerm_application_insights.target[each.key].location

  evaluation_frequency = "PT5M"
  window_duration      = "PT10M"
  scopes               = [data.azurerm_application_insights.target[each.key].id]
  severity             = max(each.value.severity - 1, 1)

  criteria {
    query = <<-QUERY
      let enqueued =
        traces
        | where timestamp > ago(10m)
        | where message startswith "dsr.export.enqueued" or message startswith "dsr.delete.enqueued"
        | extend requestId = tostring(extract(@"id:\s*'([^']+)'", 1, message))
        | where isnotempty(requestId)
        | where timestamp < ago(5m)
        | project requestId, enqueueTimestamp = timestamp;
      let completed =
        traces
        | where timestamp > ago(10m)
        | where message startswith "dsr.queue.completed"
        | extend requestId = tostring(extract(@"requestId:\s*'([^']+)'", 1, message))
        | where isnotempty(requestId)
        | project requestId;
      enqueued
      | join kind=leftanti completed on requestId
      | summarize missingCompletionCount = count()
      | where missingCompletionCount > 0
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
  description                      = "Triggers when a DSR enqueue has no dsr.queue.completed telemetry after 5 minutes on ${each.key}"
  display_name                     = "${each.key} - DSR Missing Completion"
  enabled                          = true
  skip_query_validation            = false

  action {
    action_groups = [azurerm_monitor_action_group.health_alerts.id]
  }
}
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
          } },
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
          } }
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
      error_rate             = azurerm_monitor_scheduled_query_rules_alert_v2.error_rate[k].id
      health_fail            = azurerm_monitor_scheduled_query_rules_alert_v2.health_failure[k].id
      auth_401_spike         = azurerm_monitor_scheduled_query_rules_alert_v2.auth_401_spike[k].id
      token_reuse            = azurerm_monitor_scheduled_query_rules_alert_v2.auth_token_reuse[k].id
      auth_fail_rate         = azurerm_monitor_scheduled_query_rules_alert_v2.auth_failure_rate[k].id
      dsr_stuck_queued       = azurerm_monitor_scheduled_query_rules_alert_v2.dsr_stuck_queued[k].id
      dsr_queue_depth        = azurerm_monitor_scheduled_query_rules_alert_v2.dsr_queue_depth[k].id
      dsr_failures           = azurerm_monitor_scheduled_query_rules_alert_v2.dsr_failures[k].id
      dsr_poison_queue       = azurerm_monitor_scheduled_query_rules_alert_v2.dsr_poison_queue[k].id
      dsr_missing_completion = azurerm_monitor_scheduled_query_rules_alert_v2.dsr_missing_completion[k].id
    }
  }
}

output "dashboard_url" {
  description = "Direct link to the combined health dashboard"
  value       = "https://portal.azure.com/#@/dashboard/arm${azurerm_portal_dashboard.health_dashboard.id}"
}
