# Native deployment and rollback runbook

## Preconditions

1. PR #474 is merged and the resulting immutable GitHub `main` SHA has green native validation,
   migration-contract, and secret-scan checks.
2. Every `predeploy` gate is recorded as `COMPLETED` in
   `infrastructure/cloudflare/production-gates.json`. The `final` gates remain
   open until the live domains and runtime can be tested.
3. Existing production-promoted Cloudflare account, zone, Worker, Hyperdrive,
   R2, Queue, Workflow, KV, and Access identifiers match the resource registry.
4. `PLANETSCALE_SCHEMA_READ_DATABASE_URL` is a registry-only connection with
   `sslmode=verify-full`. It has `CONNECT`, `USAGE` on `system`, and `SELECT`
   on `system.schema_migrations`; it has no application-table or DDL access.
5. The verifier checks both the normalized Git blob hashes and the exact
   mixed-line-ending payload hashes recorded when the approved migration set
   was applied. This preserves the owner-approved 45,647-byte payload without
   depending on checkout-specific line-ending conversion.

## Deployment order

1. Record and check out the exact merge SHA from `main`.
2. Verify the already-applied migration registry using the registry-only
   connection. Worker deployment never applies DDL.
3. Independently verify schemas, roles, and representative queries through
   PlanetScale MCP.
4. Deploy the physical Workers `lythaus-jobs-development`,
   `lythaus-admin-api-development`, and `lythaus-public-api-development`.
5. Run health, readiness, authentication, content, privacy, queue,
   Workflow, Access, and no-Azure-call smoke tests.
6. Verify custom domains and cache headers before DNS changes.
7. Switch `api.lythaus.co` only after the rollback snapshot is recorded.
8. Record every live acceptance result under the `final` gate group and run
   `npm run validate:production-gates:final`.

## Rollback

1. Stop the native deployment workflow and preserve logs and audit evidence.
2. Route the public and admin domains back to the separately deployed
   `asora-azure-compat` path using the approved DNS/route change.
3. Keep PlanetScale data and migration evidence intact; do not delete or
   rewrite migrations.
4. Reconcile queued events and privacy requests before retrying native traffic.
5. Record the failed gate, exact release SHA, timestamps, and rollback result.

Azure resources and credentials are not deleted or rotated by rollback.
