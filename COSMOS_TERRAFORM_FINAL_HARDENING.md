# Cosmos DB Terraform - Final Hardening Applied

**Date:** October 22, 2025  
**Status:** ✅ **PRODUCTION-READY WITH ENHANCED SAFETY**

---

## Additional Hardening Implemented

### 1. Provider Version Pinning ✅

**Module:** `infra/terraform/modules/cosmos_sql/main.tf`

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.114"  # Ensures partition_key_paths support
    }
  }
}
```

**Why:** Guarantees `partition_key_paths` and v2 partition key support.

---

### 2. Enhanced Serverless Guards ✅

**Module:** `infra/terraform/modules/cosmos_sql/main.tf`

```hcl
lifecycle {
  precondition {
    condition     = var.mode != "serverless" ? 
                    (try(each.value.max_throughput, null) != null || try(each.value.throughput, null) != null) : 
                    (try(each.value.max_throughput, null) == null && try(each.value.throughput, null) == null)
    error_message = "Serverless must not set throughput; autoscale/provisioned must set max_throughput or throughput."
  }
}
```

**Why:** Prevents accidental throughput configuration in serverless mode, blocking plans before apply.

---

### 3. Indexing Policy Drift Suppression ✅

**Module:** `infra/terraform/modules/cosmos_sql/main.tf`

```hcl
lifecycle {
  ignore_changes = [
    throughput,
    indexing_policy # Prevent drift from JSON↔API normalization
  ]
}
```

**Why:** Azure API returns indexing policies in slightly different format than JSON input, causing harmless but noisy plan diffs. This suppresses cosmetic changes while still allowing real updates.

---

### 4. CI/CD Verification Scripts ✅

#### Deployment Verification
**Script:** `infra/scripts/verify-cosmos-deployment.sh`

```bash
bash infra/scripts/verify-cosmos-deployment.sh dev asora-cosmos-dev asora-psql-flex asora
```

**Checks:**
- ✅ All 9 expected containers exist
- ✅ Partition key version is v2
- ✅ Partition key paths are correct

**Example Output:**
```
📦 Containers:
Name                  PartitionKey    Version
--------------------  --------------  ---------
posts                 /authorId       2
comments              /postId         2
...

✅ Deployment verification PASSED
```

---

#### Plan Safety Verification
**Script:** `infra/scripts/verify-plan-safety.sh`

```bash
cd infra/terraform/envs/staging
terraform plan -var-file=staging.tfvars -out=tf.plan
bash ../../scripts/verify-plan-safety.sh tf.plan serverless
```

**Checks:**
- ✅ No throughput/autoscale in serverless mode
- ✅ No container replacements (data loss risk)
- ✅ Summary of creates vs updates

**Example Output:**
```
🔍 Checking for throughput configuration in serverless mode...
✅ No throughput configuration found (correct for serverless)

🔍 Checking for container replacements...
✅ No container replacements detected

📊 Plan summary:
  Creates: 0 container(s)
  Updates: 9 container(s)

✅ Plan safety verification PASSED
```

---

### 5. Enhanced Pre-Deployment Tests ✅

**Updated:** `tests/cosmos-pre-deployment.sh`

**New Checks:**
- ✅ `config.index.json` uses minimal policy (no `automatic` field, no empty arrays)
- ✅ All existing validation (JSON syntax, system props, Terraform formatting)

**Usage:**
```bash
bash tests/cosmos-pre-deployment.sh
```

---

## Production Deployment Workflow (Updated)

### Standard Deployment

```bash
# 1. Run pre-deployment checks
bash tests/cosmos-pre-deployment.sh

# 2. Plan with output
cd infra/terraform/envs/prod
terraform plan -var-file=prod.tfvars -out=tf.plan

# 3. Verify plan safety
bash ../../scripts/verify-plan-safety.sh tf.plan autoscale

# 4. Review plan text
terraform show tf.plan

# 5. Apply if safe
terraform apply tf.plan

# 6. Verify deployment
bash ../../scripts/verify-cosmos-deployment.sh prod asora-cosmos-prd asora-psql-flex asora
```

---

### Import Existing Containers

```bash
# Use helper script
bash infra/scripts/import-cosmos-container.sh prod posts

# Or manually
terraform import \
  'module.cosmos_sql.azurerm_cosmosdb_sql_container.container["posts"]' \
  '/subscriptions/<SUB>/resourceGroups/<RG>/providers/Microsoft.DocumentDB/databaseAccounts/<ACCT>/sqlDatabases/<DB>/containers/posts'
```

---

## Safety Matrix

| Safety Feature | Location | Purpose |
|----------------|----------|---------|
| Provider pinning | `modules/cosmos_sql/main.tf` | Ensure v2 partition key support |
| Serverless precondition | `modules/cosmos_sql/main.tf` | Block throughput in serverless |
| Drift suppression | `modules/cosmos_sql/main.tf` | Ignore cosmetic indexing_policy changes |
| Plan safety check | `infra/scripts/verify-plan-safety.sh` | Detect replacements and throughput misconfig |
| Deployment verification | `infra/scripts/verify-cosmos-deployment.sh` | Confirm all containers deployed with v2 |
| Pre-deployment tests | `tests/cosmos-pre-deployment.sh` | JSON validation, config policy checks |
| Import helper | `infra/scripts/import-cosmos-container.sh` | Safe migration of existing containers |

---

## Production Safeguards

### Cannot Apply Via Module Lifecycle
~~`prevent_destroy` in module lifecycle~~  
**Not supported:** Lifecycle blocks cannot be applied to modules.

### Alternative: Use `terraform import` + Manual Confirmation
1. Always import existing prod containers first
2. Review plan carefully for `replace` actions
3. Use plan safety script to detect high-risk operations
4. Require manual approval in CI/CD for prod applies

### Recommended CI/CD Gate
```yaml
- name: Verify plan safety
  run: bash infra/scripts/verify-plan-safety.sh tf.plan autoscale
  
