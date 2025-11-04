# Application Insights Alerts

This Terraform module creates monitoring alerts and a dashboard for the Azure Function App health endpoint.

## What It Creates

1. **Action Group**: Routes alerts to email and optional webhook (PagerDuty/Slack)
2. **5xx Error Rate Alert**: Triggers when error rate exceeds 1% over 5 minutes (severity 2)
3. **Health Failure Alert**: Triggers when `/api/health` returns non-2xx (severity 1)
4. **Health Dashboard**: Tile showing health status, version, deploy time, and request metrics

## Usage

```bash
cd infrastructure/alerts
terraform init
terraform plan
terraform apply
```

## Variables

- `resource_group_name`: Resource group (default: `asora-psql-flex`)
- `function_app_name`: Function app name (default: `asora-function-dev`)
- `app_insights_name`: Application Insights name (default: `appi-asora-dev`)
- `alert_email`: Email for notifications (default: `devops@asora.app`)
- `webhook_url`: Optional webhook for PagerDuty/Slack

## Outputs

- `action_group_id`: Action group resource ID
- `alert_ids`: Map of alert resource IDs
- `dashboard_url`: Direct link to the health dashboard in Azure Portal

## Alert Details

### 5xx Error Rate Alert
- **Query**: Calculates error rate over 5-minute windows
- **Threshold**: >1% errors
- **Evaluation**: Every 5 minutes
- **Severity**: 2 (Warning)

### Health Failure Alert
- **Query**: Counts non-2xx responses from `/api/health`
- **Threshold**: Any failure
- **Evaluation**: Every 5 minutes
- **Severity**: 1 (Error)

Both alerts auto-mitigate when conditions resolve.
