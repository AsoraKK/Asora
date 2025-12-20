# Phase1 UI Unlock Progress

## Implemented
- Added the missing 4XX responses on the admin DSR/legal-hold operations so the OpenAPI lint now succeeds (`npx @redocly/cli lint api/openapi/openapi.yaml`).
- Added dedicated posts route tests covering create validation, missing-post handling, delete ownership enforcement, and cursor pagination behavior.
- Implemented the custom feeds service, Cosmos wiring, tier-enforced limits, cursor pagination, and route tests so CRUD + filtered item reads now return real data.
- Wired the Flutter feed stack to the real `/api/feed/discover`, `/api/feed/news`, and `/api/feed/user/{id}` cursor endpoints plus updated PostRepository to hit `/api/posts`/Cosmos-backed responses.
- Hooked the profile screen to the live `/api/users/{id}` API via a new `PublicUser` provider so the UI shows accurate tier, badges, and reputation data instead of placeholders.
- Verified the moderation queue, case detail/decision, and appeals endpoints through the functions Jest suite (warnings noted when FCM env vars are absent).

## Remaining
- Validate profile loading and badge/display refresh in a live tenant once tokens are shared.
- Supply the FCM configuration (project ID, client email, private key) whenever running notifications-related tests to avoid fatal logs.
