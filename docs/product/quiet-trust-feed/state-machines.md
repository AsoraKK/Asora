# Quiet Trust Feed State Machines

## A) Trust Strip Status Machine

### Canonical Status Precedence

1. `under_appeal` if any appeal is open.
2. Else `actioned` if latest moderation action is not `none`.
3. Else `verified_signals_attached` if any proof signal is present.
4. Else `no_extra_signals`.

### Timeline Chips

- `Created`: always present.
- `Media checked`: always present.
- `Moderation`: always present.
- `Appeal`: shown only if any appeal lifecycle event exists.

## B) Receipt Timeline Machine

### Typical Event Types

- `RECEIPT_CREATED`
- `MEDIA_CHECKED`
- `MODERATION_DECIDED`
- `APPEAL_OPENED`
- `VOTE_CAST`
- `APPEAL_RESOLVED`
- `OVERRIDE_APPLIED`

### Rendering Rules

- Render strictly in chronological order by `createdAt`.
- Repeated event types are valid and must be rendered.
- `OVERRIDE_APPLIED` may appear before or after `APPEAL_RESOLVED` depending on real flow.

### Drawer Action Guards

- `APPEAL`: disabled if appeal already open/submitted.
- `LEARN_MORE`: available whenever policy link exists.

## C) Appeal Lifecycle Machine

### States

- `submitted`
- `in_review`
- `community_input`
- `approved`
- `rejected`
- `overridden`

### Transition Notes

- `submitted -> in_review` when validated and queued.
- `in_review -> community_input` when voting window opens.
- `community_input -> approved|rejected` on quorum or expiry resolve.
- Any non-terminal state can transition to `overridden` via moderator/admin override.
- Final state is override-aware and must sync across trust strip, receipt timeline, and alerts.

## D) Backend to Flutter Contract Mapping

This table is the source of truth for enum translation and fallback behavior.

### Trust Status

| Backend | Flutter UI value |
| --- | --- |
| `under_appeal` | `underAppeal` |
| `actioned` | `actioned` |
| `verified_signals_attached` | `verifiedSignalsAttached` |
| `no_extra_signals` | `noExtraSignals` |

Unknown fallback: map to `noExtraSignals`.

### Moderation Action

| Backend | Flutter UI value |
| --- | --- |
| `none` | `none` |
| `limited` | `limited` |
| `blocked` | `blocked` |
| `removed` | `removed` |

Unknown fallback: map to `none`.

### Appeal State

| Backend | Flutter UI value |
| --- | --- |
| `submitted` | `submitted` |
| `in_review` | `inReview` |
| `community_input` | `communityInput` |
| `approved` | `approved` |
| `rejected` | `rejected` |
| `overridden` | `overridden` |

Unknown fallback: map to `inReview`.

### Timeline Event Type

| Backend | Flutter UI value |
| --- | --- |
| `RECEIPT_CREATED` | `receiptCreated` |
| `MEDIA_CHECKED` | `mediaChecked` |
| `MODERATION_DECIDED` | `moderationDecided` |
| `APPEAL_OPENED` | `appealOpened` |
| `VOTE_CAST` | `voteCast` |
| `APPEAL_RESOLVED` | `appealResolved` |
| `OVERRIDE_APPLIED` | `overrideApplied` |

Unknown fallback: render as generic `event` with safe copy.
