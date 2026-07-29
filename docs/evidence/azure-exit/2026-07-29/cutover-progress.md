# Lythaus cutover progress — 2026-07-29

This file contains sanitised reconciliation evidence only. Raw Azure records,
contact data, credentials, provider subjects, and decrypted DSR packages remain
outside Git in the protected migration staging directory.

## PlanetScale main

- Approved migration set: 9 SQL files, 45,647 framed bytes.
- Combined migration SHA-256:
  `5cae370456c8b6083dc7342130f6214444d0452c494660e52c175b18f5da4110`.
- Live engine: PostgreSQL 17.10, Frankfurt, PS-5 ARM, zero replicas.
- Applied result: 10 canonical schemas, 75 tables, 110 indexes,
  209 constraints, 2 canonical functions, and 9 provenance rows.
- Extensions: `pg_trgm`, `pgcrypto`, `plpgsql`, and `unaccent`; no PostGIS.
- Managed roles: migration, runtime, admin, jobs, and privacy. Runtime roles
  inherit no broad PostgreSQL roles and pass object-level allowed/forbidden
  privilege checks.

## Canonical import

- Transformed import SHA-256:
  `d38f252d4055d0373bec26aeb417e2bb7f1546c955b2182e00a0f664d4d4b079`.
- Imported: 7 users, 3 encrypted contact records, 1 profile, 8 privacy
  requests, 20 request events, 1 legal hold, 2 deletion tombstones, and
  22 subject-data locations.
- Total initial import: 64 records.
- State reconciliation: 5 `relink_required`, 2 deleted, 5 awaiting review,
  and 1 active legal hold.
- Rejects, duplicates, and relationship orphans: zero in the canonical import.

## DSR evidence

- Five selected source packages: 5,140 bytes.
- Five encrypted packages: 5,800 bytes.
- R2 package upload count: 5 under
  `lythaus-private-exports-dev/protected-migration/dsr/`.
- Sanitised R2 audit manifest: 3,403 bytes under the locked `audit/` prefix in
  `lythaus-audit-archive-dev`.
- Every upload ETag matches the corresponding local encrypted object MD5.
- Source and encrypted SHA-256 checksums remain in the protected manifest.
- PlanetScale DSR metadata: 5 export manifests and 5 R2 subject locators.
- DSR source semantic SHA-256:
  `968d3803827d3c413954390fc1e8b808bb50442beb9e696c63eb50a32f61bc6b`.
- DSR destination semantic SHA-256:
  `aa11ef21bdb143c6f4e579557094975200401f6bbdd36ae0909c881d2de6ef2a`.
- Total selected canonical records after DSR metadata: 74.

## Azure PostgreSQL

`DISCARD — PRE-PRODUCTION LEGACY IDENTITY STORE`

The owner accepts clean reauthentication and controlled `relink_required`
handling. No provider subject, password, token, consent, authorship, privacy,
or legal record is fabricated.

## Cost and deletion

- New provider resources or billing lines: none.
- Measured incremental migration cost: US$0 under existing capacity.
- Azure deletion remains unauthorised. The three temporary Azure reader
  assignments remain active until final reconciliation and deletion evidence
  are complete.
