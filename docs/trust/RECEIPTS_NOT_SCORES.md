# Receipts, Not Scores

This document defines the trust/transparency layer for Lythaus (formerly Asora).

## Policy Constraints

- No numeric AI confidence, score, percentage, or raw vendor output in public APIs or UI.
- Trust output must be plain-language: what happened, why, and what a user can do.
- Receipt events are append-only.
- Receipt event IDs use UUIDv7.
- Proof signals are optional and non-punitive.
- Proof signals do not directly amplify reach.

## Receipt Event Model

Container: `receipt_events` (Cosmos)  
Partition key: `postId`

Supported `type` values:

- `RECEIPT_CREATED`
- `MEDIA_CHECKED`
- `MODERATION_DECIDED`
- `APPEAL_OPENED`
- `VOTE_CAST`
- `APPEAL_RESOLVED`
- `OVERRIDE_APPLIED`

Event shape (sanitized):

- `id` (UUIDv7)
- `postId`
- `actorType` (`system` | `user` | `moderator`)
- `actorId` (optional; moderator IDs are redacted in public payloads)
- `type`
- `createdAt` (server-generated ISO8601)
- `summary` (what happened)
- `reason` (why it happened)
- `policyLinks[]` (`title`, `url`)
- `actions[]` (`APPEAL` / `LEARN_MORE`, label, enabled)
- `metadata` (safe fields only)

## Signed Receipt Endpoint

Endpoint:

- `GET /api/posts/{postId}/receipt`

Response:

```json
{
  "postId": "018f...",
  "events": [],
  "issuedAt": "2026-02-09T00:00:00.000Z",
  "keyId": "active",
  "signature": "base64..."
}
```

Signing behavior:

- Payload is canonically serialized before signing.
- Signed object contains only:
  - `postId`
  - `events` (time ascending)
  - `issuedAt`
  - `keyId`
- Signature uses server-side secret key material from runtime configuration.

## Feed/Post Trust Summary Contract

Feed and post responses expose summary fields only (not full timeline):

- `trustStatus`
  - `verified_signals_attached`
  - `no_extra_signals`
  - `under_appeal`
  - `actioned`
- `timeline`
  - `created`
  - `mediaChecked`
  - `moderation`
  - `appeal`
- `hasAppeal`
- `proofSignalsProvided`
- `verifiedContextBadgeEligible`
- `featuredEligible`

Full receipt details are fetched via `/api/posts/{postId}/receipt`.

## Proof Signals

Accepted creator-provided fields:

- `captureMetadataHash`
- `editHistoryHash`
- `sourceAttestationUrl`

Storage rules:

- Full values may be stored server-side.
- UI renders only safe/truncated forms.
- Derived booleans:
  - `proofSignalsProvided`
  - `verifiedContextBadgeEligible`
  - `featuredEligible`

Featured eligibility is a discrete flag rule only; it is not a ranking multiplier.

## Juror Reliability and Trust Passport

Public output is tier/category based:

- Juror reliability: `Bronze` | `Silver` | `Gold`
- Transparency streak: `Consistent` | `Occasional` | `Rare`
- Appeals label: `Appeals resolved fairly`

Counts are available only in drill-in views/endpoints, not as default score displays.

Reliability alignment uses final adjudication state, including moderator overrides.

## Audit/Safety Notes

- Receipt events are append-only; state changes append new events.
- Override actions append `OVERRIDE_APPLIED`.
- APIs and UI avoid exposing moderation confidence values.
- Policy links and appeal actions are always explicit in receipt records.
