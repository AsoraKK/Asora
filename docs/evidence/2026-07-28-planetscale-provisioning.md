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

