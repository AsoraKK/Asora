# Cosmos Export Validation

## Result

**BLOCKED — no raw document export was attempted.**

The account contains 32 live container names. Aggregate reads against `privacy_requests`, `privacy_audit`, and `legal_holds` returned HTTP 403 using the current Entra data-plane identity. The same data-plane permission must be validated before a complete 32-container export can be claimed.

For every container, the required external artifacts remain pending:

```text
<container>-documents.ndjson
<container>-configuration.json
<container>-count.txt
<container>-sha256.txt
```

No source item counts, exported counts, retry counts, hashes, or second encrypted copies exist. No document bodies were retrieved.
