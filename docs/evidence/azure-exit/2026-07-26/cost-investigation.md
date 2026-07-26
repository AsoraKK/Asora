# Cost Investigation

## Live result

The installed CLI has no `costmanagement` command/extension available in this session. No current-month, prior-month, forecast, meter, or resource-level billing figures were collected. No savings estimate is claimed.

## Likely cost drivers (inference)

1. `asora-pg-dev-ne`: provisioned Standard_B1ms, 32 GB, seven-day backup retention.
2. `asora-function-dev`: running Function App with DSR always-ready behavior documented historically.
3. `law-asora-dsr-dev-neu` and `appi-asora-function-dev-dsr`: telemetry ingestion and retention.
4. Storage accounts, including DSR exports and deployment artifacts.
5. Any retained certificates, plans, alerts, or resources outside `asora-psql-flex`.

## Manual read-only follow-up

Use Azure Portal: Cost Management + Billing → Cost analysis → Subscription → scope to 2026-07-01 through 2026-07-26; group by Resource and Service name, then export locally outside GitHub. Repeat for the previous full month and Forecast. A billing-owner must also query budgets, reservations, Marketplace charges, and support plans.
