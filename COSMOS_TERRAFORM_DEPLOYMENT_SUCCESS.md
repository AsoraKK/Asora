# Cosmos DB Terraform Deployment - Success Report

**Date:** October 22, 2025  
**Environment:** Dev (asora-cosmos-dev) - Serverless  
**Status:** ✅ **DEPLOYMENT COMPLETE**

---

## Summary

Successfully deployed all 9 Cosmos DB containers using Terraform with proper index policies, v2 partition keys, and serverless throughput mode. The deployment encountered several issues that were resolved iteratively.

---

## Final Container Inventory

| Container | Partition Key | Version | Composites | Purpose |
|-----------|--------------|---------|------------|---------|
| **posts** | `/authorId` | v2 | 3 | Core content with feed queries |
| **comments** | `/postId` | v2 | 1 | Threaded comments |
| **likes** | `/contentId` | v2 | 0 | Simple engagement tracking |
| **content_flags** | `/targetId` | v2 | 1 | Moderation triage |
| **moderation_decisions** | `/itemId` | v2 | 1 | Decision audit trail |
| **appeals** | `/id` | v2 | 1 | User dispute queue |
| **appeal_votes** | `/appealId` | v2 | 1 | Community voting |
| **users** | `/id` | v2 | 0 | Identity lookups |
| **config** | `/partitionKey` | v2 | 0 | App settings |

**Total:** 9 containers, all with v2 hierarchical partition keys

---

## Issues Encountered & Resolutions

### Issue 1: Serverless vs. Autoscale Mismatch
**Problem:** `asora-cosmos-dev` is a serverless account, but Terraform was configured for autoscale mode  
**Error:** `Setting offer throughput or autopilot on container is not supported for serverless accounts`  
**Resolution:** Changed `infra/terraform/envs/staging/main.tf` mode from `"autoscale"` to `"serverless"`

### Issue 2: Excluded Path for System Property
**Problem:** JSON index policies included `/\"_attachments\"/?` in excluded paths  
**Error:** `The specified path '/\"_attachments\"/?' could not be accepted because it overrides system property '_attachments'`  
**Resolution:** Removed `_attachments` from excluded paths in all 9 JSON files

### Issue 3: Analytical Storage TTL Not Supported
**Problem:** Module had `analytical_storage_ttl = -1` hardcoded  
**Error:** `analyticalStorageTtl' is not a valid property in the current payload`  
**Resolution:** Updated module to conditionally set TTL: `var.mode != "serverless" ? -1 : null`

### Issue 4: Deprecated `partition_key_path`
**Problem:** Terraform warned about deprecated `partition_key_path` attribute  
**Resolution:** Updated module to use `partition_key_paths = [each.value.partition_key]`

### Issue 5: Invalid `automatic` Field
**Problem:** JSON policies contained `"automatic": true` which Terraform doesn't support  
**Resolution:** Removed `automatic` field from all 9 JSON files

### Issue 6: Config Container Selective Indexing
**Problem:** Config policy had selective included paths (`/partitionKey/?`, `/id/?`, etc.)  
**Error:** `generating indexing policy for Container`  
**Resolution:** Simplified to standard `/*` included path (still minimal due to single partition)

---

## Files Modified

### Terraform Module (`infra/terraform/modules/cosmos_sql/main.tf`)
```diff
- partition_key_path    = each.value.partition_key
+ partition_key_paths   = [each.value.partition_key]

- analytical_storage_ttl = -1
+ analytical_storage_ttl = var.mode != "serverless" ? -1 : null
```

### Environment Configuration (`infra/terraform/envs/staging/main.tf`)
```diff
- mode            = "autoscale"
+ mode            = "serverless" # Dev account is serverless; change to autoscale for real staging
```

### Index Policies (`database/cosmos/indexes/*.index.json`)
- Removed `/\"_attachments\"/?` from `excludedPaths` (all 9 files)
- Removed `"automatic": true` field (all 9 files)
- Simplified `config.index.json` to use `/*` included path

---

## Post-Deployment Verification

