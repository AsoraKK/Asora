# Lythaus Azure Exit Runbook

This runbook controls the selective Azure-to-Cloudflare/PlanetScale migration.
Azure extraction is read-only; target writes remain gated by classification,
reconciliation, capacity, and production acceptance.

## Fixed target

- Cloudflare account: `e5b7ae46e04698f507b7e4b3d4ef1af0`
- Zone: `lythaus.co`
- PlanetScale: organisation `lythaus`, database `lythaus-core`, branch `main`
- Validation branch: `development`, synthetic data only
- Existing Workers: `lythaus-public-api-development`, `lythaus-admin-api-development`, `lythaus-jobs-development`
- Existing Hyperdrives: `lythaus-db-app-dev`, `lythaus-db-admin-dev`, `lythaus-db-jobs-dev`, `lythaus-db-privacy-dev`

The resource registry is authoritative for reuse and deletion protection.

## Active read access

- Cosmos assignment `ef524417-f93c-45ca-8636-c80614c5a842` at `/dbs/asora`.
- DSR Blob assignment `b766beaa-d60b-4247-8dad-bd119d37af43` at
  `stasoradsrdev/dsr-exports`.
- User-media Blob assignment `a865269d-86e4-4a1f-a752-35825841e7f4` at
  `asoramediadev/user-media`.

Do not create, update, or revoke these assignments during extraction. PostgreSQL
remains blocked by rejected credentials and is governed by the disposition
test in `docs/architecture/data-disposition-adr.md`.

## Execution gates

1. Inspect Azure read-only and write sanitised inventory evidence.
2. Export to an encrypted staging directory outside Git. Never upload raw
   plaintext records as a GitHub artifact.
3. Classify every source using `infrastructure/azure-exit/migration-mappings.json`.
4. Reject unknown, unverifiable, duplicate, orphaned, token, secret, test, and provider-runtime records.
5. Transform only explicit canonical mappings with `scripts/azure-exit/transform-records.mjs`.
6. Validate migrations against local PostgreSQL 17 with `npm run validate:planetscale-postgres17`.
7. Validate transformations on synthetic fixtures and PlanetScale `development` only.
8. Re-export fresh Azure data for final migration.
9. Calculate records, objects, bytes, PlanetScale transfer, R2 operations, included usage, and worst-case cost with `npm run calculate:migration-usage -- --input <manifest>`.
10. Proceed only when existing provisioned capacity and included allowances
    indicate no actual incremental charge. If the provider indicates any
    incremental charge, stop for
    `AUTHORISE MIGRATION USAGE: maximum additional cost US$___`.

## Export custody and hashing

- Canonicalise JSON with stable object-key ordering and stable record ordering
  by source identifier.
- Preserve the distinction between missing, null, and empty values.
- Encode as UTF-8 and calculate separate raw-source and transformed SHA-256
  hashes.
- Keep the encrypted export outside Git and outside ephemeral runner-only
  storage.
- If GitHub Actions creates an encrypted artifact, download it, verify its
  checksum against the upload manifest, decrypt it with the retained key,
  reconcile decrypted counts, and complete at least one controlled restore
  test before deleting the artifact or GitHub copy of the key.
- Retain a protected local copy of the key until PlanetScale reconciliation,
  deletion-evidence approval, and durable evidence custody are complete.

## DSR object handling

Inventory and hash the one source DSR object. If genuine, encrypt the package
before target storage unless it is already strongly encrypted. Store the
encrypted user-facing package separately from sanitised audit metadata. Before
copying, inspect exact R2 lifecycle rules and prove the selected prefix is not
subject to automatic deletion; record retention or object-lock behavior,
checksum, source metadata, and provenance. Never preserve plaintext personal
data solely as evidence.

The management-plane inventory command is:

```powershell
$out = Join-Path $env:TEMP 'lythaus-azure-discovery-<date>'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\azure-exit\discover-readonly.ps1 -OutputDirectory $out
```

It writes `azure-discovery.json` outside Git and records data-plane access as
blocked unless the owner-approved read-only probe gate is explicitly enabled.

## Appeals and background processing

Appeals are enabled for submission and staff review. Community-vote
adjudication remains disabled until governance is production-ready. Do not
advertise or expose a non-operational voting route.

Inspect the existing `*/15 * * * *` jobs cron and every Queue, Workflow,
producer, and consumer. Disable only those proven unnecessary. Retain the
minimum schedule and consumers needed for privacy, moderation, outbox delivery,
retention, and recovery, and document each active producer and consumer.

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
