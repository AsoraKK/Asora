# Azure Exit Readiness Report

## 1. Executive Summary

Azure remains materially runtime-critical. The live subscription contains a running Function App, PostgreSQL, Cosmos DB, DSR storage queues, media/storage accounts, Key Vaults, monitoring, certificates, plans, and alert rules. The audit found no evidence sufficient for shutdown authorization.

## 2. Authentication and Access Status

Azure CLI 2.75.0 is installed and authenticated to the expected subscription and tenant. Resource and provider metadata reads succeeded. Key Vault key/certificate reads, role-assignment query, queue depth, and Cost Management queries were unavailable or incomplete.

## 3. Repository Scope

Azure dependencies span `functions/`, `infra/`, `infrastructure/`, `database/`, `.github/workflows/`, deployment scripts, tests, runbooks, analytics, Flutter/client configuration, and Cloudflare origin configuration.

## 4. Azure Resources Discovered

The generic resource query returned 29 records in five resource groups. Provider-specific discovery additionally verified `stasoradsrdev` and `lythaus-mvp-communication`; the generic/provider inventory discrepancy is documented but remains a reconciliation item.

## 5. Azure Resources Not Found or Unverified

Queue approximate counts are now verified as zero. Key Vault keys/certificates, database schemas, cost records, budgets, backup resources, policies, support/reservation charges, and Cosmos item counts remain unverified. Locks and private DNS queries returned no matching resources. RBAC metadata is verified: 40 assignments across 14 distinct scopes.

## 6. Current Cost Evidence

No current or historical cost figures were retrieved. Likely cost drivers are PostgreSQL, running Flex Functions/always-ready DSR processing, telemetry ingestion, and retained storage, but this is inference only.

## 7. Application Dependencies

The running Function App is the central API and deployment target. Cosmos and PostgreSQL are runtime-critical; storage and Key Vault are required for DSR, media, deployment, and secrets. Cloudflare currently appears in gateway/origin configuration but does not remove Azure runtime dependencies.

## 8. PostgreSQL Status

`asora-pg-dev-ne` is Ready, PostgreSQL 16, Standard_B1ms, 32 GB, seven-day backups, HA disabled, and public network enabled. No backup or restore test was performed.

## 9. Cosmos DB Status

`asora-cosmos-dev` is a North Europe SQL/GlobalDocumentDB account with Session consistency, Continuous backup, public network enabled, database `asora`, and live containers including privacy, audit, auth, users, posts, comments, likes, moderation, notifications, and configuration collections. Counts and exports are pending.

## 10. Functions and Queue Status

Three Function Apps were found: one Running and two Stopped. The running app reports 131 deployed functions. DSR queues and poison equivalents were listed and each reports approximate depth zero. Cosmos privacy-state counts remain blocked by data-plane 403 responses.

## 11. Privacy and DSR Status

DSR processing depends on HTTP entrypoints, Cosmos state/audit, PostgreSQL, `stasoradsrdev`, queue triggers, export storage, Key Vault, and telemetry. Queue depth is zero, but outstanding-request and legal-hold state are unverified because Cosmos data-plane reads returned 403; DSR remains a shutdown blocker.

## 12. Key Vault and Secret Dependencies

Two RBAC-enabled, soft-delete-enabled Standard vaults were found. Secret names were inventoried without values. Key and certificate enumeration was forbidden. Active-looking credentials require rotation during approved migration.

## 13. Identity, RBAC and GitHub Dependencies

Managed identity `mi-asora-cicd`, SystemAssigned Function identities, GitHub OIDC variables, Azure login workflows, and Key Vault references are present. Exact role scopes remain unverified.

## 14. Networking and DNS Dependencies

`vnet-asora-dev` contains `10.1.0.0/16` and `GatewaySubnet`; no private endpoints or public IPs were returned. PostgreSQL and Cosmos are publicly enabled. Azure certificates and Azure hostnames remain tied to domain and ingress migration.

## 15. Monitoring and Evidence Retention

Application Insights, Log Analytics, five DSR scheduled-query alerts, and a health dashboard were found. Retain DSR execution, deployment, incident, authentication, performance, and cost evidence before shutdown.

## 16. Backup and Restore Readiness

PostgreSQL and Cosmos backup procedures are documented, but no exports or restore tests were completed. This section is not ready.

## 17. Shutdown Blockers

- Outstanding DSR records, legal holds, and privacy-state counts unverified; queue approximate counts are zero.
- PostgreSQL and Cosmos exports absent.
- PostgreSQL restore test absent.
- Cosmos count reconciliation absent.
- Billing and residual-cost evidence absent.
- `stasoradsrdev` resource-list discrepancy unresolved.
- `lythaus-mvp-communication` provider/generic inventory discrepancy unresolved.
- Key Vault key/certificate inventory incomplete.
- RBAC assignments and database access incomplete.
- DNS, ingress, OAuth, webhook, and monitoring cutover proof absent.

## 18. Manual Actions Required

See `manual-approval-required.md`, `postgres-export-plan.md`, and `cosmos-export-plan.md`. Kyle must provide approved encrypted export storage, authorized operators, billing-reader access, and missing Azure read permissions.

The copy-pasteable operator procedure is in `azure-exit-data-extraction-operator-pack.md`. Codex local workspace storage is not treated as approved encrypted storage; raw exports remain blocked until two approved encrypted destinations are supplied.

## 19. Proposed Deletion Sequence

See `shutdown-sequence-draft.md`. No destructive command was executed.

## 20. Expected Monthly Savings

Unknown. Cost Management data was unavailable; no estimate is presented as fact.

## 21. Evidence Manifest

See `evidence-manifest.sha256` after final validation.

## 22. Final Recommendation

**NOT READY FOR AZURE SHUTDOWN**

The estate is not eligible for `READY FOR CONTROLLED DATA EXPORT` until approved encrypted destinations, data-plane permissions, and export operators are available. It is not eligible for human-approved decommissioning because PostgreSQL and Cosmos exports, restore tests, privacy-state reconciliation, sensitive storage classification, operational migration, and unknown dependencies remain open. See `operational-migration-readiness.md` for the separate Azure-runtime replacement gate.
