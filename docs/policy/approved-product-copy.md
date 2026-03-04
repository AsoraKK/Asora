# Approved Product Copy (AI Policy + Tier Entitlements)

Status: Approved by CEO  
Last Updated: 2026-02-06  
Scope: Current dev-to-release track

## 1) AI authenticity and appeals copy

Approved wording:

- "AI-generated content is blocked at publish time."
- "AI-signaled content must be labeled and cannot be published."
- "If content is blocked, you'll see a neutral notice."
- "You can appeal this decision."
- "Appeals are reviewed by the community and moderators."

Code references:

- `lib/features/feed/presentation/create_post_screen.dart`
- `lib/core/error/error_codes.dart`

## 2) Tier entitlement copy

Approved wording:

- Free:
  - "Discovery + News feeds"
  - "1 custom feed with personalized filters"
  - "1 reputation reward available"
- Premium:
  - "Discovery + News feeds"
  - "2 custom feeds with personalized filters"
  - "5 reputation rewards available"
- Black:
  - "Discovery + News feeds"
  - "5 custom feeds with personalized filters"
  - "All reputation rewards"

Code reference:

- `lib/data/mock/mock_rewards.dart`
