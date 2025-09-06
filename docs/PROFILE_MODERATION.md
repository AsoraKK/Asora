Profile Moderation

Config (env)
- MODERATION_PROVIDER (hive|acs) — default hive
- MODERATION_TIMEOUT_MS — default 300
- MODERATION_RETRIES — max 2 (default 2)
- MODERATION_FALLBACK — default true
- HIVE_REJECT_THRESHOLD (default 0.90), HIVE_REVIEW_THRESHOLD (0.70)
- ACS_REJECT_THRESHOLD (default 0.90), ACS_REVIEW_THRESHOLD (0.70)
- ACS_CATEGORIES — CSV, default Hate,Violence,Sexual
- ACS_ENDPOINT, ACS_KEY — required if provider is acs or fallback engages

Backend
- Endpoint: POST/PUT /api/users/profile
- Behavior: Calls text moderation for displayName + bio.
  - decision=reject → 400 moderation_rejected
  - decision=review → persisted with profileStatus=under_review; audit recorded
  - decision=allow  → persisted with profileStatus=approved
- Audit: profile_audit container records decision and content preview.

Client Pre-Check
- Add a lightweight regex profanity check to block obvious cases before network.

Metrics
- Structured logs with provider, decision, score, durationMs
- Response header: X-Moderation-Decision

