# Cosmos Container Contract (Code vs Terraform)

Last updated: 2026-02-16
Purpose: single inventory for runtime container names, provisioning sources, partition keys, and required composite indexes.

## Runtime name contract (code)

| Runtime alias in code | Resolved container name | Override env var | Evidence |
| --- | --- | --- | --- |
| `posts` | `posts` | n/a | `functions/src/shared/clients/cosmos.ts` |
| `reactions` | `likes` (default) | `COSMOS_REACTIONS_CONTAINER` | `functions/src/shared/clients/cosmos.ts` |
| `customFeeds` | `custom_feeds` (default) | `COSMOS_CUSTOM_FEEDS_CONTAINER` | `functions/src/shared/clients/cosmos.ts` |
| `flags` | `content_flags` (default) | `COSMOS_FLAGS_CONTAINER` | `functions/src/shared/clients/cosmos.ts` |
| `appeals` | `appeals` | n/a | `functions/src/shared/clients/cosmos.ts` |
| `appealVotes` | `appeal_votes` | n/a | `functions/src/shared/clients/cosmos.ts` |
| `moderationDecisions` | `moderation_decisions` | n/a | `functions/src/shared/clients/cosmos.ts` |
| `receiptEvents` | `receipt_events` | n/a | `functions/src/shared/clients/cosmos.ts` |
| `users` | `users` | n/a | `functions/src/shared/clients/cosmos.ts` |
| `comments` | `comments` | n/a | `functions/src/shared/clients/cosmos.ts` |
| `invites` | `invites` | n/a | `functions/src/shared/clients/cosmos.ts` |
| `notifications` | `notifications` | n/a | `functions/src/shared/clients/cosmos.ts` |
| `profiles` | `profiles` | n/a | `functions/src/shared/clients/cosmos.ts` |
| `publicProfiles` | `publicProfiles` | n/a | `functions/src/shared/clients/cosmos.ts` |
| `messages` | `messages` | n/a | `functions/src/shared/clients/cosmos.ts` |
| `counters` | `counters` | n/a | `functions/src/shared/clients/cosmos.ts` |
| Other direct lookups | `auth_sessions`, `audit_logs`, `privacy_audit`, `reputation_audit`, `notification_events`, `device_tokens`, `notification_preferences`, `ModerationWeights` | n/a | `functions/src/**/*` |

## Terraform env stacks (`infra/terraform/envs/*/main.tf`)

These stacks provision the same container list for `dev`, `staging`, and `prod` (mode differs: serverless vs autoscale).

| Container | Partition key | Index file | Required composite indexes (from `database/cosmos/indexes/*.json`) |
| --- | --- | --- | --- |
| `posts` | `/authorId` | `posts.index.json` | `(/createdAt desc, /id desc)`, `(/authorId asc, /createdAt desc)`, `(/createdAt desc, /score desc)`, `(/visibility asc, /createdAt desc)` |
| `comments` | `/postId` | `comments.index.json` | `(/postId asc, /createdAt asc)` |
| `likes` | `/contentId` | `likes.index.json` | none |
| `content_flags` | `/targetId` | `flags.index.json` | `(/targetId asc, /createdAt desc)` |
| `appeals` | `/id` | `appeals.index.json` | `(/createdAt desc, /status asc)` |
| `receipt_events` | `/postId` | `receipt_events.index.json` | `(/postId asc, /createdAt asc)` |
| `appeal_votes` | `/appealId` | `votes.index.json` | `(/appealId asc, /createdAt asc)` |
| `users` | `/id` | `users.index.json` | none |
| `custom_feeds` | `/partitionKey` | `custom_feeds.index.json` | `(/ownerId asc, /updatedAt desc)` |
| `config` | `/partitionKey` | `config.index.json` | none |
| `moderation_decisions` | `/itemId` | `moderation_decisions.index.json` | `(/itemId asc, /decidedAt desc)` |
| `privacy_requests` | `/id` | `privacy_requests.index.json` | none |
| `legal_holds` | `/scopeId` | `legal_holds.index.json` | none |
| `audit_logs` | `/id` | `audit_logs.index.json` | none |
| `privacy_audit` | `/id` | `privacy_audit.index.json` | none |
| `reputation_audit` | `/_partitionKey` | `reputation_audit.index.json` | `(/userId asc, /createdAt desc)` |

