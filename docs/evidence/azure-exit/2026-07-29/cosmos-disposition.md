# Azure source disposition — 2026-07-29

This evidence is sanitised. Raw records, contact addresses, source identifiers,
DSR payloads, and the source-to-target map remain encrypted outside Git.

## Extraction provenance

- GitHub workflow run: `30441709897`
- Workflow source SHA: `3a0fed9b9bd044225f9281ffbc97db4c27d8ccdc`
- Cosmos database: `asora`
- Containers read: 32
- Cosmos records: 224
- Source manifest SHA-256:
  `b6f140affd4b465ee3321644a630c6346bdfe7e22bbc31727559580e257d464c`
- Canonical import SHA-256:
  `d38f252d4055d0373bec26aeb417e2bb7f1546c955b2182e00a0f664d4d4b079`
- Canonicalisation: stable object keys, stable source-identifier ordering,
  UTF-8, and distinct missing/null/empty values
- Incremental migration cost estimate: `US$0`

The encrypted archive checksum was verified after download, the archive was
decrypted under protected local custody, all 32 source file hashes reconciled,
and a controlled restore parsed the complete export.

## Non-empty containers

| Container | Count | Partition key | Last write UTC | Source SHA-256 | Disposition |
|---|---:|---|---|---|---|
| `audit_logs` | 70 | `/id` | 2026-07-11 23:21:33 | `03075f381870b90fd63969b9ffee9e450be95eed9d7e77e561c6d8b7266dbfee` | PRESERVE AS EVIDENCE |
| `counters` | 1 | `/userId` | 2026-07-13 22:04:45 | `78bbb1f59394068959246be85d5a8805c53f8544a52090c23bfaecac27c0b97e` | DISCARD TEST/DERIVED |
| `custom_feeds` | 1 | `/partitionKey` | 2026-07-11 19:22:42 | `3e24cb0d3fc9596eb22d74fa9e83475c238d65ccab948d925c194d90cd2a0e8e` | DISCARD TEST/DERIVED |
| `legal_holds` | 6 | `/scopeId` | 2026-06-21 10:30:38 | `f963f0b0b1d720ea018d90be1189fd180b9b19201c5b38f9e2c22520565e105c` | 1 MIGRATE; 5 DISCARD TEST/DERIVED |
| `moderation_decisions` | 13 | `/itemId` | 2026-07-13 22:13:43 | `5fa4437d73b589fc35023a40db1c9c969a4ff62fed6d386a814ba6e12c6b0e67` | DISCARD TEST/DERIVED |
| `posts` | 63 | `/authorId` | 2026-07-13 22:13:43 | `042eaad1429cc4494926a8f192e6349a9d04a27d2ebbbb6be2d538f5b339acdb` | DISCARD TEST/DERIVED |
| `privacy_audit` | 2 | `/id` | 2026-07-13 22:04:45 | `ce18a49f7bb6ab48022a4b027fd9852c1187f59457ce4d1121aa1444647b0fe5` | PRESERVE AS EVIDENCE |
| `privacy_requests` | 36 | `/id` | 2026-07-11 23:21:33 | `e0c0d178e7f57b0b78ec83705d29268e0ab985f9a56f237a379989dff53ddf4b` | 8 MIGRATE; 1 PRESERVE AS EVIDENCE; 27 DISCARD TEST/DERIVED |
| `profiles` | 1 | `/userId` | 2025-12-20 13:19:50 | `553aa590d46d7ee3fc4b417c5f2e740031da0046c3dd33f00d945604cc7fa0ca` | MIGRATE |
| `receipt_events` | 26 | `/postId` | 2026-07-13 22:13:43 | `4d2099faa1be757d1c7ceb28134048d3e838ea022ed5ffe0353ebbefa5eafe20` | DISCARD TEST/DERIVED |
| `users` | 5 | `/id` | 2026-07-19 18:30:24 | `598945742a537ecf2e15d181420ffaeed5f45eb7809b355b5a0541272d82f1bd` | 3 MIGRATE; 2 DISCARD TEST/DERIVED |

All 63 posts contain synthetic content markers. Fifty also have explicit test
session fields; the remaining 13 form the private moderation test set. The 13
moderation decisions and 26 receipt events reconcile to those synthetic posts.

## Empty containers

The following 21 containers have zero records and the canonical empty-array
SHA-256 `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`:

`appeal_votes`, `appeals`, `auth_sessions`, `comments`, `config`,
`content_flags`, `device_tokens`, `invites`, `likes`, `messages`,
`ModerationWeights`, `notification_events`, `notification_history`,
`notification_preferences`, `notifications`, `posts_v2`, `publicProfiles`,
`rate_limits`, `reputation_audit`, `user_device_tokens`, and `userFeed`.

Their names, partition keys, zero counts, and last-write evidence remain in the
protected source manifest. No placeholder application rows are created.

## Canonical selection

| Destination | Rows |
|---|---:|
| `identity.users` | 7 |
| `identity.contact_emails` | 3 |
| `social.profiles` | 1 |
| `privacy.requests` | 8 |
| `privacy.request_events` | 20 |
| `privacy.legal_holds` | 1 |
| `privacy.deletion_tombstones` | 2 |
| `privacy.subject_data_locations` | 22 |

Five identities are `relink_required`; two are deletion tombstones. Migration
contact addresses are encrypted and HMAC-indexed, remain unverified, and do not
create provider links. Google sign-in must fail with
`account_relink_required` rather than auto-link or create a duplicate.

## Blob selection

- `dsr-exports`: 11 ZIP packages, 17,641 source bytes, all checksums verified.
- Selected: 5 unresolved non-drill packages, 5,140 source bytes.
- Destination: existing `lythaus-private-exports-dev` under
  `protected-migration/dsr/`, encrypted before upload.
- Audit manifest destination: existing `lythaus-audit-archive-dev` under the
  protected `audit/` prefix.
- `user-media`: zero objects; no placeholder is created.

## PostgreSQL

`DISCARD — PRE-PRODUCTION LEGACY IDENTITY STORE`

The owner formally accepted abandonment of the inaccessible Azure PostgreSQL
identity store. The platform was pre-production, no provider subject may be
invented, and migrated identities without a defensible provider mapping remain
`relink_required`. Clean Google authentication must not re-establish ownership
from an unverified email address alone. The preserved Cosmos, privacy,
legal-hold, moderation, and encrypted DSR evidence remains authoritative for
the Azure exit decision.
