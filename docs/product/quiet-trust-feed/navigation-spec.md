# Quiet Trust Feed Navigation Spec (Lythaus)

## Canonical Information Architecture

Bottom navigation has exactly four tabs:

1. `Discover`
2. `Create`
3. `Alerts`
4. `Profile`

No additional bottom tab is allowed for feeds, rewards, or moderation.

## Route Map

- `/discover`
  - Feed rail owner (first item `Discover`, then custom feeds)
  - Feed content list
  - Post detail
  - Receipt drawer
- `/create`
  - Text and image create flow
  - Optional proof tiles (Challenge Mode)
- `/alerts`
  - Social, Trust, Moderation grouped notifications
- `/profile`
  - Profile overview
  - Trust Passport
  - Settings
  - Rewards entry point

Auxiliary routes:

- `/auth/sheet`
- `/auth/invite-redeem`
- `/receipt/:postId`
- `/appeals/:appealId`
- `/moderation/*` (role/feature-gated, not bottom-tab owned)
- `/rewards` (entry from Profile only)

## Tab Ownership and Deep Links

- Deep links resolve to a tab root first, then to target screen state.
- `Discover` owns all feed-type routes.
- Any deep link to a custom feed opens `Discover`, then selects the matching rail chip.
- Any deep link to rewards opens `Profile` then pushes rewards screen.
- Unknown deep links fallback to `Discover`.

## Discover Rail Behavior

- Rail order:
  - System feed chip `Discover` first.
  - User custom feed chips after system chip, ordered by user preference.
- Feed mode switching only happens via the discover rail.
- Feed creation entry lives in Discover context (rail overflow/control), not bottom nav.

## Guest Gating Rules

Guest allowed:

- Read feed and post detail
- Open receipt drawer
- View profiles and trust passport public view
- Share post externally

Guest blocked:

- Follow
- Like
- Bookmark
- Comment/reply
- Create/edit/delete post
- Vote on appeals
- Submit appeals

Blocked actions must invoke auth sheet with remembered intent.

## Deprecated/Removed Patterns

These patterns are deprecated and must not ship:

- 5-tab shell with dedicated rewards or feeds tab
- Feed mode switching outside Discover rail
- Moderation scaffolds exposed in primary navigation for all users
- Any route that bypasses auth gating for write actions

## Feed Restore Contract

- Persist per feed: `lastVisibleItemId` + `lastOffset`.
- Restore by item if item exists in current list.
- If missing, restore to top and show `New posts` pill.
- Restore is best-effort and never blocks initial paint.
