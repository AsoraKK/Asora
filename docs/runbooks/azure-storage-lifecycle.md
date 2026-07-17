# Azure storage lifecycle verification

## Deployment storage

The shared-MVP Function App uses `asoraflexdev1404`. Cleanup must protect:

- the active deployment blob;
- the newest 10 successful rollback packages;
- every package newer than 60 days.

Generate a read-only inventory:

```powershell
pwsh scripts/azure/inventory-function-deployment-packages.ps1 | Out-File .artifacts/azure-cost/deployment-packages.json
```

The operator requires Blob Data Reader access. The script fails if the active package cannot be identified and never deletes data. Review `eligibleAfterReview` candidates against deployment records before creating any cleanup command.

The current 30-day base-blob lifecycle rule cannot guarantee newest-ten retention. Do not rely on it for cleanup. Before a live policy change, export it with:

```powershell
az storage account management-policy show --resource-group asora-psql-flex --account-name asoraflexdev1404 --output json | Out-File .artifacts/azure-cost/host-storage-policy-before.json
```

Rollback uses the exact exported policy:

```powershell
az storage account management-policy create --resource-group asora-psql-flex --account-name asoraflexdev1404 --policy '@.artifacts/azure-cost/host-storage-policy-before.json'
```

## DSR storage

`stasoradsrdev` retains exports for the approved 30 days. Before changing its lifecycle policy:

1. Confirm the application setting `DSR_EXPORT_RETENTION_DAYS` without printing secrets.
2. Inventory base blobs, snapshots, and previous versions with a data-plane identity.
3. Confirm active exports and legal holds.
4. Export the current policy locally.
5. Validate a candidate rule covers expired base blobs, snapshots, and previous versions under the exact DSR export prefix.

Never delete queues, active exports, legal-hold data, or data inside the retention window.

## Media storage

`asoramediadev` is audit-only in this pass. Do not change tiers or retention until access frequency, restore latency, and media-origin behavior are measured.
