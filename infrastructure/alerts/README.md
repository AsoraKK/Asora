# Lythaus Application Insights Alerts

Multi-target Terraform module that creates monitoring alerts and a combined
health dashboard for Azure Function Apps.

## What It Creates

| Resource | Count | Description |
|----------|-------|-------------|
| **Action Group** | 1 | Shared group — routes all alerts to email (+ optional webhook) |
| **5xx Error Rate Alert** | 1 per target | Fires when error rate > 1 % over 5 min |
| **Health Failure Alert** | 1 per target | Fires when `/api/health` returns non-2xx |
| **DSR Stuck Queued Alert** | 1 per target | Fires when `privacy_requests` has queued DSR requests older than 5 min |
| **DSR Queue Depth Alert** | 1 per target | Fires when DSR queue depth stays > 0 across two monitor samples |
| **DSR Failure Alert** | 1 per target | Fires when DSR queue failures or persisted failed requests are detected |
| **DSR Poison Queue Alert** | 1 per target | Fires when the DSR poison queue exists or has messages |
| **DSR Missing Completion Alert** | 1 per target | Fires when an enqueue lacks `dsr.queue.completed` after 5 min |
| **Portal Dashboard** | 1 | Combined health view for all targets |

## Default Targets

| Function App | Severity | Role |
|-------------|----------|------|
| `asora-function-flex` | 2 (Warning) | Production |
| `asora-function-dev` | 3 (Informational) | Development |

## Usage

```bash
cd infrastructure/alerts
terraform init
terraform plan    # review what will be created
terraform apply   # deploy alerts
```

To override defaults without editing files:

```bash
terraform apply \
  -var='alert_email=team@example.com' \
  -var='webhook_url=https://hooks.slack.com/...'
```

## Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `resource_group_name` | string | `asora-psql-flex` | RG containing all targets |
| `alert_targets` | map(object) | flex (sev 2) + dev (sev 3) | Map of FA name → {severity, app_insights_name} |
| `alert_email` | string | `kyle@asora.co.za` | Notification email |
| `webhook_url` | string | `""` | Optional PagerDuty/Slack webhook |

## Outputs

| Output | Description |
|--------|-------------|
| `action_group_id` | ID of the shared action group |
| `alert_ids` | Map of target → health, auth, and DSR alert IDs |
| `dashboard_url` | Direct link to combined health dashboard |

## DSR Alert Telemetry

The monitor-derived DSR alerts depend on `privacyDsrQueueMonitor`, which emits a
`dsr.queue.monitor` trace every eight hours with:

- `approximateMessageCount`
- `poisonQueueExists`
- `poisonApproximateMessageCount`
- `stuckQueuedCount`
- `failedRequestCount`

Queue completion alerts also use `dsr.export.enqueued`, `dsr.delete.enqueued`,
and `dsr.queue.completed` App Insights traces from the DSR worker path.

The processor-failure rule evaluates immediate structured failure events every 15
minutes over 30 minutes. Poison queue, depth, and stuck-queue rules evaluate the
latest monitor snapshot hourly over one day. The provider supports no 12-hour
window, so one day is deliberately used to cover the eight-hour source interval.
The missing-completion check is a stateless daily operational summary over 24
hours. Do not restore a five-minute cadence without changing the monitor source
and revalidating the alert design.

Dev DSR alerts target `appi-asora-function-dev-dsr`, a workspace-based component
created after the legacy `asora-function-dev` component stopped ingesting telemetry.

## Adding a New Target

Add an entry to `alert_targets` in `variables.tf` or supply via `-var`:

```hcl
"asora-function-dev" = {
  severity          = 2
  app_insights_name = null  # uses FA name if null
}
```

The internal Azure name remains unchanged while the target is operationally the Lythaus MVP shared environment. Then `terraform apply` only through a separately approved infrastructure change.
