# Lythaus Cloudflare–PlanetScale v2

Status: fixed architecture; production cutover gated.

Lythaus is implemented as three Cloudflare Workers with PlanetScale Postgres
as the authoritative relational store:

- `lythaus-public-api-development`: public API, authentication and text content
- `lythaus-admin-api-development`: Cloudflare Access-protected administration
- `lythaus-jobs-development`: Queues, Workflows, outbox relay and asynchronous processing

The existing Azure proxy remains `asora-azure-compat` until a separate owner
decision retires it. It is not a dependency of the native Workers.

## Production boundary

Use the existing shared Cloudflare account
`e5b7ae46e04698f507b7e4b3d4ef1af0`, zone `lythaus.co`, and only the resources
listed in `infrastructure/lythaus-resource-registry.json`. Physical `-dev` and
`-development` names are promoted in place and are production-critical. No
renamed replacements may be created for aesthetics.

Production deployment is manual through `native-workers-deploy.yml`, requires
the GitHub `production` environment, checks the fixed account and zone, and
deploys only an exact merged `main` SHA.

## Database policy

`database/planetscale/` is the migration source of truth. Migrations run over a
direct administrative PlanetScale connection; Worker traffic uses four
cache-disabled Hyperdrive bindings with `sslmode=verify-full`.

The only database branches are `main` and synthetic-only `development`.
PostgreSQL 17 compatibility is proven locally without creating validation
branches. Production data is never copied into `development`.

## Security boundary

Worker Secrets hold signing and encryption material. Paid Hive, media upload,
email/password and other deferred features remain disabled. Audit records are
persisted in PostgreSQL and sanitized retained evidence is stored in locked R2
prefixes; Workers Logs are short-term diagnostics only.
