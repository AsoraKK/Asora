# Repository Azure Dependencies

The repository scan found Azure references across Functions, Flutter/client configuration, infrastructure, deployment scripts, runbooks, tests, dashboards, and Cloudflare origin configuration.

| Surface | Evidence | Runtime/deployment role | Replacement direction | Status |
|---|---|---|---|---|
| `functions/` | `@azure/functions`, Cosmos SDK, PostgreSQL helpers, storage/queue helpers | Runtime-critical API, data, DSR | Cloudflare Workers, D1/Hyperdrive/R2/Queues or managed database | Verified |
| `.github/workflows/` | `azure/login@v3`, ARM/CLI, Function deployment, Key Vault references | Deployment-critical | Cloudflare deployment/OIDC and secret store | Verified |
| `host.json`, `functions/host.json` | Functions v4 and queue configuration | Runtime-critical | Workers/Queues equivalent | Verified |
| `infra/`, `database/`, `infrastructure/` | Cosmos, Function, Key Vault, monitoring and network IaC | Provisioning/documentation | Cloudflare Terraform/API equivalents | Verified |
| `workers/feed-cache/wrangler.toml` | Azure origin URL | Runtime routing dependency | Cloudflare origin replacement | Verified |
| `docs/`, runbooks, ADRs | Azure hostnames, resource names, operational procedures | Human/deployment dependency | Rewrite after migration | Verified |

Sensitive names observed include `COSMOS_CONNECTION_STRING`, `POSTGRES_CONNECTION_STRING`, `JWT_SECRET`, `AzureWebJobsStorage`, `DSR_QUEUE_CONNECTION`, Key Vault references, OAuth, FCM, Hive, ACS, and Cloudflare Access settings. Values were not collected.
