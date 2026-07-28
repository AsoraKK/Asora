# Lythaus Azure Exit Runbook

This runbook controls the selective Azure-to-Cloudflare/PlanetScale migration.
It is intentionally read-only until the owner supplies the required access and
the measured one-time migration usage approval.

## Fixed target

- Cloudflare account: `e5b7ae46e04698f507b7e4b3d4ef1af0`
- Zone: `lythaus.co`
- PlanetScale: organisation `lythaus`, database `lythaus-core`, branch `main`
- Validation branch: `development`, synthetic data only
- Existing Workers: `lythaus-public-api-development`, `lythaus-admin-api-development`, `lythaus-jobs-development`
- Existing Hyperdrives: `lythaus-db-app-dev`, `lythaus-db-admin-dev`, `lythaus-db-jobs-dev`, `lythaus-db-privacy-dev`

The resource registry is authoritative for reuse and deletion protection.

## Required owner access

1. Cosmos DB for NoSQL Built-in Data Reader at `asora-cosmos-dev` or a narrower approved database scope. This is the data-plane role required for account metadata reads, item reads, queries, and change-feed reads; management-plane Reader is not sufficient.
2. Storage Blob Data Reader on each required storage account or specific container. Azure Resource Manager Reader may be needed for portal navigation, but does not replace the data-plane role.
3. PostgreSQL export access: host, database name, approved read credentials or Entra access, firewall/network allowance, and compatible `pg_dump`, `pg_restore`, and `psql` tools. Do not grant Contributor or write access.

## Execution gates

1. Inspect Azure read-only and write sanitised inventory evidence.
2. Export to an encrypted staging directory outside Git; hash exports.
3. Classify every source using `infrastructure/azure-exit/migration-mappings.json`.
4. Reject unknown, unverifiable, duplicate, orphaned, token, secret, test, and provider-runtime records.
5. Transform only explicit canonical mappings with `scripts/azure-exit/transform-records.mjs`.
6. Validate migrations against local PostgreSQL 17 with `npm run validate:planetscale-postgres17`.
7. Validate transformations on synthetic fixtures and PlanetScale `development` only.
8. Re-export fresh Azure data for final migration.
9. Calculate records, objects, bytes, PlanetScale transfer, R2 operations, included usage, and worst-case cost with `npm run calculate:migration-usage -- --input <manifest>`.
10. Stop for `AUTHORISE MIGRATION USAGE: maximum additional cost US$___` before writing Azure data to `main` or R2.

The management-plane inventory command is:

```powershell
$out = Join-Path $env:TEMP 'lythaus-azure-discovery-<date>'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\azure-exit\discover-readonly.ps1 -OutputDirectory $out
```

It writes `azure-discovery.json` outside Git and records data-plane access as
blocked unless the owner-approved read-only probe gate is explicitly enabled.

## Hyperdrive cutover

Update one existing configuration at a time in this order:

`DB_JOBS_FRESH` -> `DB_PRIVACY_FRESH` -> `DB_ADMIN_FRESH` -> `DB_APP_FRESH`

For each configuration, record sanitised current settings, verify Worker and
binding ownership, verify the least-privilege `main` role, update the existing
configuration, wait for origin validation, run allowed/forbidden query tests,
run readiness and read-after-write tests, and record rollback parameters. Revoke
development credentials only after all four configurations pass. Cloudflare's
existing connection pool remains available while new connections use the new
origin; query caching remains disabled.

## Deletion gates

Inaccessible privacy, legal, identity, or authoritative content is a hard
blocker for the affected Azure resource. Inaccessible derived cache or
telemetry requires sanitised evidence and an explicit disposition. A known
empty test container may be discarded after evidence. Do not let an unrelated
derived resource block the entire exit.

Delete PlanetScale `development` only after `main` is validated, every Worker
uses `main`, no required evidence remains there, and the branch is synthetic
only. Do not delete Azure automatically. Final Azure deletion requires the
exact phrase `AUTHORISE FINAL AZURE DELETION`.
