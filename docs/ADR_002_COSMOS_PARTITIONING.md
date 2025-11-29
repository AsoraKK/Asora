# ADR 002 – Cosmos DB Container Partitioning

## Status
Accepted – 2024-07-?? (backfilled from production observations)

## Context
- Mobile experience reads are served from Cosmos DB projections.
- Existing Cosmos accounts live in resource group `asora-psql-flex`.
- The production database name is `asora`; dev/staging share the same logical schema.
- Prior deployments provisioned containers manually, leading to drift in partition keys and indexing policies.

## Decision
Standardise Cosmos SQL containers on the following partition keys and indexing modes. All containers run in **session** consistency and use indexing mode `consistent`.

| Container              | Partition Key    | Notes                                                                                 |
| ---------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| `posts`                | `/authorId`      | Author timeline queries; composite indexes cover author/time and score ordering.      |
| `comments`             | `/postId`        | Thread paging per post ordered by `createdAt`.                                       |
| `likes`                | `/contentId`     | Point lookups and per-content aggregations.                                          |
| `flags` (`content_flags` in code) | `/contentId`    | Moderation triage sorted by recency per content. Changed from `/targetId` to align with TS types. |
| `appeals`              | `/contentId`     | Appeals grouped by content; moderation workflows page by `createdAt`. Changed from `/id` for query efficiency. |
| `votes` (`appeal_votes` in code) | `/appealId`     | Votes roll up per appeal; chronological paging required.                              |
| `users`                | `/id`            | User profile projections; point reads only.                                          |
| `config`               | `/partitionKey`  | Single logical partition (`"moderation"`); all other paths excluded from indexing.   |
| `moderation_decisions` | `/contentId`     | Stores decisions per moderated item; sorted by `decidedAt`. Changed from `/itemId` to align with TS types. |

### Indexing templates
- Included paths default to `/*` except for `config`, which will exclude unused paths to reduce RU.
- Exclude `_etag` for all containers; exclude `_attachments` when present.
- Composite indexes:
  - `posts`: (`/authorId` ASC, `/createdAt` DESC), (`/createdAt` DESC, `/score` DESC), (`/visibility` ASC, `/createdAt` DESC).
  - `comments`: (`/postId` ASC, `/createdAt` ASC).
  - `flags`: (`/contentId` ASC, `/createdAt` DESC).
  - `appeals`: (`/contentId` ASC, `/createdAt` DESC, `/status` ASC).
  - `votes`: (`/appealId` ASC, `/createdAt` ASC).
  - `moderation_decisions`: (`/contentId` ASC, `/decidedAt` DESC).
  - `likes`, `users`, `config`: no composites required.

### Throughput mode
- **Dev**: Serverless (no container-level throughput configured).
- **Staging/Prod**: Autoscale with the following maxima (RU/s):
  - `posts`: 10 000
  - `comments`, `flags`, `moderation_decisions`: 4 000
  - `likes`, `appeals`, `votes`, `users`: 2 000
  - `config`: 1 000

## Consequences
- Terraform will own container definitions. Manual Azure Portal edits must be avoided to prevent drift.
- Partition key version is pinned to 2 for improved hashing.
- Any new containers must extend this ADR before implementation.
