# Lythaus Application Insights Alerts

Multi-target Terraform module that creates monitoring alerts and a combined
health dashboard for Azure Function Apps.

## What It Creates

| Resource | Count | Description |
|----------|-------|-------------|
| **Action Group** | 1 | Shared group — routes all alerts to email (+ optional webhook) |
| **5xx Error Rate Alert** | 1 per target | Fires when error rate > 1 % over 5 min |
| **Health Failure Alert** | 1 per target | Fires when `/api/health` returns non-2xx |
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
| `alert_ids` | Map of target → {error_rate, health_fail} alert IDs |
| `dashboard_url` | Direct link to combined health dashboard |

## Adding a New Target

Add an entry to `alert_targets` in `variables.tf` or supply via `-var`:

```hcl
"asora-function-staging" = {
  severity          = 2
  app_insights_name = null  # uses FA name if null
}
```

Then `terraform apply`.
