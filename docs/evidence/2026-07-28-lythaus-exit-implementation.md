# Lythaus Azure Exit Implementation Evidence

Date: 2026-07-28
Branch: `codex/cloudflare-planetscale-provisioning`

This packet records repository implementation and read-only verification. It does not authorize provider writes, migration usage, DNS cutover, development-branch deletion, or Azure deletion.

## Required classifications

- ARCHITECTURE SKELETON: LOCKED
- UNAUTHORISED COST ADDITIONS: NONE
- AZURE DATA REVIEW: BLOCKED
- PLANETSCALE MIGRATION: BLOCKED
- CLOUDFLARE NATIVE RUNTIME: BLOCKED
- AZURE ACTIVE DEPENDENCY: REMAINS
- AZURE DELETION: AWAITING EXACT OWNER AUTHORISATION

## Implemented

- Added the existing-resource registry at `infrastructure/lythaus-resource-registry.json`.
- Added discover-before-create rules to `AGENTS.md` and the registry validator.
- Fixed the Cloudflare scope to the existing shared account and `lythaus.co` zone.
- Promoted existing `-development` Workers and `-dev` Cloudflare bindings in place; physical names remain unchanged.
- Removed production Images/email bindings and disabled incomplete media and email paths through explicit flags.
- Kept PlanetScale `main` on PostgreSQL 17 without a database UUIDv7 function or default. New IDs are application-generated UUIDv7 values.
- Added canonical Azure mappings, encrypted identity evidence handling, duplicate/reject accounting, and fail-closed relationship checks.
- Added the measured migration usage calculator. It must produce the bounded approval phrase before any real PlanetScale or R2 import writes.
- Added the local PostgreSQL 17 compatibility validator. It requires a local PostgreSQL 17 connection and never uses `main` as the first compatibility test.
- Added `scripts/azure-exit/discover-readonly.ps1`, which writes only sanitized metadata and blocker states outside Git by default.
- Added the safe Hyperdrive repoint order and rollback evidence requirements to the Azure exit runbook.

## Read-only live facts

- Cloudflare account `e5b7ae46e04698f507b7e4b3d4ef1af0` and the existing `lythaus.co` zone are in scope.
- The three approved native Workers, five Hyperdrive configurations, four approved R2 buckets, six Queue/DLQ pairs, five Workflows, KV namespace, and administrative Access applications already exist.
- PlanetScale contains only `lythaus-core` with `main` and `development`; no new database, branch, replica, or plan was created.
- `main` is Frankfurt PS-5 ARM PostgreSQL 17.10 and has no application rows. `development` is Frankfurt PS-DEV ARM PostgreSQL 18.4 and remains synthetic-only.
- Cloudflare dry runs completed for all three Worker configurations. No Worker deployment or binding mutation occurred.
- Existing Hyperdrive metadata shows TLS verification and disabled query caching; no Hyperdrive was created.

## Azure blockers

The current identity can inspect management-plane inventory, including the 32 Cosmos containers and PostgreSQL server/database metadata. Data extraction remains blocked because the owner must provide:

1. Cosmos DB for NoSQL Built-in Data Reader on `asora-cosmos-dev` or a narrower approved database scope.
2. Storage Blob Data Reader on each required storage account or container scope.
3. PostgreSQL export access: host, database, approved read/export credentials or Entra access, firewall/network access, and compatible `pg_dump`, `pg_restore`, and `psql` tools.

No raw Azure documents, blob contents, passwords, tokens, secrets, or logical dump were written to the repository.

## Cost and import gate

The measured usage report is not yet computable because authoritative source row counts, object counts/bytes, PlanetScale transfer, current included usage, and approved pricing inputs are unavailable. Before any write to PlanetScale `main` or an R2 bucket, produce those measurements and stop for:

`AUTHORISE MIGRATION USAGE: maximum additional cost US$___`

That approval covers only the measured one-time migration writes. It does not authorize a new resource, plan, branch, subscription, upgrade, DNS change, or Azure deletion.

## Validation executed

- Resource registry validation passed: 31 existing resources and creation guardrails.
- Migration baseline validation passed: seven migrations and 74 tables.
- Required extension validation passed: `pgcrypto`, `pg_trgm`, and `unaccent`; PostGIS is optional and non-blocking.
- Native Worker configuration and shared Cloudflare scope validation passed.
- Production gate validation passed in fail-closed inspection mode.
- Native architecture invariants passed: 26 tests.
- Native typecheck passed.
- Native Azure dependency scan passed for all three Workers.
- Cloudflare Worker dry runs passed without deployment.
- Local PostgreSQL 17 compatibility validation was not run: no approved local PostgreSQL 17 test URL/container is available.
- Production gate `require-pass` correctly remains blocked by Azure access, PostgreSQL 17 compatibility, migration reconciliation, migration usage approval, and cutover authorization.

## Next owner actions

Provide the three Azure read/export access prerequisites, then provide a local PostgreSQL 17 validation target if it is not provisioned by the execution environment. After sanitized counts and cost estimates are produced, provide the exact migration-usage approval phrase before import.
