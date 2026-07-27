# PlanetScale provisioning evidence — 2026-07-28

This is a sanitised operational record for the Lythaus Cloudflare–PlanetScale
implementation. It contains no credentials, connection strings, tokens, or
application records.

## Authentication and targeting

- PlanetScale CLI: `0.307.0`, authenticated through OAuth.
- Organization: `lythaus`.
- Database: `lythaus-core`.
- CLI auth check: `authenticated=true`, `auth_method=oauth`.
- No PlanetScale writes or DDL were issued against `main`.

## Development branch

- Branch `development` was created from empty `main`.
- Region: Frankfurt (`eu-central`).
- Cluster: `PS_DEV_AWS_ARM`, single node, zero replicas.
- Branch state: ready.
- Read-only probe: PostgreSQL `18.4` (`server_version_num=180004`).
- User-table count before migrations: `0`.
- The branch is synthetic development only and is not production-ready.

## Extension blocker

- The migration preflight succeeded on `development`.
- Migration `0001_extensions_and_schemas.sql` stopped at `CREATE EXTENSION postgis`.
- PlanetScale SQL admin sessions are intentionally non-superuser and returned
  `permission denied to create extension "postgis"`.
- The PlanetScale dashboard currently reports PostGIS and related extensions
  temporarily disabled due to an operational issue.
- Required next action: wait for PlanetScale to restore PostGIS, then enable it
  through the supported dashboard/default-role path and rerun the baseline.
- No application tables or user data were created on `development`.

## Reversible attempts

- A London `development` branch attempt was rejected because this database is
  ARM-only and the region does not support the parent ARM architecture.
- No database, branch, role, replica, or production resource was deleted.

## Gate impact

| Gate | Status | Evidence | Remaining blocker |
| --- | --- | --- | --- |
| 1 | BLOCKED | Shared Cloudflare account; dedicated-account API remains forbidden | Dedicated production account and signed Azure disposition |
| 2 | IN PROGRESS | PG18.4 Frankfurt development branch is ready | Region/tier benchmark, production PG18 HA topology, replicas and cost approval |
| 3 | BLOCKED | CLI OAuth and migration preflight pass | PostGIS enablement, baseline migrations, roles/grants and Hyperdrive credentials |
| 4 | IN PROGRESS | Native Worker code and exact-head checks pass | Development database schema and live Worker deployment |
| 5 | BLOCKED | No production data or cutover performed | Independent backup, restore drills, domains, rollback rehearsal |

## Live MCP recheck — 2026-07-28

- PlanetScale organization plan: `developer`; payment information is not yet
  valid and the database remains Cloudflare-billed through the shared account.
- Database branches currently visible: `main` (production) and `development`
  (non-production). No permanent `ai-development` database branch exists.
- `main`: Frankfurt, PS-5 ARM, zero replicas, PostgreSQL 17.10, zero
  application tables.
- `development`: Frankfurt, PS-DEV ARM, zero replicas, PostgreSQL 18.4, zero
  application tables.
- Available autoscaling tiers include PS-5 ARM at US$15/month plus US$5/month
  per replica and PS-10 ARM at US$30/month plus US$10/month per replica;
  storage, backup, egress, and regional adjustments remain unpriced here.
- Read-only SQL on `development` confirmed `postgis_installed=false`,
  `pgcrypto_installed=false`, `pg_trgm_installed=false`, and
  `unaccent_installed=false`. The MCP session uses an ephemeral read-only role;
  its role catalog does not expose the five branch login roles, so role
  provisioning remains evidenced by the PlanetScale role-management API/CLI.

No write or DDL operation was issued against `main`. No PostGIS retry was made
after the provider dashboard reported the temporary extension outage.

## Repository acceptance contracts

- `database/planetscale/extensions/required-extensions.json` records the
  required `postgis`, `pgcrypto`, `pg_trgm`, and `unaccent` capability set.
- `scripts/validate-planetscale-extensions.mjs` validates migration references
  locally and fails closed when live catalog evidence is required but absent or
  missing a required extension.
- `docs/architecture/password-hashing-adr.md` records Argon2id as the default;
  scrypt fallback is disabled in production unless benchmark evidence and an
  approved decision explicitly enable it.

## Native Worker validation

- `wrangler` version `4.114.0` is installed.
- Public API development `wrangler deploy --dry-run --env development` passed;
  the bundle resolved the synthetic KV, R2, queue, email, and placeholder
  Hyperdrive bindings without deploying a Worker.
- `wrangler whoami` remains blocked because the local token expired and cannot
  refresh in the non-interactive shell. No live Worker deployment was claimed.
- The new scope validator and native Worker validator both pass in
  pre-production mode. Production mode correctly fails closed until protected
  dedicated-account identifiers and the production environment are supplied.
- A later read-only Cloudflare MCP inventory attempt returned API error `10000`
  (authentication error); no Cloudflare state was changed and email/Turnstile
  readiness remains unverified until the MCP session is reauthenticated.