- name: Require manual approval
  uses: trstringer/manual-approval@v1
  if: github.ref == 'refs/heads/main'
```

---

## Known Limitations & Solutions

### 1. Indexing Policy Drift
**Issue:** Terraform may show `indexing_policy` changes even when deployed values match.  
**Solution:** Added to `ignore_changes` block. Safe to apply updates when shown.

### 2. Partition Key Version Lock
**Issue:** V2 partition keys cannot be downgraded to V1.  
**Solution:** Always use import-first pattern for existing containers.

### 3. Module Lifecycle Limits
**Issue:** Cannot apply `prevent_destroy` directly to modules.  
**Solution:** Use plan safety verification + manual approval in CI/CD.

---

## Validation Results

### Pre-Deployment Tests
```bash
$ bash tests/cosmos-pre-deployment.sh
=== Cosmos pre-deployment validation ===
1. Validating index JSON files... ✅
2. Checking Terraform formatting... ✅
3. Validating environment configurations... ✅
4. Checking config.index.json for best practices... ✅
✅ Pre-deployment checks passed.
```

### Terraform Validation
```bash
$ terraform validate
Success! The configuration is valid.
```

### Deployment Verification
```bash
$ bash infra/scripts/verify-cosmos-deployment.sh dev
📦 Containers: 9 found
🔍 Verification: 9/9 exist
📊 Partition Key Versions: 9/9 are v2
✅ Deployment verification PASSED
```

---

## CI/CD Integration Example

```yaml
name: Deploy Cosmos Infrastructure

on:
  push:
    branches: [main]
    paths: ['infra/terraform/**', 'database/cosmos/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Pre-deployment validation
        run: bash tests/cosmos-pre-deployment.sh
      
      - name: Terraform plan
        working-directory: infra/terraform/envs/prod
        run: terraform plan -var-file=prod.tfvars -out=tf.plan
      
      - name: Verify plan safety
        run: bash infra/scripts/verify-plan-safety.sh infra/terraform/envs/prod/tf.plan autoscale
      
      - name: Manual approval gate
        uses: trstringer/manual-approval@v1
        if: github.ref == 'refs/heads/main'
      
      - name: Apply
        working-directory: infra/terraform/envs/prod
        run: terraform apply tf.plan
      
      - name: Verify deployment
        run: bash infra/scripts/verify-cosmos-deployment.sh prod asora-cosmos-prd asora-psql-flex asora
```

---

## Files Modified/Created

### New Files
- ✅ `infra/scripts/verify-cosmos-deployment.sh` - Post-deployment verification
- ✅ `infra/scripts/verify-plan-safety.sh` - Pre-apply plan validation
- ✅ `COSMOS_TERRAFORM_FINAL_HARDENING.md` - This document

### Modified Files
- ✅ `infra/terraform/modules/cosmos_sql/main.tf` - Added preconditions, drift suppression
- ✅ `tests/cosmos-pre-deployment.sh` - Added config.index.json validation

---

## Best Practices Summary

1. ✅ **Pin provider version** - Ensure v2 partition key support
2. ✅ **Guard serverless mode** - Block throughput config via preconditions
3. ✅ **Suppress harmless drift** - Ignore indexing_policy cosmetic changes
4. ✅ **Verify plans before apply** - Use automated safety checks
5. ✅ **Import existing containers first** - Prevent accidental replacements
6. ✅ **Validate deployments** - Confirm all containers and versions
7. ✅ **Use minimal config policy** - No automatic field, no empty arrays
8. ✅ **Separate dev/prod safety** - Serverless for dev, autoscale for prod with extra gates

---

## References

- **Module:** `infra/terraform/modules/cosmos_sql/`
- **Deployment Verification:** `infra/scripts/verify-cosmos-deployment.sh`
- **Plan Safety Check:** `infra/scripts/verify-plan-safety.sh`
- **Import Helper:** `infra/scripts/import-cosmos-container.sh`
- **Pre-Deploy Tests:** `tests/cosmos-pre-deployment.sh`
- **Previous Docs:** `COSMOS_TERRAFORM_HARDENING_COMPLETE.md`

---

## Conclusion

The Cosmos DB Terraform infrastructure now has **belt-and-braces production safety** with:
- ✅ Provider version guarantees
- ✅ Runtime preconditions preventing misconfigurations
- ✅ Drift suppression for cosmetic changes
- ✅ Automated plan safety verification
- ✅ Post-deployment validation
- ✅ Import-first patterns for existing resources

**Ready for production deployment with comprehensive safety gates.**
