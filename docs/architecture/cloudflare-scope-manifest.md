# Cloudflare scope manifest

## Purpose

Fail closed when native deployment targets the shared or unrelated account.
This manifest describes the temporary pre-production exception; it is not a
production authorisation.

## Approved pre-production scope

- Account: shared account ending `…e4b3d4ef1af0` (temporary only)
- Zone: `lythaus.co` ending `…176c29382`
- Resource prefix: `lythaus-`
- Environment: `dev` / synthetic data only
- Approved services: Workers, Hyperdrive, R2, Queues, Workflows, KV, Access,
  WAF, Turnstile, Email Service

## Production scope

Production requires a dedicated Lythaus Cloudflare account. The production
account ID, zone ID, tokens, and resource IDs must be populated only after the
owner creates or transfers the account and the production validation job has a
protected environment value.

## Forbidden targets

- `asora.co.za`
- `azurewebsites.net`
- Nite Owl resources
- unrelated zones, buckets, queues, KV namespaces, Workers, or Access apps
- generic cross-project deployment tokens
- production data in the shared account

## Fail-closed rules

- `workers_dev = false` and `preview_urls = false` for production Workers.
- Native configuration validation rejects Azure hostnames and unrelated IDs.
- No production deployment occurs without `CF_PRODUCTION_ACCOUNT_ID` and
  `CF_PRODUCTION_ZONE_ID` protected values.
- Shared-account deployment is limited to names ending `-dev` and synthetic
  data.
- The existing Azure compatibility Worker remains separately deployable.
