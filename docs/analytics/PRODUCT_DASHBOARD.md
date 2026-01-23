# Product Analytics Dashboard (Lythaus (formerly Asora))

## Onboarding Funnel

```
onboarding_start
   ↓
invite_screen_view
   ↓
invite_redeem_success
   ↓
profile_complete
   ↓
first_follow
   ↓
first_post
```

## Drop-off Metrics

- Drop-off at step N = 1 - (users at step N+1 / users at step N)
- Report by platform and app_version
- Track 1-day, 7-day, 14-day windows from onboarding_start

## Conversion Definitions

- Onboarding start → Invite view
- Invite view → Invite redeem success
- Invite redeem success → Profile complete
- Profile complete → First follow
- First follow → First post

Each conversion is measured as distinct users who reached the next step
within the time window, divided by users who reached the previous step.

## Example Queries

### SQL (Postgres-style)

```sql
-- Funnel counts by step (distinct users)
WITH events AS (
  SELECT
    user_id,
    event_name,
    MIN(event_time) AS first_seen_at
  FROM analytics_events
  WHERE event_name IN (
    'onboarding_start',
    'invite_screen_view',
    'invite_redeem_success',
    'profile_complete',
    'first_follow',
    'first_post'
  )
  GROUP BY user_id, event_name
)
SELECT event_name, COUNT(*) AS users
FROM events
GROUP BY event_name
ORDER BY users DESC;
```

```sql
-- Conversion: invite_redeem_success -> first_post within 7 days
WITH steps AS (
  SELECT
    user_id,
    MIN(CASE WHEN event_name = 'invite_redeem_success' THEN event_time END) AS redeem_at,
    MIN(CASE WHEN event_name = 'first_post' THEN event_time END) AS first_post_at
  FROM analytics_events
  WHERE event_name IN ('invite_redeem_success', 'first_post')
  GROUP BY user_id
)
SELECT
  COUNT(*) FILTER (WHERE redeem_at IS NOT NULL) AS redeem_users,
  COUNT(*) FILTER (
    WHERE redeem_at IS NOT NULL
      AND first_post_at IS NOT NULL
      AND first_post_at <= redeem_at + INTERVAL '7 days'
  ) AS converted_users,
  ROUND(
    COUNT(*) FILTER (
      WHERE redeem_at IS NOT NULL
        AND first_post_at IS NOT NULL
        AND first_post_at <= redeem_at + INTERVAL '7 days'
    )::numeric
    / NULLIF(COUNT(*) FILTER (WHERE redeem_at IS NOT NULL), 0),
    4
  ) AS conversion_rate
FROM steps;
```

### KQL (App Insights)

```kql
// Funnel step counts
customEvents
| where name in (
  "onboarding_start",
  "invite_screen_view",
  "invite_redeem_success",
  "profile_complete",
  "first_follow",
  "first_post"
)
| summarize users=dcount(tostring(customDimensions.userId)) by name
```

```kql
// Drop-off from invite redeem to first post within 7 days
let redeem = customEvents
  | where name == "invite_redeem_success"
  | summarize redeem_at=min(timestamp) by userId=tostring(customDimensions.userId);
let firstPost = customEvents
  | where name == "first_post"
  | summarize first_post_at=min(timestamp) by userId=tostring(customDimensions.userId);
redeem
| join kind=leftouter firstPost on userId
| summarize
    redeem_users=dcount(userId),
    converted_users=dcountif(userId, isnotnull(first_post_at) and first_post_at <= redeem_at + 7d)
```

## Ownership & Cadence

- Owner: Product Analytics (Growth)
- Review cadence: Weekly funnel review, monthly cohort deep dive

## Privacy Notes

- Events contain no user-generated text.
- User ID is pseudonymous (UUIDv7); no direct PII.
- Properties are categorical or numeric only.
