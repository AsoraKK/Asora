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
