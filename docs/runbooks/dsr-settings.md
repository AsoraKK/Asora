# Native privacy runtime contract

Lythaus privacy requests run on the existing Cloudflare and PlanetScale estate. Azure Functions, Azure Storage Queues, Azure Blob Storage, Cosmos DB, and Key Vault are not runtime dependencies.

## Required bindings

The jobs Worker must retain:

- `DB_PRIVACY_FRESH` for canonical privacy state;
- `PRIVATE_EXPORTS` bound to `lythaus-private-exports-dev`;
- `AUDIT_ARCHIVE` bound to `lythaus-audit-archive-dev`;
- `PRIVACY_QUEUE` with `lythaus-privacy-dlq-dev`;
- `ACCOUNT_DELETE` using `AccountDeleteWorkflow`;
- `ACCOUNT_EXPORT` using `AccountExportWorkflow`;
- `RETENTION_CLEANUP` using `RetentionCleanupWorkflow`.

The admin Worker must retain `DB_PRIVACY_FRESH` and `PRIVATE_EXPORTS` for staff review and controlled export access.

The physical `-dev` names are promoted production-critical resources. They are not disposable development resources and must not be recreated merely to obtain cleaner names.

## Required data contracts

- `privacy.reconcile_subject_data_locations` runs before export or deletion.
- `privacy.legal_holds` blocks deletion when an active hold exists.
- `privacy.deletion_tombstones` records completed deletion evidence.
- `privacy.export_manifests` records generated export package provenance.
- Request and workflow writes remain idempotent.
- Queue consumers retain bounded retries and a dead-letter queue.
- Private exports remain non-public and lifecycle policy changes require review.

## Schedule

The jobs Worker schedule remains `*/15 * * * *` because it relays the transactional outbox and provides recovery for enabled privacy and retention workflows. Disable it only after an equivalent event-driven recovery path is proven.

## Validation

1. Submit an export request and verify queue delivery, workflow completion, R2 package creation, and `privacy.export_manifests` reconciliation.
2. Submit a delete request for a disposable account and verify relationship cleanup, tombstone creation, and subject-locator reconciliation.
3. Add an active legal hold and verify deletion stops in the blocked state without removing subject data.
4. Redeliver a queue message and verify idempotent handling.
5. Force retryable failure and verify bounded retries and DLQ behavior.
6. Confirm logs contain correlation IDs and no personal data, tokens, or secrets.

## Azure legacy note

Historical Azure DSR settings and deployment evidence remain in the migration evidence set only. They are not active configuration and must not be restored to an executable GitHub workflow.
