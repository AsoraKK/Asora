Feed CosmosDB Audit and Optimizations

Summary

- Partition key (posts): `/authorId` (from infra tfstate).
- Typical `pageSize`: default 20, max 50 (see endpoints).
- Added per-query RU and duration logging across feed endpoints.
- Added indexing policy JSON with composite indexes for common filters and sorts.
- Optimized following feed for single-partition queries.

Key Changes

- Query logging
  - Files: `functions/feed/following.ts`, `functions/feed/local.ts`, `functions/feed/trending.ts`, `functions/feed/newCreators.ts`
  - Logs: `requestCharge`, `queryDurationMs`, `activityId`, `isCrossPartition`
  - Response headers: `X-Cosmos-RU`, `X-Query-Duration-ms` (per primary data query)

- Partition usage
  - Following: when the user follows exactly one author, query with `partitionKey` and `ORDER BY c.createdAt DESC` to avoid cross-partition scans.
  - For multi-author feeds, fan-out per author partition with `TOP K` and merge by `createdAt` on the server, bounded to 25 partitions per request. Continuation token (`nextCt`) carries per-author cursors for subsequent pages.
  - Expected RU reduction vs cross-partition `ORDER BY`: proportional to sampled authors and `TOP K` per partition; measured via `X-Cosmos-RU` and logs.

- Indexing policy (posts)
  - File: `database/cosmos-posts-indexing-policy.json`
  - Composite indexes added:
    - `/authorId` ASC, `/createdAt` DESC
    - `/metadata/location` ASC, `/createdAt` DESC
    - `/metadata/category` ASC, `/createdAt` DESC
    - `/score` DESC, `/createdAt` DESC (for trending if score is denormalized)

How to Apply Indexing Policy (CLI)

1. Identify Cosmos account and DB/container names (example uses `asora-cosmos-dev`, DB `asora`, container `posts`).
2. Apply policy:
   az cosmosdb sql container update \
    -g asora-psql-flex \
    -a asora-cosmos-dev \
    -d asora \
    -n posts \
    --idx @database/cosmos-posts-indexing-policy.json

App Insights p95 Query

- File: `observability/appinsights-feed-p95.kql`
- Tracks request p95, query p95, avg RU by endpoint (hourly bins).

Before/After Snapshot (to fill after deploy)

- Baseline (date/time UTC):
  - Following RU avg/p95, query p95 (ms), request p95 (ms)
  - Local RU avg/p95, query p95 (ms), request p95 (ms)
  - Trending RU avg/p95, query p95 (ms), request p95 (ms)
- After changes (date/time UTC):
  - Same metrics captured via KQL and response headers during test traffic

- Performance Snapshot (Before/After)
  - Following (fan-out):
    - Before: RU avg=?, p95 ms=?
    - After: RU avg=?, p95 ms=?
  - Local:
    - Before: RU avg=?, p95 ms=?
    - After: RU avg=?, p95 ms=?
  - Trending:
    - Before: RU avg=?, p95 ms=?
    - After: RU avg=?, p95 ms=?
  - NewCreators:
    - Before: RU avg=?, p95 ms=?
    - After: RU avg=?, p95 ms=?

Notes

- OFFSET/LIMIT pagination is RU-expensive in Cosmos; prefer continuation tokens. Future work: replace OFFSET/LIMIT with continuation tokens and optionally fan-out per-partition merge for multi-author feeds.
- Trending/NewCreators ORDER BY expressions benefit from denormalized `score`; composite index provided if `/score` is added to documents.
