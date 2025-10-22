# Cosmos DB Terraform - Quick Reference

## Daily Commands

```bash
# Validate before any changes
bash tests/cosmos-pre-deployment.sh

# Plan changes (staging/dev)
cd infra/terraform/envs/staging
terraform plan -var-file=staging.tfvars

# Apply (after review)
terraform apply -var-file=staging.tfvars
```

## Import Existing Container

```bash
bash infra/scripts/import-cosmos-container.sh <env> <container-name>
# Example:
bash infra/scripts/import-cosmos-container.sh staging posts
```

## Environment Modes

| Environment | Account Type | Mode | Throughput | Analytical Storage |
|-------------|-------------|------|------------|-------------------|
| **Dev** | Serverless | `serverless` | None (auto) | ❌ Not supported |
| **Staging** | Provisioned | `autoscale` | 1k-10k RU/s | ✅ Optional |
| **Prod** | Provisioned | `autoscale` | 1k-10k RU/s | ✅ Optional |

## Container Definitions

### Serverless (Dev)
```hcl
containers = [
  {
    name          = "posts"
    partition_key = "/authorId"
    index_file    = "posts.index.json"
    # No throughput needed
  }
]
```

### Autoscale (Prod)
```hcl
containers = [
  {
    name           = "posts"
    partition_key  = "/authorId"
    index_file     = "posts.index.json"
    max_throughput = 10000  # 1k-10k RU/s autoscale
  }
]
```

## JSON Policy Rules

✅ **Valid:**
```json
{
  "indexingMode": "consistent",
  "includedPaths": [{"path": "/*"}],
  "excludedPaths": [{"path": "/\"_etag\"/?"}],
  "compositeIndexes": [
    [
      {"path": "/field1", "order": "ascending"},
      {"path": "/field2", "order": "descending"}
    ]
  ]
}
```

❌ **Invalid:**
```json
{
  "automatic": true,  // ❌ Remove this
  "excludedPaths": [
    {"path": "/\"_attachments\"/?"}  // ❌ System property
  ],
  "compositeIndexes": []  // ❌ Remove empty arrays
}
```

## Safety Checklist

Before `terraform apply`:

- [ ] Ran `bash tests/cosmos-pre-deployment.sh` ✅
- [ ] Plan shows **update** not **replace** ✅
- [ ] Reviewed partition key changes (can't downgrade v2→v1) ✅
- [ ] Prod has `prevent_destroy = true` enabled ✅
- [ ] Imported existing containers first (if any) ✅

## Troubleshooting

### "Replace" instead of "Update"
🚨 **STOP!** Do not apply. This will delete data.

**Causes:**
- Partition key version mismatch (v1 → v2)
- Partition key path change
- Account type mismatch (serverless ↔ provisioned)

**Solution:** Import existing container first, or migrate data manually.

### "Bad Request: analyticalStorageTtl"
**Cause:** Serverless account with analytical storage enabled

**Solution:** Set `enable_analytical_storage = false` for serverless mode

### "Bad Request: throughput not supported"
**Cause:** Serverless account with autoscale/provisioned mode

**Solution:** Use `mode = "serverless"` and remove `max_throughput` from containers

## File Locations

```
infra/
├── scripts/
│   ├── validate-cosmos-indexes.sh  # JSON validation
│   └── import-cosmos-container.sh  # Import helper
└── terraform/
    ├── modules/cosmos_sql/         # Reusable module
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── envs/
        ├── staging/                 # Dev (serverless)
        │   ├── main.tf
        │   ├── staging.tfvars
        │   └── backend.tf
        └── prod/                    # Prod (autoscale)
            ├── main.tf
            ├── prod.tfvars
            └── backend.tf

database/cosmos/indexes/             # JSON policies
├── posts.index.json
├── comments.index.json
└── ...

tests/
└── cosmos-pre-deployment.sh        # Validation pipeline
```

## Module Variables

```hcl
variable "mode" {
  type    = string
  default = "serverless"  # or "autoscale", "provisioned"
}

variable "enable_analytical_storage" {
  type    = bool
  default = false  # Not supported in serverless
}

variable "manage_database" {
  type    = bool
  default = false  # Use existing database
}
```

## Common Tasks

### Add New Container
1. Create `database/cosmos/indexes/newcontainer.index.json`
2. Add to `containers` list in env main.tf
3. Run validation: `bash tests/cosmos-pre-deployment.sh`
4. Plan and apply

### Update Index Policy
1. Edit JSON file in `database/cosmos/indexes/`
2. Validate: `bash infra/scripts/validate-cosmos-indexes.sh`
3. Plan (should show update-in-place)
4. Apply

### Change Partition Key
⚠️ **Requires data migration** - cannot be done in-place.

### Enable Analytical Storage
1. Ensure account type is provisioned (not serverless)
2. Set `enable_analytical_storage = true` in env main.tf
3. Plan and apply (adds TTL = -1)

## State Management

```bash
# View current state
terraform show

# List resources
terraform state list

# Remove resource from state (doesn't delete actual resource)
terraform state rm 'module.cosmos_sql.azurerm_cosmosdb_sql_container.container["posts"]'

# Refresh state
terraform refresh -var-file=staging.tfvars
```
