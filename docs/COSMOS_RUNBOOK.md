# Cosmos DB Operations Runbook

## Managed scope
- **Resource group:** `asora-psql-flex`
- **Database name:** `asora`
- **Accounts:** `asora-cosmos-stg`, `asora-cosmos-prod`, plus existing dev serverless account.
- **Terraform module:** `infra/terraform/modules/cosmos_sql`
- **Index policies:** `database/cosmos/indexes/*.index.json`

## Container inventory

| Container | Partition key | Max RU (autoscale) | Composite indexes |
| --------- | ------------- | ------------------ | ----------------- |
| posts | `/authorId` | 10 000 | (`authorId` ASC, `createdAt` DESC), (`createdAt` DESC, `score` DESC), (`visibility` ASC, `createdAt` DESC) |
| comments | `/postId` | 4 000 | (`postId` ASC, `createdAt` ASC) |
| likes | `/contentId` | 2 000 | — |
| content_flags | `/targetId` | 4 000 | (`targetId` ASC, `createdAt` DESC) |
| appeals | `/id` | 2 000 | (`createdAt` DESC, `status` ASC) |
| appeal_votes | `/appealId` | 2 000 | (`appealId` ASC, `createdAt` ASC) |
| users | `/id` | 2 000 | — |
| config | `/partitionKey` | 1 000 | — |
| moderation_decisions | `/itemId` | 4 000 | (`itemId` ASC, `decidedAt` DESC) |

## Terraform workflow

```bash
# Plan
cd infra/terraform/envs/staging
terraform init
terraform workspace select staging || terraform workspace new staging
terraform plan -var-file=staging.tfvars -out=tf.plan
terraform show -no-color tf.plan > tf.plan.txt
../../../../scripts/plan-guard.sh tf.plan.txt

# Apply (after review)
terraform apply tf.plan
```

Repeat in `infra/terraform/envs/prod` with the corresponding workspace and `prod.tfvars`.

## Verification commands

```bash
RG=asora-psql-flex
ACCOUNT=asora-cosmos-stg   # or asora-cosmos-prod
DB=asora

# Partition key + indexing policy snapshot
az cosmosdb sql container show \
  -g "$RG" -a "$ACCOUNT" -d "$DB" -n posts \
  --query "{pk:partitionKey,indexing:indexingPolicy}" -o json

# Throughput (autoscale)
az cosmosdb sql container throughput show \
  -g "$RG" -a "$ACCOUNT" -d "$DB" -n posts \
  --query "{type:resource.throughputType,max:resource.autoscaleSettings.maxThroughput}"

# Diff actual policy vs source file
az cosmosdb sql container show \
  -g "$RG" -a "$ACCOUNT" -d "$DB" -n posts \
  --query "resource.indexingPolicy" -o json > /tmp/posts.actual.json
diff -u /tmp/posts.actual.json database/cosmos/indexes/posts.index.json || true
```

## Making changes
1. Update the relevant JSON in `database/cosmos/indexes/`.
2. Run `terraform fmt -recursive`.
3. Execute `terraform plan` in the desired environment folder.
4. Review with `infra/scripts/plan-guard.sh`.
5. Apply the plan and re-run verification commands.

## Troubleshooting tips
- **Throttling:** Increase autoscale `max_throughput` in the env `main.tf`, re-run Terraform, monitor `NormalizedRUConsumption`.
- **New container:** Extend `docs/ADR_002_COSMOS_PARTITIONING.md`, add a JSON policy, then append to each environment module call.
- **Manual drift:** Export live indexing policy with `az cosmosdb sql container show`, diff against JSON, and reconcile via Terraform.
