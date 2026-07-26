# DSR Reconciliation

## Current evidence

Read-only Azure Storage Queue SDK metadata returned approximate message count `0` for:

| Queue | Approximate count |
|---|---:|
| `dsr-requests` | 0 |
| `dsr-requests-poison` | 0 |
| `dsr-diagnostic-ping` | 0 |
| `dsr-diagnostic-ping-poison` | 0 |

The DSR export blob container `stasoradsrdev/dsr-exports` returned zero blobs and zero bytes during metadata-only enumeration.

## Unresolved privacy state

Read-only Cosmos count queries against `privacy_requests`, `privacy_audit`, and `legal_holds` returned HTTP 403 using the current Entra data-plane identity. Therefore queued, processing, completed, failed, purge, and legal-hold totals remain unknown.

Zero queue depth is not sufficient to clear the DSR gate while durable privacy records remain unreadable.

No messages were read, dequeued, updated, or processed.
