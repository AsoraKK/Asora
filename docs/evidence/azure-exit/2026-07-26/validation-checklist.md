# Validation Checklist

| Check | Result |
|---|---|
| Repository remote and branch checked | Passed |
| Working tree classified | Passed; pre-existing dirty files preserved |
| Azure CLI/session/subscription checked | Passed |
| Subscription/resource-group inventory | Partial; provider discrepancy remains |
| Repository Azure scan | Passed; evidence mapping is summarized by subsystem |
| Function inventory | Partial; 131 names listed by live API, exact package binding export pending |
| Storage/queue inventory | Partial; queue names found, message depths unavailable |
| PostgreSQL metadata | Partial; server metadata found, schema/data metadata not queried |
| Cosmos metadata | Partial; container config found, count discrepancy requires rerun |
| Key Vault metadata | Partial; secret names found, keys/certs forbidden |
| RBAC/identity | Partial; role query syntax/permission issue remains |
| Cost data | Blocked; CLI lacks Cost Management command |
| Backups | Pending |
| Restore tests | Pending |
| Evidence secret scan | Required after packet creation |
| Checksums | Required after packet creation |
| Azure modifications | None intended or observed |
