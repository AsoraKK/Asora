# Validation Checklist

| Check | Result |
|---|---|
| Repository remote and branch checked | Passed |
| Working tree classified | Passed; pre-existing dirty files preserved |
| Azure CLI/session/subscription checked | Passed |
| Subscription/resource-group inventory | Partial; provider-specific resources verified, generic/provider discrepancy remains |
| Repository Azure scan | Passed; evidence mapping is summarized by subsystem |
| Function inventory | Partial; 131 names listed by live API, exact package binding export pending |
| Storage/queue inventory | Partial; all four DSR queue counts verified as zero; raw storage export pending |
| PostgreSQL metadata | Partial; server metadata found, schema/data metadata not queried |
| Cosmos metadata | Partial; container config found, count discrepancy requires rerun |
| Key Vault metadata | Partial; secret names found, keys/certs forbidden |
| RBAC/identity | Partial; 40 assignment records and 14 scopes verified through REST; owner/role-name mapping pending |
| Cost data | Blocked; CLI lacks Cost Management command |
| Backups | Pending; no approved encrypted destinations |
| Restore tests | Pending; no PostgreSQL dump |
| Evidence secret scan | Required after packet creation |
| Checksums | Required after packet creation |
| Sanitized packet copied to primary workspace destination | Passed; 39 files and hashes agree |
| Sanitized packet copied to secondary workspace destination | Passed; 39 files and hashes agree |
| Destination independence | Failed by design; both copies are on `C:` |
| Azure modifications | None intended or observed |
