# Native Cloudflare resource inventory — 2026-07-28

Sanitised live inventory for the temporary shared-account development scope.
No secrets, connection strings, object contents, or personal data are stored.

## Account and zone

- Account: shared account ending `…e4b3d4ef1af0` (pre-production only)
- `lythaus.co`: zone ending `…176c29382`
- Other zones observed in the account: `asora.co.za`, `niteowlangling.co.za`
- Workers Paid, R2 Paid, Workers PlanetScale and Images Stream subscriptions:
  active on the shared account
- Dedicated Lythaus production account: not provisioned

## Workers

| Name | Environment | Purpose | Public subdomain |
| --- | --- | --- | --- |
| `lythaus-public-api-development` | synthetic dev | public API | enabled |
| `lythaus-admin-api-development` | synthetic dev | admin API | enabled for testing |
| `lythaus-jobs-development` | synthetic dev | queues/workflows/cron | disabled |

Production Worker IDs remain placeholders and no production Worker is deployed.

## Hyperdrive

| Name | ID suffix | Role | TLS | Cache |
| --- | --- | --- | --- | --- |
| `lythaus-db-app-dev` | `…861d1adf` | `lythaus_runtime` | `verify-full` | disabled |
| `lythaus-db-admin-dev` | `…f59294ed3` | `lythaus_admin` | `verify-full` | disabled |
| `lythaus-db-jobs-dev` | `…031d65ee` | `lythaus_jobs` | `verify-full` | disabled |
| `lythaus-db-privacy-dev` | `…48053b6` | `lythaus_privacy` | `verify-full` | disabled |

All four point to the synthetic Frankfurt `development` branch.

## R2

- `lythaus-media-quarantine-dev`: private; `quarantine/` objects expire after
  seven days; multipart uploads abort after seven days; localhost CORS only.
- `lythaus-media-approved-dev`: private; localhost CORS only; no automatic
  object deletion.
- `lythaus-private-exports-dev`: private; `exports/` objects expire after 30
  days.
- `lythaus-audit-archive-dev`: private; `audit/` objects have a one-year lock.

## Queues and Workflows

- Six development queues, each with a matching `-dlq-dev` dead-letter queue.
- Queue consumers use bounded batches and ten retries.
- Five Workflows are registered on `lythaus-jobs-development`: account delete,
  account export, appeal lifecycle, retention cleanup, and backup validation.
- No production queue, DLQ, Workflow, R2 bucket, KV namespace, or Hyperdrive
  configuration has been provisioned.

## Access and Turnstile

- Existing Access applications for `admin-api.lythaus.co` and
  `admin.lythaus.co` are present in the shared account and have explicit allow
  and deny policies.
- Access inventory also contains unrelated Asora and Nite Owl applications;
  this is evidence that the account is not production-isolated.
- Turnstile inventory could not be read through the current API session
  (`10000 Authentication error`); it is not marked verified.
