# PostgreSQL HA Retirement Posture — September 2026

## Status: No Active IaC Resources

**As of the infra/azure-retirement-hardening-node22-tls-kv-pg-ha branch audit (2025):**

The Asora platform uses **Cosmos DB** as its primary database. Azure Database for PostgreSQL
Flexible Server resources appear **only in archived Terraform state backup files**
(`backup-tfstate.json`) and are not present in any active Terraform configuration.

There is no PostgreSQL IaC (`azurerm_postgresql_flexible_server`) in the currently deployed
infrastructure modules under `infrastructure/` or `database/`.

---

## Microsoft Retirement: Same-Zone HA Auto-Migration

**Effective date: 1 September 2026**

Azure is retiring single-zone (no-HA) deployments for PostgreSQL Flexible Server in favour of
mandatory zone-redundant or same-zone HA where supported. From 1 Sept 2026, Microsoft will
**auto-migrate** any eligible PostgreSQL Flexible Server without explicit HA configuration.

> Reference: https://learn.microsoft.com/azure/postgresql/flexible-server/concepts-high-availability

### Impact Assessment

| Resource | Type | HA Status | Action Required |
|----------|------|-----------|-----------------|
| (none active) | — | — | None |

No action is required for Asora infrastructure because there are no active PostgreSQL Flexible
Server deployments. If PostgreSQL is re-introduced, the guidance below applies.

---

## If PostgreSQL Is Reintroduced

### Terraform resource template (with explicit HA)

```hcl
resource "azurerm_postgresql_flexible_server" "example" {
  name                = "psql-asora-${var.env}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  version             = "16"
  sku_name            = "GP_Standard_D2s_v3"

  high_availability {
    mode                      = "ZoneRedundant"  # or "SameZone" for single-AZ regions
    standby_availability_zone = "2"
  }

  storage_mb                   = 32768
  backup_retention_days        = 35
  geo_redundant_backup_enabled = false

  tags = {
    application = "Asora-Mobile"
    env         = var.env
  }
}
```

### Verification commands

```bash
# List all PostgreSQL Flexible Servers in the subscription
az postgres flexible-server list \
  --subscription 99df7ef7-776a-4235-84a4-c77899b2bb04 \
  --query "[].{name:name, rg:resourceGroup, ha:highAvailability.mode, state:state}" \
  -o table

# Check HA on a specific server
az postgres flexible-server show \
  --name <server-name> \
  --resource-group <rg-name> \
  --query "{name:name, haMode:highAvailability.mode, haState:highAvailability.state}" \
  -o table
```

### Recommended posture

- Use `ZoneRedundant` HA for production workloads when two AZs are available in the region.
- Use `SameZone` HA for regions with single-AZ support.
- Setting `mode = "Disabled"` is explicitly opt-out of HA and risks auto-migration noise.
- Explicitly declare `high_availability` in all Terraform resources to prevent surprise changes
  from the 1 Sept 2026 auto-migration.

---

## Archive State Reference

The `backup-tfstate.json` in the repo root is a read-only archive and does **not** represent
deployed infrastructure. It contains legacy state from a prior PostgreSQL pilot and should not
be applied. Do not run `terraform apply` against this file.

---

## Related Runbooks

- [Azure Retirement Hardening 2026](./azure-retirement-2026.md)
