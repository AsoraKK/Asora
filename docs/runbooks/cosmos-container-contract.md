# Cosmos Container Contract (Code vs Terraform)

Last updated: 2026-03-01
Purpose: single inventory for runtime container names, provisioning sources, partition keys, and required composite indexes.

## Status: ACTIVE GOVERNANCE

Container contract enforcement is governed by the repository policy file and CI validator:

- Policy file: `infra/cosmos-container-policy.json`
- Validator: `scripts/validate-cosmos-contract.js`
- CI job: `.github/workflows/ci.yml` (`cosmos_contract_guard`)

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

## Confirmed contract gaps (historical – resolved 2025-05-07)

> All gaps below were resolved by creating missing containers in the live Cosmos account
> and adding their resource blocks to `database/cosmos_containers.tf`.

1. ~~`posts` partition key differs between provisioning tracks~~ – live container uses `/authorId`.

2. ~~Reaction container contract differs~~ – live container `likes` with `/contentId`, code default alias resolves to `likes`.

3. ~~Flag container naming differs~~ – live container `content_flags` with `/targetId`, code default alias resolves to `content_flags`.

4. ~~Audit logs partition key differs~~ – live container uses `/id` (env stack) vs `/subjectId` (legacy TF). Live state is `/id`.

5. ~~Extended runtime containers not provisioned~~ – **All 13 missing containers now provisioned and added to TF.**:
   `auth_sessions`, `invites`, `posts_v2`, `userFeed`, `notifications`,
   `notification_preferences`, `device_tokens`, `notification_events`,
   `publicProfiles`, `messages`, `counters`, `profiles`, `ModerationWeights`,
   `config`, `custom_feeds`, `moderation_decisions`, `receipt_events`,
   `privacy_audit`, `reputation_audit`.

## Canonical source-of-truth decision

Canonical declaration is **policy-first**:

- `infra/cosmos-container-policy.json` is the canonical governance artifact.
- CI validates contract compliance against this file.
- Any change to container topology must update policy + IaC + validator mappings in the same change set.

This keeps runtime governance unambiguous even when multiple IaC tracks exist.

## Governance invariant

For any Cosmos container change (name, partition key, overlap mapping, required runtime list):

1. Update `infra/cosmos-container-policy.json`
2. Update relevant IaC definitions
3. Re-run validator:
   - `node scripts/validate-cosmos-contract.js --policy infra/cosmos-container-policy.json`
4. Keep this runbook aligned with the active policy model
