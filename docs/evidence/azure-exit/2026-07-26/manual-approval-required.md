# Manual Approval Required

The following actions are intentionally not executed:

- Install/enable Cost Management tooling or request billing-reader access.
- Request Key Vault key/certificate read permission and role-assignment reader permission.
- Export PostgreSQL or Cosmos data to approved encrypted storage.
- Restore PostgreSQL and reconcile Cosmos exports.
- Freeze writes, disable deployment workflows, revoke credentials, or rotate secrets.
- Drain, purge, dequeue, disable, or delete any queue, storage account, database, Function App, plan, monitor, network, Key Vault, resource group, or subscription.

Illustrative destructive commands, for human review only (do not run from this packet):

```powershell
az functionapp delete -g <resource-group> -n <function-app>
az postgres flexible-server delete -g <resource-group> -n <server>
az cosmosdb delete -g <resource-group> -n <account>
az storage account delete -g <resource-group> -n <account>
az group delete -n <resource-group>
```

Each command requires named approval, dependency verification, export completion, restore proof, and a separate change window.
