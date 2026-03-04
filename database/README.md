# Database Terraform Root

Terraform configuration for Asora database resources (Cosmos DB containers, indexing policies).

## Remote State and Workspaces

- Backend: AzureRM (key passed via `-backend-config`)
- Workspaces: `dev`, `stage`, `prod` (default blocked)
- Locking: Azure Blob leases

## Usage

```bash
cd database
terraform workspace select dev
terraform init -backend-config="key=database-dev.tfstate"
terraform plan
```

## Tags and Naming

- Uses `local.env_name` for environment-aware logic
- `local.common_tags` includes `application=Asora`, `env=<env>`, `managed_by=Terraform`
- Note: Cosmos containers don't support direct tags; apply tags at account/database level

## Safety

- `prevent_destroy` lifecycle on production data containers
- Coordinate with infrastructure/ root for cross-resource dependencies

---

Cosmos DB: Posts Container Indexing

Current
- Container: `posts`
- Partition key: `/authorId`
- Indexing: included `/*`, no composites (from archived tfstate)

Recommended Composite Indexes
- See `database/cosmos-posts-indexing-policy.json`
  - `/authorId` ASC, `/createdAt` DESC (partitioned sort by recency)
  - `/metadata/location` ASC, `/createdAt` DESC (local feed)
  - `/metadata/category` ASC, `/createdAt` DESC (category filtering)
  - `/score` DESC, `/createdAt` DESC (trending score if denormalized)

Apply via Azure CLI
az cosmosdb sql container update \
  -g asora-psql-flex \
  -a asora-cosmos-dev \
  -d asora \
  -n posts \
  --idx @database/cosmos-posts-indexing-policy.json

Verify
- Show current indexing policy:
  az cosmosdb sql container show -g asora-psql-flex -a asora-cosmos-dev -d asora -n posts --query "resource.indexingPolicy"
- Confirm compositeIndexes include the configured paths and orders.

Notes
- Changing indexing policy triggers backfill; prefer off-peak.
- For multi-author following feed, consider fan-out per partition and merge results to minimize RU.
