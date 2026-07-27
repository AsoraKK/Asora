# Lythaus Cloudflare–PlanetScale v2

Status: implementation approved; production cutover gated.

Lythaus is implemented as three Cloudflare Workers with PlanetScale Postgres
as the authoritative relational store:

- `lythaus-public-api`: public API, authentication, content and upload sessions
- `lythaus-admin-api`: Cloudflare Access-protected administration
- `lythaus-jobs`: Queues, Workflows, outbox relay and asynchronous processing

The existing Azure proxy remains `asora-azure-compat` until a separate owner
decision retires it. It is not a dependency of the native Workers.

## Production prerequisites

Production resources must be created in a dedicated Lythaus Cloudflare account.
The shared account is pre-production only and may contain synthetic data.
Production Wrangler configurations intentionally contain unresolved resource
IDs until the account, region, PlanetScale tier and Hyperdrive roles pass the
acceptance gates. Run `npm run validate:native-workers:provisioned` only after
those values are supplied through reviewed deployment configuration.

`native-workers-validation.yml` runs on native changes. Production deployment is
manual through `native-workers-deploy.yml`, requires the GitHub `production`
environment, checks that the account differs from the shared account, and then
deploys all three Workers.

## Database policy

`database/planetscale/` is the migration source of truth. Migrations run over a
direct administrative PlanetScale connection; Worker traffic uses four
cache-disabled Hyperdrive bindings with `sslmode=verify-full`.

The persistent database branches are `main` and `development`. `ci-*` branches
are ephemeral. `ai-development` is a Git convention only. Production data is
never copied into development or CI branches.

## Security boundary

Worker Secrets hold password peppers, signing keys, encryption keys, Hive
credentials and R2 signing credentials. Secrets Store is optional while it is
in beta. Audit records are persisted in PostgreSQL and retained evidence is
stored in locked R2 prefixes; Workers Logs are short-term diagnostics only.
