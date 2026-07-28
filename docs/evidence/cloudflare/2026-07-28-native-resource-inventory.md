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
| `lythaus-public-api-development` | synthetic dev | public API | enabled; deployment `0d59f963faee43a1a2decc13b9e82726` |
| `lythaus-admin-api-development` | synthetic dev | admin API | enabled for testing; deployment `dfcf6370a844495697fc69e964c3cf44` |
| `lythaus-jobs-development` | synthetic dev | queues/workflows/cron | disabled |

Production Worker IDs remain placeholders and no production Worker is deployed.

The public and admin development Workers enforce their configured
`asora.workers.dev` hostnames at request entry. Expected-host health probes
returned HTTP 200; legacy Host spoofing was rejected by the Cloudflare edge.

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

## Live deployment and secret-name refresh - 2026-07-28

- Cloudflare deployment-list and secret-list reads succeeded for
  `lythaus-public-api-development`, `lythaus-admin-api-development`, and
  `lythaus-jobs-development`. Only names and deployment metadata were read;
  no secret values are recorded here.
- Public development probes returned HTTP `200` for `/api/health`, `/api/ready`,
  and `/.well-known/jwks.json`. The JWKS response exposes one ES256 public key
  with the configured development key identifier. Apple authentication remains
  disabled and returns `provider_unavailable` (HTTP `404`).
- Admin `/health` returned HTTP `200`; `/api/admin/health` returned HTTP `401`
  with `access_required`, proving the subject-key guard is configured and the
  route remains protected without an Access identity.
- Public development secret names are present for password pepper, JWT signing,
  PII encryption/HMAC, Google OAuth, email adapter and Turnstile. The admin
  subject HMAC secret is present. Jobs has no Hive or R2 signing secrets, so
  provider-dependent processing remains fail-closed.
- A pre-production attempt to create a 30-day, quarantine-bucket-scoped R2 API
  token through `/user/tokens` was rejected by the current Cloudflare identity
  (`1001` policy reuse / authorization validation). No token or Worker R2 secret
  was created. The required owner action is to create a bucket-scoped R2 token
  from the R2 dashboard or grant the necessary token-management authority;
  production token creation remains deferred to the dedicated account.
- This inventory remains synthetic pre-production in a mixed-use account and
  cannot satisfy Gate 1 or authorize production data, DNS cutover, or Azure
  deletion.
