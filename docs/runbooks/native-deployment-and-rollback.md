# Native deployment and rollback runbook

## Preconditions

1. PR #474 is merged and the resulting immutable GitHub `main` SHA has green native validation,
   migration-contract, and secret-scan checks.
2. The five acceptance gates are recorded as passed in
   `infrastructure/cloudflare/production-gates.json`.
3. Existing production-promoted Cloudflare account, zone, Worker, Hyperdrive,
   R2, Queue, Workflow, KV, and Access identifiers match the resource registry.
4. `PLANETSCALE_ADMIN_DATABASE_URL` is a direct administrative connection with
   `sslmode=verify-full`; Workers never run migrations through Hyperdrive.

## Deployment order

1. Record and check out the exact merge SHA from `main`.
2. Apply reviewed migrations and grants to PlanetScale `main`.
3. Verify extensions, roles, schema checksums, and representative queries.
4. Deploy the physical Workers `lythaus-jobs-development`,
   `lythaus-admin-api-development`, and `lythaus-public-api-development`.
5. Run health, readiness, authentication, content, privacy, queue,
   Workflow, Access, and no-Azure-call smoke tests.
6. Verify custom domains and cache headers before DNS changes.
7. Switch `api.lythaus.co` only after the rollback snapshot is recorded.

## Rollback

1. Stop the native deployment workflow and preserve logs and audit evidence.
2. Route the public and admin domains back to the separately deployed
   `asora-azure-compat` path using the approved DNS/route change.
3. Keep PlanetScale data and migration evidence intact; do not delete or
   rewrite migrations.
4. Reconcile queued events and privacy requests before retrying native traffic.
5. Record the failed gate, exact release SHA, timestamps, and rollback result.

Azure resources and credentials are not deleted or rotated by rollback.