## Legacy/extended provisioning (`database/cosmos_containers.tf`)

This file provisions additional containers used by runtime code and workers.

| Container | Partition key | Composite index highlights |
| --- | --- | --- |
| `posts` | `/id` | `(/authorId, /createdAt)`, `(/status, /createdAt)` |
| `posts_v2` (`database/cosmos_privacy_indexes.tf`) | `/postId` | `(/authorId, /createdAt)` |
| `auth_sessions` | `/partitionKey` | `(/userId, /createdAt)` |
| `invites` | `/_partitionKey` | `(/createdBy, /createdAt)`, `(/email)` |
| `userFeed` | `/recipientId` | `(/recipientId, /createdAt)`, `(/recipientId, /relevanceScore, /createdAt)` |
| `comments` | `/_partitionKey` | `(/_partitionKey, /createdAt)`, `(/authorId, /createdAt)` |
| `reactions` | `/postId` | `(/postId, /type, /createdAt)`, `(/userId, /createdAt)` |
| `flags` | `/contentId` | `(/status, /createdAt)`, `(/reporterId, /createdAt)` |
| `appeals` | `/contentId` | `(/status, /createdAt)`, `(/submitterId, /createdAt)` |
| `appeal_votes` | `/appealId` | `(/appealId, /voterId)` |
| `notifications` | `/recipientId` | `(/recipientId, /read, /createdAt)` |
| `notification_preferences` | `/userId` | none |
| `device_tokens` | `/userId` | `(/userId, /platform)` |
| `notification_events` | `/userId` | `(/userId, /createdAt)` |
| `publicProfiles` | `/userId` | `(/username)` |
| `messages` | `/conversationId` | `(/conversationId, /createdAt)`, `(/senderId, /createdAt)` |
| `counters` | `/userId` | `(/userId, /counterType)` |
| `reputation_audit` | `/_partitionKey` | `(/userId, /appliedAt)`, `(/reason, /appliedAt)` |
| `privacy_requests` | `/id` | `(/status, /requestedAt)`, `(/type, /requestedAt)`, `(/userId, /requestedAt)` |
| `legal_holds` | `/scopeId` | `(/scope, /active)`, `(/active, /startedAt)` |
| `audit_logs` | `/subjectId` | `(/subjectId, /timestamp)`, `(/actorId, /timestamp)`, `(/eventType, /timestamp)` |

## Confirmed contract gaps

1. `posts` partition key differs between provisioning tracks:
`/authorId` in env stacks vs `/id` in legacy container IaC.
Code contains both access patterns (`item(postId, postId)` and partitioned queries by author).

2. Reaction container contract differs:
env stacks provision `likes` with `/contentId`, while legacy provisions `reactions` with `/postId`.
Runtime default alias points to `likes` unless `COSMOS_REACTIONS_CONTAINER` is set.

3. Flag container naming differs:
env/runtime default is `content_flags`; legacy IaC uses `flags`.

4. Audit logs partition key differs:
env stacks use `/id`; legacy IaC uses `/subjectId`.

5. Extended runtime containers are not provisioned by env stack module:
`auth_sessions`, `invites`, `posts_v2`, `userFeed`, `notifications`,
`notification_preferences`, `device_tokens`, `notification_events`,
`publicProfiles`, `messages`, `counters`, `profiles`, `ModerationWeights`.

## Recommended source-of-truth decision

For release safety, pick one provisioning path as canonical:

- Option A: env stacks in `infra/terraform/envs/*` become canonical, then add all missing runtime containers and align partition keys with code access patterns.
- Option B: legacy/extended `database/cosmos_containers.tf` becomes canonical and env stack module only handles account-level concerns.

Do not run mixed applies without a documented mapping because container names and partition keys are currently divergent.
