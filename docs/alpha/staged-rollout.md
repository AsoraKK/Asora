# Controlled Alpha Staged Rollout

Status: Canonical
Owner: Kyle

| Stage | Cohort | Expected duration | Review focus |
| --- | ---: | --- | --- |
| `technical_alpha` | 25–50 trusted users | 1–2 weeks | Auth, feeds, posting, labels, moderation, DSR, telemetry, support |
| `controlled_alpha` | Up to 100 users | About 2 weeks | Retention, moderation load, feed quality, appeals, stability |
| `expanded_alpha` | Up to 250 users | 2–4 weeks | Broader validation after prior exit criteria pass |
| `paused` | No expansion or new registration | Until Kyle review | Diagnostics and reversible remediation |
| `closed` | No new registration | Terminal for this Alpha window | Evidence retention and next-phase decision |

Every active stage requires start, review, and end timestamps. Registration and invite redemption fail when the operating window is closed or the transactional cohort cap is reached. Outstanding invite count, redeemed count, expiry, revocation, and account membership are enforced by the backend.

Expansion is never automatic. Metrics produce a review report for Kyle; they do not mutate stage configuration. Stage changes use the Cloudflare-owner-protected admin configuration endpoint and are recorded in PostgreSQL and the admin audit stream.

Required critical controls are registration, invite redemption, post creation, comment creation, reactions, media upload, authorship classification enforcement, custom-feed creation, News Board, reputation awards, community voting, non-essential notifications, and emergency read-only mode.

Initial stage recommendation remains `technical_alpha` only after all release gates pass. The current candidate is NO-GO; see the canonical packet.
