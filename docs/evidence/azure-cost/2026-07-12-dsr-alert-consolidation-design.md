# DSR Alert Consolidation Design

**Date:** 2026-07-12
**Approval:** AZ-COST-04, repo-only design/proposal work
**Live Azure status:** No DSR alert rule was created, changed, disabled, or deleted.

## Decision

Use a **five-to-three** consolidation, not five-to-two.

The current rules have two severities:

| Signal | Current severity | Proposed rule |
|---|---:|---|
| Stuck queued | Sev2 | Consolidated DSR state, Sev2 |
| Queue depth | Sev2 | Consolidated DSR state, Sev2 |
| Failures | Sev2 | Consolidated DSR state, Sev2 |
| Poison queue | Sev1 | Keep existing poison rule unchanged |
| Missing completion | Sev2 | Keep existing completion rule unchanged |

Azure severity is configured at the alert-rule level, not per `Signal` dimension. A two-rule design would either downgrade poison from Sev1 or promote all state signals to Sev1. Neither is equivalent to the current operational contract.

## Expected saving

- Current normalized rule cost: approximately $1.65 per five-minute rule per month.
- Retire two rules after replacement validation: approximately **$3.30/month** gross saving.
- A `Signal` dimension may add a small time-series charge, so the final saving must be verified in the Terraform plan and Azure portal estimate.

## Current live blocker

At 2026-07-12T19:50Z, `privacyDsrQueueMonitor` reported:

- main queue depth: `0`
- stuck queued: `0`
- poison queue exists: `true`
- poison queue depth: `2`
- persisted failed requests: `2`
- new `dsr.queue.failed` traces in the prior 24 hours: `0`

The live poison and failure KQL queries both returned results, but Alerts Management showed no active poison/failure alert instance. Only an older resolved missing-completion alert was visible.

**Gate:** do not consolidate live rules until the existing poison and failure rules are proven to fire and notify through `ag-lythaus-health`.

## Candidate consolidated KQL

This query preserves the current stuck, depth, and failure conditions and returns a numeric `Value` split by `Signal`.

```kusto
let monitor = traces
| where timestamp > ago(10m)
| where operation_Name == "privacyDsrQueueMonitor"
| where message startswith "dsr.queue.monitor"
| extend
    approximateMessageCount = toint(extract(@"approximateMessageCount:\s*(\d+)", 1, message)),
    stuckQueuedCount = toint(extract(@"stuckQueuedCount:\s*(\d+)", 1, message)),
    failedRequestCount = toint(extract(@"failedRequestCount:\s*(\d+)", 1, message));
let snapshot = monitor
| summarize arg_max(timestamp, stuckQueuedCount, failedRequestCount, approximateMessageCount);
let depth = monitor
| summarize
    samples = count(),
    positiveSamples = countif(approximateMessageCount > 0);
let failedHandlers = traces
| where timestamp > ago(10m)
| where message startswith "dsr.queue.failed"
| summarize handlerFailures = count();
union
(
    snapshot
    | where stuckQueuedCount > 0
    | project Signal = "stuck_queued", Value = tolong(stuckQueuedCount)
),
(
    depth
    | where samples >= 2 and positiveSamples >= 2
    | project Signal = "queue_depth", Value = tolong(positiveSamples)
),
(
    snapshot
    | extend joinKey = 1
    | join kind=fullouter (failedHandlers | extend joinKey = 1) on joinKey
    | extend totalFailures = coalesce(failedRequestCount, 0) + coalesce(handlerFailures, 0)
    | where totalFailures > 0
    | project Signal = "failures", Value = tolong(totalFailures)
)
| summarize Value = max(Value) by Signal
```

### Read-only validation result

The query executed successfully against `appi-asora-function-dev-dsr` and returned:

| Signal | Value |
|---|---:|
| `failures` | 2 |

It correctly omitted `stuck_queued` and `queue_depth` because both were clear.

## Proposed Terraform shape

This is illustrative design only. Do not apply it without a reviewed state/import plan.

```hcl
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "dsr_state" {
  name                = "alert-asora-function-dev-dsr-state"
  resource_group_name = var.resource_group_name
  location            = data.azurerm_application_insights.target["asora-function-dev"].location

  evaluation_frequency = "PT5M"
  window_duration      = "PT10M"
  scopes               = [data.azurerm_application_insights.target["asora-function-dev"].id]
  severity             = 2

  criteria {
    query                   = local.dsr_state_query
    time_aggregation_method = "Maximum"
    metric_measure_column   = "Value"
    threshold               = 0
    operator                = "GreaterThan"

    dimension {
      name     = "Signal"
      operator = "Include"
      values   = ["stuck_queued", "queue_depth", "failures"]
    }

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  auto_mitigation_enabled          = true
  workspace_alerts_storage_enabled = false
  enabled                          = true

  action {
    action_groups = [azurerm_monitor_action_group.health_alerts.id]
  }
}
```

## Required implementation sequence

1. Resolve or explicitly disposition the two poison messages and two failed DSR records without exposing message contents.
2. Prove the existing poison and failure rules fire and notify through `ag-lythaus-health`.
3. Refactor `infrastructure/alerts` so only the intended Wave 0 target and intended rules are planned. The current default module can create additional legacy/auth/DSR rules and must not be applied unchanged.
4. Import/reconcile all current live alert resources into Terraform state.
5. Add the consolidated state rule disabled or action-suppressed for shadow evaluation.
6. Run synthetic/safe signal tests for stuck, depth, failure, poison, and missing completion.
7. Compare old and new results for at least 24 hours.
8. Obtain explicit approval for the exact Terraform plan.
9. Enable the new state rule, verify action-group delivery, then disable only the three replaced rules.
10. Keep poison and missing-completion rules unchanged.

## Equivalence matrix

| Requirement | Proof before cutover |
|---|---|
| Five-minute evaluation | ARM/Terraform shows `PT5M` |
| Ten-minute lookback | ARM/Terraform shows `PT10M` |
| Stuck queued | Synthetic result includes `Signal=stuck_queued` |
| Queue depth across two samples | Requires `samples>=2` and `positiveSamples>=2` |
| Handler and persisted failures | `Value` combines both sources |
| Poison severity | Existing Sev1 rule remains unchanged |
| Missing completion correlation | Existing Sev2 rule remains unchanged |
| Notifications | Test email delivered by `ag-lythaus-health` |
| Rollback | Re-enable old rules before disabling new rule |

## Validation commands for a future approved implementation

```powershell
az monitor scheduled-query list -g asora-psql-flex -o table
az monitor app-insights query --app appi-asora-function-dev-dsr -g asora-psql-flex --analytics-query "<candidate query>" -o json
terraform -chdir=infrastructure/alerts fmt -check
terraform -chdir=infrastructure/alerts validate
terraform -chdir=infrastructure/alerts plan -out=dsr-alert-consolidation.tfplan
terraform -chdir=infrastructure/alerts show dsr-alert-consolidation.tfplan
```

The Terraform apply command is intentionally omitted. A second explicit approval is required after the exact plan is reviewed.

## References

- [HashiCorp `azurerm_monitor_scheduled_query_rules_alert_v2`](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_scheduled_query_rules_alert_v2)
- [Azure Monitor log alert dimensions](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/tutorial-log-alert)
- `infrastructure/alerts/main.tf`
- `infrastructure/alerts/variables.tf`
- `docs/runbooks/dsr-settings.md`
