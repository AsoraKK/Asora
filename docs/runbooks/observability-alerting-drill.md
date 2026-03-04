# Observability Alerting Drill (Staging/Prod)

Last updated: 2026-02-16
Scope: p95 latency, 5xx rate, Cosmos throttling, and alert routing validation.

## Ownership

- Primary owner: Platform On-Call (`platform-oncall@lythaus.app`)
- Secondary owner: Backend On-Call (`backend-oncall@lythaus.app`)
- Escalation owner: Product Incident Lead (`incident-lead@lythaus.app`)

## Preconditions

- Observability module enabled in target env Terraform.
- `function_app_resource_id` set in env tfvars.
- `observability_alert_email_addresses` populated with real on-call recipients.
- App Insights connected to the target Function App.

## Synthetic drill sequence

1. Trigger controlled 5xx spike in staging.
2. Trigger controlled latency spike (>500ms average over alert window).
3. Trigger Cosmos throttling (429) with bounded load.
4. Confirm alert creation in Azure Monitor.
5. Confirm action-group delivery to on-call channels.
6. Acknowledge and close alerts via runbook process.

## Validation commands (examples)

```bash
# Replace values for target environment
APP_INSIGHTS_ID="<app-insights-resource-id>"

# Error rate signal (5xx)
az monitor app-insights query \
  --ids "$APP_INSIGHTS_ID" \
  --analytics-query "requests | where timestamp > ago(15m) | where resultCode startswith '5' | summarize errors=count()"

# p95 response latency
az monitor app-insights query \
  --ids "$APP_INSIGHTS_ID" \
  --analytics-query "requests | where timestamp > ago(15m) | summarize p95=percentile(duration,95)"

# Cosmos throttling signal (HTTP 429 in dependencies)
az monitor app-insights query \
  --ids "$APP_INSIGHTS_ID" \
  --analytics-query "dependencies | where timestamp > ago(15m) | where tostring(resultCode) == '429' | summarize throttles=count()"
```

## Exit criteria

- Alert rules fire for all three synthetic scenarios.
- Notifications are delivered to primary and secondary channels.
- Incident timeline is documented with timestamps.
- Follow-up actions are logged in the release packet.
