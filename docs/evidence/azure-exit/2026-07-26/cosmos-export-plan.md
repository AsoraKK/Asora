# Cosmos DB Export Plan

Export each live container outside GitHub using an approved tool or SDK with read-only credentials. For every container create:

- `<container>-documents.ndjson`
- `<container>-configuration.json`
- `<container>-count.txt`
- `<container>-sha256.txt`

Capture the account/database/container metadata, partition key, indexing policy, unique keys, TTL, throughput mode, and query continuation behavior. Export documents with continuation tokens and preserve a count from the same export run. Reconcile source item counts against exported line counts, including retry/error totals. No documents were exported in this audit. Restore/reconciliation is pending.
