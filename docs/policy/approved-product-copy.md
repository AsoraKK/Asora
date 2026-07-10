# Approved Product Copy (AI Policy + Tier Entitlements)

Status: Approved by CEO
Last Updated: 2026-02-06
Scope: Current dev-to-release track

## 1) AI authenticity and appeals copy

Approved wording:

- "AI-generated content is blocked at publish time."
- "AI-assisted text must be labeled and remain meaningfully human-led."
- "Strong AI-generation signals are blocked at publish time."
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
  - "Rewards capped through reputation level 3"
  - "Limited daily posting"
- Premium:
  - "Discovery + News feeds"
  - "2 custom feeds with personalized filters"
  - "1 reward per reputation level"
  - "Unrestricted normal posting"
- Black:
  - "Discovery + News feeds"
  - "3 custom feeds with personalized filters"
  - "All eligible rewards unlocked"
  - "Unrestricted normal posting"

Code reference:

- `lib/data/mock/mock_rewards.dart`
