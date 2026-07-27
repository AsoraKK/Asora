# Native platform reconciliation — 2026-07-27

This is a sanitised, read-only baseline for the Lythaus Cloudflare–PlanetScale
provisioning programme. It contains resource metadata only; it contains no
tokens, credentials, connection strings, or application records.

## Repository

- Branch: `codex/cloudflare-planetscale-provisioning`
- Remote refresh: completed 2026-07-27
- Native implementation PR: draft #474; native implementation code head tested
  by the remote checks was `af2d17a1` (later commits are evidence-only).
- Native validation before this reconciliation: passed locally and remotely at
  `af2d17a1` (native workers, migrations, and secret scan)
- Azure compatibility files: retained and not used by native Workers

## Cloudflare

- Current account: shared account (`…e4b3d4ef1af0`), not production-safe
- `lythaus.co` zone: active in the shared account (`…176c29382`)
- Dedicated-account attempt: blocked by Cloudflare API `1002 Forbidden: Account creation is not allowed`
- Workers Paid: active in the shared account (account-level PAYGO subscription)
- PlanetScale Workers integration: active in the shared account
- R2 Paid: active in the shared account
- Existing native resources before this run: one over-privileged Hyperdrive, one unrelated KV, one unrelated R2 bucket, no queues, no workflows
- Existing Hyperdrive: `lythaus-core-fresh` (`…9d51f200`), cache disabled, retained until replacement bindings pass
- Existing unrelated resources remain out of scope

### Development resources created

All resources below are synthetic development resources in the shared account.
They are not production resources and must not receive production data.

- KV: `lythaus-config-dev` (`…3e763b11`)
- R2: `lythaus-media-quarantine-dev`, `lythaus-media-approved-dev`, `lythaus-private-exports-dev`, `lythaus-audit-archive-dev`
- Queues: six `lythaus-*-dev` queues
- Dead-letter queues: six `lythaus-*-dlq-dev` queues
- R2 location hint: `WEUR`; jurisdiction: default (not an EU-jurisdiction guarantee)
- Email Service preview for `notify.lythaus.co`: API returned required MX/SPF/DKIM/DMARC records; DNS records are not yet applied and no sending subdomain was created
- Turnstile widget inventory: blocked by Cloudflare API authentication error `10000`; no widget was created

## PlanetScale

- Organization: `lythaus`
- Database: `lythaus-core`
- Cloudflare billing account: shared account (`…e4b3d4ef1af0`)
- Region: Frankfurt (`eu-central`)
- State: ready
- Version: PostgreSQL 17.10 (`server_version_num=170010`)
- Cluster: PS-5 ARM, production branch with zero replicas
- Branches: `main` only
- User tables: zero
- Non-platform schemas: `public`, `pscale_extensions` only
- Application extensions: none; platform extensions only (`hypopg`, `plpgsql`)
- Database replacement status: eligible by emptiness evidence, but not executed because no supported create/reprovision API is exposed through the authenticated MCP surface and main-branch DDL remains prohibited by repository policy

## Native implementation additions

- Media finalisation now emits `media.upload.finalised` to the dedicated media queue.
- Jobs validate image magic bytes and dimensions, re-encode through the Images
  binding, publish only approved WebP derivatives, update the media ledger, and
  remove quarantine objects.
- Privacy events start deterministic export/delete Workflows. Delete handles
  session revocation, legal holds, redaction, media purge, locator reconciliation,
  and a deletion tombstone. Export writes a hashed `lythaus-data-passport-v1`
  package to private R2 and records its manifest.

## Data disposition

Azure data disposition remains **selective-preservation pending owner signature**.
No Azure data was exported, deleted, or modified by this run.

## Gate impact

| Gate | Status | Evidence | Remaining blocker |
| --- | --- | --- | --- |
| 1 | BLOCKED | Shared account and forbidden account-create response | Owner-side dedicated Cloudflare account and data-disposition signature |
| 2 | BLOCKED | Frankfurt PS-5/main-only snapshot | Region/tier benchmark and HA topology |
| 3 | IN PROGRESS | Empty-state proof and native migration artefacts | Development branch, roles, grants, Hyperdrive replacements |
| 4 | IN PROGRESS | Native Workers scaffold and dev resources | Deploy and end-to-end validation |
| 5 | BLOCKED | No restore/cutover executed | Independent backup, recovery drills, domains, rollback rehearsal |
