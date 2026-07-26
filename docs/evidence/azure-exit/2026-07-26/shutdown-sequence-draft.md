# Shutdown Sequence Draft

1. Freeze application writes and announce a maintenance window.
2. Complete encrypted PostgreSQL and Cosmos exports.
3. Verify SHA-256 checksums and independent item/table counts.
4. Restore PostgreSQL and validate queries.
5. Reconcile Cosmos exports and container configuration.
6. Resolve DSR queue, poison queue, legal-hold, and outstanding-request state.
7. Archive required logs, alerts, deployment proof, and compliance evidence.
8. Disable Azure deployment paths after migration validation.
9. Rotate/revoke Azure credentials and OIDC principals after cutover.
10. Obtain explicit approval for destructive decommissioning.
11. Delete compute, databases, monitoring, storage, networking, certificates, Key Vaults, and resource groups in dependency order.
12. Verify residual costs, hidden/managed resources, reservations, Marketplace charges, and subscription state.

No step above was executed. The sequence cannot advance beyond discovery until current queue state, backups, restore tests, billing, RBAC, and residual-resource reconciliation are complete.
