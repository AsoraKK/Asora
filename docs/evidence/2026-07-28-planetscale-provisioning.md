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

## Exact MCP recheck — 2026-07-28

- PlanetScale MCP list returned exactly two branches: `main` and
  `development`; both are Frankfurt (`eu-central`) with zero replicas.
- Read-only `development` probe returned PostgreSQL `18.4`, database `postgres`,
  zero Lythaus schemas, and installed extensions `hypopg, plpgsql` only.
- `get_branch_schema` for `development` returned no application schema objects.
- This recheck issued no writes or DDL and does not change the Gate 2/3 blockers.

## Current region and SKU metadata — 2026-07-28

- PlanetScale MCP lists Frankfurt (`eu-central`), Dublin (`eu-west`) and
  London (`aws-eu-west-2`) as enabled PostgreSQL regions; no African region is
  listed.
- Current autoscaling ARM rates reported by MCP are: PS-DEV `$15/mo`, PS-5
  `$15/mo` plus `$5/mo` per replica, and PS-10 `$30/mo` plus `$10/mo` per
  replica. Storage, backup, egress and regional adjustments remain separate.
- The live PS-DEV rate supersedes the earlier provisional `$5/mo` development
  estimate. Cost approval remains blocked until the actual production topology
  and billing account are selected.

## Repository implementation evidence — 2026-07-28

- Native architecture invariants: `18/18` passed after subject-locator
  reconciliation, trust-ledger grants, stale-password rehashing, and the
  native Azure dependency scan.
- Exact-head GitHub checks for commit `2cee518c`: native validation
  `30314702225`, migrations `30314704112`, and secret scan `30314705687` all
  passed.
- The draft implementation remains pushed on branch
  `codex/cloudflare-planetscale-provisioning`; production gates remain closed.

## Superseding provider refresh — 2026-07-28

- PlanetScale MCP re-read confirms database `lythaus-core` is `ready`, plan
  `scaler_pro`, Cloudflare-billed through account
  `e5b7ae46e04698f507b7e4b3d4ef1af0`, with exactly `main` and `development`
  branches in Frankfurt. No write or DDL was issued.
- Cloudflare MCP read-only access is currently healthy for the shared account.
  The account contains active Workers Paid, R2 Paid and Workers PlanetScale
  subscriptions, but it remains a mixed-use account and is not the required
  dedicated Lythaus production account.
- The shared account contains only the existing `lythaus-core-fresh`
  Hyperdrive configuration plus synthetic development resources. No native
  production Worker was deployed and no production binding was provisioned.
- The earlier Cloudflare API `10000` authentication observation is superseded
  for account and zone reads by this refresh; it remains unresolved for any
  endpoint not revalidated in this read-only check.
- Gate 1 remains blocked by account isolation and the owner Azure
  data-disposition decision. Gates 2–5 remain gated by benchmark, extension,
  credential, deployment and recovery evidence.