### Container List
```bash
az cosmosdb sql container list \
  --account-name asora-cosmos-dev \
  --database-name asora \
  --resource-group asora-psql-flex \
  --query "[].{name:name,partitionKey:resource.partitionKey.paths[0],version:resource.partitionKey.version}" \
  -o table
```

**Result:** All 9 containers present with v2 partition keys ✅

### Composite Index Verification
- **posts**: 3 composites (authorId+createdAt, createdAt+score, visibility+createdAt)
- **comments**: 1 composite (postId+createdAt)
- **content_flags**: 1 composite (targetId+createdAt DESC)
- **moderation_decisions**: 1 composite (itemId+decidedAt DESC)
- **appeals**: 1 composite (createdAt DESC+status)
- **appeal_votes**: 1 composite (appealId+createdAt)
- **likes**: 0 composites (point reads only)
- **users**: 0 composites (partition key lookups)
- **config**: 0 composites (single logical partition)

---

## Next Steps

### Immediate
1. ✅ All containers deployed successfully
2. ⚠️ **Update ADR_002** to reflect config index policy change (selective → standard)
3. ⚠️ **Test application** with new container structure
4. ⚠️ **Migrate data** from old posts container (if needed)

### Short-Term
1. **Provision staging/prod accounts** with autoscale throughput:
   ```bash
   # Create staging account (example)
   az cosmosdb create \
     --name asora-cosmos-stg \
     --resource-group asora-psql-flex \
     --locations regionName=eastus failoverPriority=0 \
     --enable-automatic-failover false \
     --default-consistency-level Session
   ```
2. **Update tfvars** to point to real accounts:
   - `staging.tfvars`: `account_name = "asora-cosmos-stg"`
   - `prod.tfvars`: `account_name = "asora-cosmos-prd"`
3. **Update staging/prod main.tf** to use `mode = "autoscale"`
4. **Deploy to staging**, then prod after validation

### Long-Term
1. Add CI/CD workflow for Terraform plan/apply automation
2. Integrate with GitHub Actions deployment pipeline
3. Set up monitoring for RU consumption and query performance
4. Document operational runbook updates based on real usage

---

## Lessons Learned

1. **Always check account type** before configuring throughput mode (serverless vs. provisioned/autoscale)
2. **Avoid explicit system properties** in index policies (`_attachments`, `_rid`, etc.)
3. **Analytical storage** is not supported in serverless mode
4. **Terraform deprecation warnings** should be addressed proactively (e.g., `partition_key_path`)
5. **Selective indexing** with specific paths can be tricky; prefer `/*` with exclusions unless performance requires otherwise
6. **JSON policy validation** should include field compatibility checks (e.g., `automatic` flag)

---

## References

- **ADR_002:** Partition key decisions and rationale
- **COSMOS_RUNBOOK.md:** Operational procedures and verification commands
- **COSMOS_TERRAFORM_VALIDATION_REPORT.md:** Pre-deployment validation results
- **Terraform Module:** `infra/terraform/modules/cosmos_sql/`
- **Index Policies:** `database/cosmos/indexes/*.index.json`

---

## Deployment Timeline

1. **Import existing posts container** → Failed (incompatible with v2 partition keys)
2. **First apply attempt** → Failed (autoscale on serverless account)
3. **Switch to serverless mode** → Failed (`_attachments` in excluded paths)
4. **Fix excluded paths** → Failed (`analyticalStorageTtl` not supported)
5. **Conditional TTL logic** → Failed (deprecated `partition_key_path`)
6. **Update to partition_key_paths** → Failed (`automatic` field in JSON)
7. **Remove automatic field** → 8/9 succeeded, config failed (selective indexing)
8. **Simplify config policy** → ✅ **All 9 containers deployed**

**Total iterations:** 8  
**Total time:** ~30 minutes (including troubleshooting)

---

## Conclusion

The Cosmos DB Terraform infrastructure is now fully operational with all 9 containers deployed correctly. The serverless dev environment is suitable for testing, but staging/prod accounts with autoscale throughput should be provisioned soon to match production requirements documented in ADR_002.

**Deployment Status:** ✅ COMPLETE  
**Blocking Issues:** None  
**Ready for:** Application integration testing
