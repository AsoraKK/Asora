# Lythaus Repository Intelligence Report

Read-only audit completed on `main`. No app files were modified during the audit, and no commits, refactors, or PRs were created.

## Decision Update - 28 June 2026

The following product decisions supersede the open questions in the original audit:

- AI-generated text, images, video, audio, and deceptive synthetic/deepfake media are blocked at submit.
- AI-assisted text is allowed only when disclosed and meaningfully human-led; 250+ characters increases scrutiny but is not an automatic block.
- Normal public labels are `Human-authored`, `AI-assisted`, and `Under review`.
- `Blocked after review` is visible only in appeal/moderation history, not as a normal feed label.
- News Board is available to authenticated Free, Premium, and Black users.
- Free includes Discovery, 1 custom feed, News Board, restricted posting, and rewards capped through reputation Level 3.
- Premium includes Discovery, 2 custom feeds, News Board, unrestricted normal posting, and 1 reward per reputation level.
- Black includes Discovery, 3+ custom feeds, News Board, unrestricted normal posting, and all eligible rewards.
- React control panel is the canonical admin surface; Flutter admin shell should be hidden or removed unless mobile moderation is a real requirement.
- Editorial Contributor is the umbrella status for journalists, analysts, researchers, independent writers, local/community reporters, subject-matter experts, academics, and commentators.

## 1. Executive Summary

The repository is a broad Flutter + Azure Functions social platform currently transitioning from Asora to Lythaus. It already contains meaningful backend capability for feeds, posts, moderation, appeals, reputation, privacy DSR, custom feeds, notifications, admin tooling, route guard checks, OpenAPI, CI, and Cloudflare anonymous feed caching.

Maturity: closer to an internal beta / late MVP foundation than a prototype. It is not a launch candidate yet because several strategic surfaces are partial, duplicated, or not connected cleanly through UX.

Biggest architecture risks:
- Source-of-truth drift between active routes, generated API, OpenAPI, docs, legacy endpoints, and schema files.
- Feed p95 below 200 ms is unlikely with current Cosmos cross-partition reads, post enrichment, reputation fetching, and in-memory ranking.
- DSR deletion/anonymisation appears real but may not cover every active data container.
- Auth stack mixes newer OAuth2/PKCE/JWT pieces with legacy endpoints and Asora redirect/package identifiers.
- AI/moderation policy is now decided: AI-generated content is blocked at submit; AI-assisted text is allowed only when disclosed and meaningfully human-led.
- Admin/moderator UX exists in both Flutter and React, increasing product and permission-surface complexity.
- Some generated/client contract paths drift from active function paths.

Biggest UX/product gaps:
- No fully coherent MVP IA for Discovery, custom feeds, News Board, reputation, appeals, privacy, and settings.
- Onboarding screens exist but are not clearly routed into first-run flows.
- Profile editing and profile visibility controls are partial.
- News Board/Editorial Contributor flows are mostly backend/planned, not credible user-facing MVP.
- AI label UX is present but currently mixes user disclosure, AI detection, blocking, and appeals in a way that needs clearer policy.
- Tier limits exist backend-side but lack strong UX explanations and locked/upgrade states.

Top 10 recommended next decisions:
1. Implement the hard-block AI-generated content policy consistently across code, labels, tests, and public copy.
2. Implement canonical MVP navigation: Discover, Feeds, Create, Alerts, Profile, with News Board available to authenticated tiers.
3. Decide one canonical API contract source and eliminate route/OpenAPI drift.
4. Decide feed ranking principles: reputation-weighted quality, anti-ragebait penalties, editorial boosts, and freshness limits.
5. Implement Free, Premium, and Black tier-limit UX from the canonical entitlement API.
6. Make the React control panel canonical and hide or remove the Flutter admin shell unless mobile moderation is required.
7. Decide DSR scope across every Cosmos/Postgres entity before beta.
8. Decide profile visibility model and which fields are public, private, or trust-passport only.
9. Decide moderation appeal stages and what users see at each stage.
10. Decide which Asora identifiers remain internal through beta and which user-facing references must change now.

## 2. Repository Map

| Area | Purpose | Why It Matters |
|---|---|---|
| `lib/` | Flutter client app, design system, features, routing, state, generated API export | Primary mobile/web app surface |
| `functions/` | Azure Functions backend in Node/TypeScript | Main API, auth, feed, moderation, privacy, admin, payments |
| `apps/control-panel/` | React/Vite admin control panel | Separate admin/moderation console surface |
| `apps/marketing-site/` | Astro marketing/legal site | Terms, privacy, pricing, invite, AI moderation pages |
| `api/openapi/` | OpenAPI contract and generated client inputs | Contract governance; currently has drift |
| `database/`, `sql/` | Cosmos/Terraform notes and PostgreSQL schemas/migrations | Data model source candidates, not fully consistent |
| `cloudflare/`, `workers/` | Feed cache worker and deprecated compatibility worker | Anonymous discovery feed caching boundary |
| `infra/`, `infrastructure/` | Terraform/deployment infrastructure | Azure, Cloudflare, deployment resources |
| `scripts/` | CI guards, launch checks, coverage, route inventory, load tests | Strong operational hardening assets |
| `test/`, `integration_test/` | Flutter tests and integration tests | Client coverage and UX state protection |
| `functions/src/**/*.test.ts`, `functions/tests/`, `functions/__tests__/` | Backend unit/integration tests | API, route, moderation, privacy, feed coverage |
| `.github/workflows/` | CI/CD, deployment, OpenAPI, schema, mobile, beta smoke | Mature but complex delivery pipeline |
| `docs/` | Architecture, branding, readiness, operational docs | Useful but should not override active code |
| Generated/build folders | `.dart_tool/`, `build/`, `coverage/`, `node_modules/`, `temp/`, `lib/generated/`, zip artifacts | Should be ignored for product architecture decisions except generated API drift |

## 3. Current App Architecture

| Item | File Paths | Status | Gaps/Risks | Recommended Next Action |
|---|---|---|---|---|
| App entry | `lib/main.dart` | Implemented | App class still `AsoraApp`; title is `Lythaus` | Keep internal class unless rebrand cleanup is planned |
| Routing | `lib/core/routing/app_router.dart` | Implemented with `go_router` | Several screens are not routed; shell uses nested routes only for selected surfaces | Define canonical route map before UX work |
| Navigation | `lib/ui/screens/adaptive_shell.dart` | Partial MVP | Tabs are Discover/Create/Alerts/Profile; custom feeds/news are inside Discover area | Decide bottom nav and feed hierarchy |
| State management | Riverpod across `lib/state/`, `lib/features/**/application` | Implemented | Mixed old `state/` and feature-level providers | Gradually consolidate by feature boundary |
| Theme/design | `lib/design_system/**`, `lib/ui/theme/asora_theme.dart` | Implemented/partial | Strong Lythaus DS, but Asora wrapper, radius/typography inconsistencies | Keep tokens, audit components against DS gate |
| API client | `lib/core/network/dio_client.dart`, feature services, `lib/generated/api_client.dart` | Partial | Mix of manual Dio/http services and generated API | Pick generated vs manual per endpoint; document boundary |
| Auth/session | `lib/features/auth/**`, `lib/core/auth/auth_session_manager.dart` | Partial | OAuth2/PKCE exists; legacy email/login endpoints and Asora redirect schemes remain | Confirm canonical auth flow and deprecate stale calls |
| Error handling | `lib/core/error/error_codes.dart`, widget banners/snackbars | Partial | Good post/privacy handling, inconsistent across screens | Create shared error presentation matrix |
| Logging/analytics | `lib/core/analytics/**`, Crashlytics, OpenTelemetry deps | Partial | Debug Dio logs bodies; privacy risk if enabled near prod | Ensure no PII/body logging outside safe debug |
| Env/config | `lib/core/config/environment_config.dart` | Implemented | Dev pins live; staging/prod pins planned; Asora Azure URLs | Keep Asora infra names; document pin lifecycle |
| Platform code | `android/`, `ios/`, `web/`, `linux/`, `macos/`, `windows/` | Broad scaffold | App store readiness still partial | Finish mobile release checklist and privacy manifests |

## 4. Current Backend/API Architecture

Backend entry is `functions/src/index.ts`. It imports modules for health, analytics, auth, feed, moderation, privacy, social, users, posts, custom feeds, appeals, reputation, reactions, rewards, notifications, media, payments, and admin.

Shared infrastructure:
- HTTP wrapper: `functions/src/shared/http/handler.ts`; correlation IDs, CORS, private/no-store on authenticated responses.
- Auth context: `functions/src/shared/http/authContext.ts`.
- JWT verifier: `functions/src/auth/verifyJwt.ts`; UUID-v7 `sub` expectation.
- Rate policies: `functions/src/rate-limit/policies.ts`.
- Cosmos client: `functions/src/shared/clients/cosmos.ts`.
- Postgres client: `functions/src/shared/clients/postgres.ts`; risk: `rejectUnauthorized: false` when SSL enabled.
- Startup env validation: `functions/src/shared/startup-validation.ts`.

Endpoint/module summary:

| Module | Main Routes | Auth | Validation/Rate Limit | Missing/Weak Tests | UX Implication |
|---|---|---|---|---|---|
| Health | `GET /api/health`, `GET /api/ready` | Public | Basic readiness | Covered by CI likely | Needed for deployment checks |
| Auth | `/api/auth/authorize`, `/token`, `/refresh`, `/userinfo`, `/sessions/revoke`, `/invite/*` | Mixed public/auth | JWT, issuer/audience, UUID-v7 | Need provider E2E coverage | Signup/signin depends on this being canonical |
| Feed | `GET /api/feed`, `/feed/discover`, `/feed/public`, `/feed/news`, `/feed/user/{id}` | Optional or tiered | Rate limited, cursor/limit validation | Need performance/load tests tied to p95 target | Discovery and News Board quality depend here |
| Custom feeds | `/api/custom-feeds`, `/{id}`, `/{id}/items` | Auth | Tier limits backend-side | Need tier UX contract tests | Free/Black limits are backend-enforced but underexplained |
| Posts | `POST /api/posts`, `GET/PATCH/DELETE /api/posts/{id}` | Auth for writes | Zod/service validation, media ownership, Hive moderation | Stronger AI-policy tests needed | Composer can block/appeal content |
| Comments | `GET/POST /api/posts/{postId}/comments`, nested routes | Auth for writes | Rate limit likely | Need threading/deletion tests | Thread UX credible but incomplete |
| Likes/bookmarks/views | `/posts/{id}/like`, `/bookmark`, `/view`, `/receipt`, `/insights` | Auth for writes | Route policies | Contract drift around like/reactions | Engagement exists but should avoid virality-first UX |
| Moderation/flags | `/moderation/flag`, `/queue`, `/cases/*`, `/review-queue`, `/test` | Auth/moderator/admin | Role guards, rate limits | Need role and abuse matrix tests | Supports trust but UX needs clearer notices |
| Appeals/voting | `/appeals`, `/appeals/{id}`, `/appeals/{id}/votes`, moderation appeal routes | Auth | Rate limits and role/community logic | Need end-to-end appeal lifecycle tests | Core trust feature, partially surfaced |
| Reputation/rewards | `/reputation/*`, `/rewards/*` | Auth | Event based | Need AI-exclusion and anti-volume tests | Reputation exists but product semantics need tightening |
| Privacy | `GET /api/user/export`, `DELETE /api/user/delete` | Auth | DSR services, legal hold model | Need full-container cascade tests | Required before beta in GDPR/POPIA markets |
| Notifications | `/notifications/*`, `/devices`, `/preferences` | Auth | Device and preference APIs | Need platform push E2E | Alerts tab exists |
| Payments/subscription | `POST /payments/webhook`, `GET /subscription/status` | Webhook/status | Unclear from static pass | Need webhook signature tests | Tier gating depends on trustable status |
| News/admin | `_admin/news/ingest`, `_admin/*` | Admin | Role guards | Need editorial audit tests | News Board is backend-planned, UX-light |
| Media | `POST /api/media/upload-url` | Auth | Ownership checks used by posts | OpenAPI drift | Composer media depends on this |

Cached `route-inventory.json` reports no missing auth guard, rate limit, anonymous TODO, anonymous read, or test-env guard violations, but it was not regenerated during this audit.

## 5. Feature Inventory

| Feature Area | Existing Files/Components | Current Status | UX Readiness | Backend Readiness | Test Readiness | Risk | Notes |
|---|---|---:|---:|---:|---:|---:|---|
| Anonymous browsing | `auth_providers.dart`, feed routes | partial | medium | medium | medium | medium | Guest mode exists; read-only model needs polish |
| Onboarding | `lib/ui/screens/onboarding/*` | partial | low | n/a | medium | medium | Screens not clearly wired |
| Sign in / sign up | `auth_choice_screen.dart` | partial | medium | medium | medium | high | Multiple auth paths; canonical flow unclear |
| Google Auth | `oauth2_service.dart` | partial | medium | medium | low | medium | Provider hint exists |
| Apple Auth | `oauth2_service.dart` | partial | medium | medium | low | medium | Provider hint exists |
| World Auth | `oauth2_service.dart` | partial | medium | medium | low | medium | Provider hint exists |
| Email Auth | `auth_service.dart` | partial | low | unclear | low | high | Legacy endpoint shape appears separate |
| User profile | `profile_screen.dart` | partial | medium | medium | medium | medium | Public/own profile implemented |
| Profile editing | `profile_service.dart` | partial | low | medium | low | high | No strong routed edit screen found |
| Public/private fields | `settings_screen.dart`, trust passport | partial | medium | medium | low | medium | Trust passport visibility only |
| Username/bio moderation | `profileModerationService.ts` | partial | low | high | medium | medium | Backend ahead of UX |
| Discovery feed | `discover_feed.dart`, `feed_discover_get.function.ts` | partial | medium | medium | medium | high | Needs ranking/product clarity |
| Custom feeds | `custom_feed_creation_flow.dart`, `customFeedsService.ts` | partial | medium | medium | medium | medium | Tier limits backend-side |
| Feed filters | `filter_modal.dart`, feed models | partial | medium | low | low | medium | Stored filters not fully ranking-aware |
| Post creation | `create_post_screen.dart`, `posts_create.function.ts` | implemented | medium | high | medium | medium | Rich composer, policy copy needs cleanup |
| AI content labelling | Composer AI disclosure | partial | medium | high | medium | high | Generated content currently blocked |
| Hive AI detection | `moderationUtil.ts`, Hive clients | implemented | n/a | high | medium | medium | Fallback behavior allows/warns |
| AI content blocking | Composer/backend | implemented | medium | high | medium | high | Product decision needed |
| Simple AI labels | `ContentAuthorship`, badges | partial | medium | medium | medium | medium | No public numeric score in post card tests |
| Appeals flow | appeal widgets/routes/services | partial | medium | medium | medium | high | Lifecycle UX incomplete |
| Comments | `comment_thread_screen.dart`, comment routes | partial | medium | medium | medium | medium | Thread screen exists |
| Replies/threading | comment models/routes | partial | medium | medium | low | medium | Needs visible UX validation |
| Likes/reactions | post actions, reactions routes | partial | medium | medium | medium | medium | Contract drift around reactions/likes |
| Sharing | `post_card.dart`, `share_plus` | partial | medium | n/a | low | low | Link uses `lythaus.app` |
| Bookmarks/saves | post routes | partial | unclear | medium | low | medium | UI linkage unclear |
| Reporting/flagging | `post_actions.dart`, moderation flag routes | partial | medium | high | medium | medium | Needs profile/comment report parity |
| Community voting | appeal voting widgets/routes | partial | medium | medium | medium | high | Needs abuse controls |
| Moderator review | Flutter console + React panel | partial | medium | high | medium | high | Duplicate admin surfaces |
| Warnings/penalties | moderation/reputation services | partial | low | medium | low | high | User-facing warning UX unclear |
| Reputation points | reputation routes/providers | partial | medium | medium | medium | high | Needs quality-not-volume rules |
| Gamification/rewards | `rewards_dashboard.dart`, rewards routes | partial | medium | medium | low | medium | Should stay trust-first |
| Tier gating | custom feed/news/subscription | partial | low | medium | low | high | Client News feed says level 0 while backend Black-gates |
| Free tier limits | custom feed service | partial | low | medium | low | medium | Backend limit 1 |
| Black tier limits | custom feed service/news service | partial | medium | medium | medium | medium | Backend limit 3+ custom feeds plus News Board |
| News Board | `news_feed.dart`, `feed_news_get.function.ts` | partial | low | medium | low | high | Editorial model missing |
| Editorial Contributor application | `journalist_verifications` schema | stub | missing | low | missing | high | No credible MVP flow |
| Editorial peer review | unclear | missing | missing | missing | missing | high | Needed later |
| Notifications | notification screens/services | partial | medium | medium | medium | medium | Push setup present |
| Search | `feed_search_screen.dart` | partial | low | low | low | medium | Text says tag search while full text wired later |
| Settings | `settings_screen.dart` | partial | medium | medium | low | medium | Privacy screen not clearly in settings IA |
| Privacy controls | privacy screen/services | partial | medium | medium | medium | high | Needs full DSR confidence |
| DSR export/delete | privacy services/backend | partial | medium | medium | medium | high | Cascade scope risk |
| Terms/privacy surfaces | marketing Astro pages | partial | medium | n/a | low | medium | In-app linkage unclear |
| Admin/moderator tools | React panel, Flutter console | partial | medium | high | medium | high | Choose canonical surface |
| Analytics/telemetry | analytics services/App Insights | partial | n/a | medium | low | medium | Consent and PII logging need audit |
| Error/empty states | many widgets | partial | medium | n/a | medium | medium | Inconsistent by feature |
| Offline/poor-network | retry/loading states | partial | low | n/a | low | medium | No coherent offline UX |
| Accessibility | Material 3, tests/goldens | partial | medium | n/a | medium | medium | Needs manual audit |
| App store readiness | mobile workflows, privacy manifest | partial | medium | n/a | medium | high | Store evidence scripts exist |

## 6. UX Screen Inventory

| Screen/Page | Route | File Path | Purpose | Data | States | Auth | UX Rating | Main Improvement |
|---|---|---|---|---|---|---|---:|---|
| Auth choice | `/login` | `lib/features/auth/presentation/auth_choice_screen.dart` | Guest/signin/signup | Auth providers | Loading/error snackbars | public | 7 | Clarify signup vs signin |
| Auth callback | `/auth/callback` | `auth_callback_screen.dart` | OAuth completion | OAuth2 service | Processing/error | public | 6 | Provider-specific recovery |
| Invite redeem | `/invite/:code` | `invite_redeem_screen.dart` | Redeem invite | Invite API | Loading/error/success | public | 6 | Better anonymous-to-account transition |
| Adaptive shell | `/` | `adaptive_shell.dart` | Main app nav | Auth/feed state | Guest create block | mixed | 7 | Finalize nav IA |
| Discover feed | shell tab | `discover_feed.dart`, `home_feed_navigator.dart` | Browse discovery | Feed providers | Empty/error/loading/load more | guest ok | 6 | Add intentional feed boundaries |
| News feed | feed switch | `news_feed.dart` | News/community feed | News provider | Empty/error/loading | Black backend | 5 | Locked state and editorial framing |
| Custom feed wizard | modal/push | `custom_feed_creation_flow.dart` | Create custom feed | Custom feed API | Validation/error | signed-in | 6 | Tier-limit messaging |
| Create post | shell tab | `create_post_screen.dart` | Compose post | Post repository/media | Validation/block/appeal | signed-in | 6 | AI policy copy |
| Post detail | `/post/:postId` | `post_detail_screen.dart` | View post | Post service/comments | Loading/error | mixed | 6 | Trust receipt prominence |
| Comment thread | pushed | `comment_thread_screen.dart` | Discuss post | Comment API | Loading/error | mixed/write auth | 6 | Threading clarity |
| Notifications | shell tab | `notifications_screen.dart` | Alerts | Notification API | Empty/error/loading | signed-in | 6 | Permission and preference path |
| Notification settings | `/settings/notifications` | `notifications_settings_screen.dart` | Preferences | Notification API | Loading/error | signed-in | 6 | Put under settings IA |
| Profile | shell tab, `/user/:userId` | `profile_screen.dart` | Public/own profile | Profile/follow/reputation | Empty/error/loading | mixed | 6 | Edit/profile visibility |
| Settings | pushed | `settings_screen.dart` | User preferences | Settings/profile API | Save/error | signed-in | 5 | Add privacy/account/legal |
| Privacy | unclear route | `privacy_settings_screen.dart` | Export/delete/privacy | DSR API | Blocking/error/cooldown | signed-in | 6 | Route and legal copy |
| Reputation ledger | `/reputation/ledger` | `reputation_ledger_screen.dart` | Reputation history | Reputation API | Loading/error | signed-in | 6 | Explain quality rules |
| Moderation console | `/moderation` | `moderation_console_screen.dart` | Moderator queue | Moderation repo | Loading/error | mod/admin | 7 | Admin IA and role gating |
| Appeal history | `/moderation/appeal` | `appeal_history_screen.dart` | User appeals | Appeal repo | Loading/error | signed-in | 6 | Merge with appeal detail flow |
| React control panel | web routes | `apps/control-panel/src/App.jsx` | Admin ops | Admin API | Page states | admin | 6 | Choose canonical admin app |

Missing MVP screens:
- First-run onboarding with trust promise, auth choices, and guest limits.
- Full profile edit and profile visibility editor.
- Tier limit/upgrade explanation for Free vs Black.
- News Board locked, empty, and active states.
- Appeal submission/detail timeline.
- Unified report flow for post/comment/profile.
- Privacy/legal settings hub.
- Editorial Contributor application.
- Moderator case detail with audit trail and policy reference.
- Feed-quality controls and "why am I seeing this?" explanation.

## 7. User Journey Maps

| Journey | Current Path | Missing Pieces | Ideal MVP Path |
|---|---|---|---|
| Anonymous opens app | Guest mode can access shell/discovery | Guest limits and read-only education | Start in Discovery with clear read-only guest affordance |
| New user signs up | Auth choice with provider picker | Account creation distinction, consent, profile setup | Auth -> consent -> username/profile moderation -> first custom feed prompt |
| Returning signs in | OAuth/email paths | Provider error recovery | Auth -> restore session -> last feed |
| Creates post | Create tab -> composer -> submit | Better draft/error persistence | Composer with AI label, proof signals, preview, moderation receipt |
| Labels AI content | Composer chips | Policy mismatch | Require label, show reputation impact before submit |
| Hive blocks content | Backend returns block with appeal eligibility | User-facing explanation/timeline | Block notice -> edit or appeal -> appeal status |
| Appeals decision | Appeal widgets/routes exist | Unified appeal entry from all blocked states | Decision detail -> submit evidence -> timeline -> result |
| Browses Discovery | Feed switch/list | Intentional stopping points | Discovery with quality controls, refresh, cursor, why-this-card |
| Creates custom feed | Wizard exists | Tier limit states | Wizard -> preview -> save -> tier-aware limits |
| Comments on post | Comment thread exists | Reply clarity and moderation warning | Thread -> compose -> label/moderation receipt if needed |
| Reports content | Post actions/backend | Profile/comment parity | Report sheet -> reason -> receipt -> status |
| Edits profile visibility | Settings has Trust Passport visibility | Full profile fields | Profile edit -> field visibility -> moderated save |
| Checks reputation | Ledger route | Rules explanation | Reputation dashboard + ledger + non-earning AI labels |
| Authenticated user accesses News Board | News route now uses tier entitlement access | Editorial publishing controls still missing | Any authenticated tier can read; only Editorial Contributors should publish |
| Editorial Contributor applies | Mostly schema/planned | Application UX/API | Apply -> portfolio -> review status -> eligibility |
| Moderator reviews | Console exists | Canonical admin surface | Queue -> case detail -> policy -> decision -> audit |
| Exports/deletes data | Privacy API/screen exists | Full cascade confidence | Settings -> Privacy -> export/delete with status and legal hold messaging |

## 8. Data Model and Entity Map

| Entity | File Paths | Key Fields | ID Type | Relationships / Storage | Missing for Lythaus |
|---|---|---|---|---|---|
| User | `sql/schema.sql`, `lib/features/auth/domain/user.dart`, `functions/src/users/**` | id, email, roles, tier, reputation, metadata | UUID/v7 expected | Postgres users, Cosmos profiles | Consent/version, visibility map, safety status |
| Auth provider link | `sql/schema.sql`, auth services | provider, subject, user_id | UUID + provider subject | Postgres provider_links | Provider-subject privacy policy |
| Session/JWT | `verifyJwt.ts`, refresh token store | sub, roles, tier, type, iss/aud | UUID-v7 sub | JWT + Postgres refresh tokens | Device/session management UX |
| Post | `lib/features/feed/domain/models.dart`, `posts_create.function.ts` | id, author, text, media, aiLabel, moderation, trust, source | UUID-v7 backend | Cosmos posts partition likely authorId | Public label, editorial status, quality score explanations |
| Comment | `comment_thread_screen.dart`, comment routes | id, postId, parent, author, body | likely UUID | Cosmos comments | AI label/moderation fields parity |
| Like/reaction | post like/reaction routes | postId/userId/type | unclear | Cosmos likes/reactions | Contract consolidation |
| Feed | `feed_models.dart`, `feedService.ts` | mode, cursor, limit, ranking | cursor uses createdAt/id | Cosmos posts query | Explanation/ranking metadata |
| Custom feed | `customFeedsService.ts`, `custom_feed_service.dart` | id, owner, filters, sorting, limit | UUID/string | Cosmos customFeeds | Preview count, tier lock reason |
| Flag/report | moderation flag service/routes | contentId/type/reason/status | UUID | Cosmos flags/content_flags | Reporter feedback lifecycle |
| Appeal | appeal routes/domain | id, contentId, status, reason, votes | UUID | Cosmos appeals | Evidence attachments, timeline |
| Vote | appeal vote routes | appealId, userId, vote | UUID/composite | Cosmos appealVotes | Anti-brigade reliability |
| Moderation decision | `moderationService.ts`, decision logger | action, reason, provider, confidence | UUID | Cosmos moderationDecisions | Public-safe reason mapping |
| AI detection result | `moderationUtil.ts`, `PostModerationData` | provider, flags, score/confidence | n/a | Moderation metadata | Keep numeric scores private |
| Reputation event | reputation services/routes | event type, delta, source | UUID | Postgres/Cosmos unclear | Explicit AI-generated exclusion tests |
| Tier/subscription | `subscription/status`, tier models | tier, entitlements | user id | Backend subscription status | Billing status and grace periods |
| News item | post `isNews`, source fields, admin news ingest | source, region, topics | post id | Posts as news | Editorial Contributor byline/accountability entity |
| Editorial applicant | `sql/schema.sql` journalist verification | portfolio/work/status | UUID | Postgres | Full Editorial Contributor application/review workflow |
| Notification | notification models/routes | type, read, payload | UUID | Cosmos notifications | Preference matrix |
| Privacy request | `privacy/common/models.ts` | type/status/export/delete/legal hold | UUID | DSR stores + queue | Coverage over all containers |

## 9. API Contract Draft

Current contract shape is broad and close to OpenAPI-backed, but exact drift exists. Static comparison found 136 source method-routes and 136 OpenAPI method-routes, but mismatches around `POST /posts`, `POST /media/upload-url`, `GET/PATCH users/me`, wildcard admin moderation test paths, legacy moderation aliases, and reactions/likes.

| Endpoint Group | Methods/Paths | Auth | Request | Response | Client Screens | OpenAPI Gap |
|---|---|---|---|---|---|---|
| Auth | `/auth/authorize`, `/auth/token`, `/auth/refresh`, `/auth/userinfo` | mixed | OAuth code/refresh | tokens/user | Auth screens | Needs provider examples |
| Discovery | `GET /feed/discover`, `/feed/public` | optional | cursor, limit, topics | posts + cursor | Discover | Covered but ranking metadata thin |
| News | `GET /feed/news` | Black/admin | region/topics/cursor | news posts | News feed | Needs lock/error schema |
| Custom feeds | `/custom-feeds`, `/{id}/items` | auth | filters/sorting | feed/items | Custom feed wizard | Needs tier error schema |
| Posts | `POST /posts`, `/posts/{id}` | auth writes | content/media/aiLabel | post/block error | Composer/detail | `POST /posts` exact drift found |
| Comments | `/posts/{postId}/comments` | mixed | body/parent | comments | Thread | Needs threading examples |
| Moderation | `/moderation/flag`, `/queue`, `/cases/*` | auth/mod/admin | reason/decision | case/status | Report/admin | Legacy alias drift |
| Appeals | `/appeals`, `/{id}`, `/{id}/votes` | auth | appeal/vote | appeal/status | Appeal screens | Needs lifecycle examples |
| Reputation | `/reputation/me`, `/ledger`, `/user/{id}` | auth | none/cursor | score/events | Profile/ledger | Needs earning-rule docs |
| Privacy | `/user/export`, `/user/delete` | auth | delete/export request | status/file | Privacy | Needs legal hold states |
| Notifications | `/notifications/*` | auth | preference/device | notifications | Alerts/settings | Needs platform payload docs |
| Admin | `_admin/*`, `admin/*` | admin | varies | audit/config/cases | Control panel | Needs canonical admin grouping |
| Payments | `/payments/webhook`, `/subscription/status` | webhook/auth | event/status | status | Tier gates | Needs signature/error docs |

Minimum OpenAPI before soft launch:
- One versioned spec under `api/openapi/openapi.yaml`.
- Security schemes for guest, bearer JWT, admin role, webhook signature.
- Canonical error envelope with `code`, `message`, `correlationId`, `appealEligible`, `caseId`.
- Examples for blocked content, AI label required, tier limit, anonymous read, auth expired, DSR legal hold.
- Generated Dart client checked in or generated in CI, but not both without drift checks.
- Contract tests that compare active Azure Functions route inventory to OpenAPI.

## 10. Architecture Gaps Against Lythaus Strategy

| Gap | Severity | Why It Matters | Direction | Relevant Files |
|---|---|---|---|---|
| Trust architecture split across many services | high | Hard to explain and test user trust | Create trust domain model and public receipt contract | `lib/ui/components/receipt_drawer.dart`, moderation/reputation services |
| Human authenticity not end-to-end | high | Core positioning depends on it | Define verification levels and display rules | auth/profile/reputation modules |
| AI transparency policy enforcement | high | Decided hard-block policy must stay consistent across UX/backend/docs | Keep AI-generated out of public labels; preserve appeal path | `create_post_screen.dart`, `posts_create.function.ts` |
| Feed quality ranking incomplete | high | Avoids ragebait/engagement bait | Use quality features before engagement metrics | `feedService.ts`, `rankingConfig.ts` |
| Reputation can drift toward volume | high | Must reward accountable quality | Add earning caps and AI exclusion tests | reputation services |
| Appeals UX fragmented | high | Trust requires clear recourse | Single appeal timeline across moderation types | appeal screens/routes |
| Editorial/News Board thin | high | News Board reach now depends on Editorial Contributor accountability, not Black gating | Add contributor/news entities and workflows | news feed/admin news ingest/sql |
| Tier gating mismatch | high | Client/server inconsistency erodes trust | Central entitlement contract | `feed_providers.dart`, `feed_news_get.function.ts` |
| Privacy cascade uncertainty | high | GDPR/POPIA risk | Full entity coverage matrix and tests | `cascadeDelete.ts`, Cosmos clients |
| Anti-abuse/rate limiting mostly backend | medium | UX must explain penalties | Warning/penalty UI and audit receipt | moderation/reputation/profile |
| Observability privacy | medium | Trust and compliance issue | Redact request/response bodies and PII logs | `dio_client.dart`, logging services |
| Test coverage breadth uneven | medium | P1/P2 targets exist but feature semantics need tests | Add strategy-level tests | CI, feature tests |

## 11. UX Gaps and Product Decisions Needed

| Area | Recommended Default | Alternative | Trade-off | Risk If Undecided |
|---|---|---|---|---|
| Navigation | Discover, Feeds, Create, Alerts, Profile | Keep current 4 tabs | 5 tabs clearer for custom feeds | Users miss custom feeds |
| Feed structure | Discovery plus user-created feeds | One blended home feed | Simpler but less transparent | Ranking feels opaque |
| Composer | Require AI label before publish | Infer label only | User agency vs friction | Mislabeling disputes |
| AI label UX | Allow human/assisted/generated labels, exclude generated from rep | Block generated posts | Broader discourse vs purity | Policy contradiction |
| Moderation notices | Plain reason + appeal action | Generic block | Transparency vs abuse disclosure | Low trust |
| Appeals UX | Timeline with evidence/status | Simple form | More work, higher trust | Appeals feel performative |
| Reputation UX | Explain earning categories | Show score only | Slower but credible | Gamification dominates |
| Profile visibility | Field-level controls plus Trust Passport modes | Single private/public toggle | More control vs complexity | Privacy confusion |
| Tier limits | Lock states with exact limits | Silent backend errors | Clear monetisation | Conversion/support issues |
| News Board | Authenticated tier-readable surface with Editorial Contributor publishing | Mix into Discovery | Better public-interest reach; less paid differentiation | Editorial accountability remains unclear |
| Editorial apps | Application + portfolio + review status | Email/manual form | Productized accountability | No scalable Editorial Contributor layer |
| Notifications | Safety, replies, reputation, system categories | Flat list | More settings | Alert fatigue |
| Settings/privacy | Dedicated Privacy & Safety hub | Scatter settings | Compliance clarity | DSR hard to find |
| Admin tools | React control panel canonical | Flutter admin shell | Web ops easier | Duplicate role surfaces |

## 12. Design System Audit

Existing design tokens/theme:
- `lib/design_system/theme/lyth_theme.dart`
- `lib/design_system/theme/lyth_color_schemes.dart`
- `lib/design_system/tokens/*`
- `lib/design_system/components/*`
- `lib/ui/theme/asora_theme.dart`
- React control panel tokens: `apps/control-panel/src/styles/tokens.css`

Material 3 usage is present in Flutter theme and components. Component consistency is partial: Lythaus DS components coexist with older `lib/ui/components` and wrappers named Asora.

Accessibility concerns:
- Some display typography uses negative letter spacing.
- Some card/dialog radii exceed the tight product-tool guidance.
- Visual accessibility is not proven without rendered screen QA.
- Feed surfaces rely heavily on list density and chips; focus order and screen-reader labels need testing.

Asora branding remains in:
- `pubspec.yaml` package name and asset `assets/brand/asora_mark.svg`.
- Dart imports `package:asora/...`.
- `lib/ui/theme/asora_theme.dart`.
- OAuth redirect schemes/package IDs and Azure URLs.
- API generated package names.
- Infrastructure/database docs.

Where Lythaus should be applied:
- User-facing app strings, page titles, marketing/legal pages, store metadata, share URLs, app title, onboarding, moderation notices.

Post colour variation recommendation:
- Do not use colour variation to indicate tier. That creates class-based visual hierarchy.
- Do not use random colour for trust-critical feed cards. Randomness reduces scannability.
- Use restrained colour only for content type, state, and trust status: news/editorial, under review, blocked, appealed, verified human context. Keep reputation/tier as badges, not card colour.

## 13. Feed Architecture Audit

Current query model:
- `functions/src/feed/service/feedService.ts` queries Cosmos posts by mode, visibility, cursor/since, author/profile filters.
- `feed_discover_get.function.ts` handles Discovery/Public with optional auth and in-memory topic filters.
- `feed_news_get.function.ts` gates News for Black/admin tier.
- `customFeedsService.ts` filters custom feeds by content type, keywords, accounts, and cursor.

Pagination:
- Cursor based on post ordering (`createdAt`, `id`), max limit around 50.
- Custom feeds use cursor and `createdAt`.

Ranking:
- `rankingConfig.ts` defines recency/reputation/trust weights.
- Active feed service does initial Cosmos order then in-memory ranking/enrichment on one page. This is not globally ranked.

Caching:
- `cloudflare/worker.ts` caches only anonymous `GET /api/feed/discover`.
- Authenticated/cookie requests bypass and receive private/no-store handling.

Authenticated vs anonymous:
- Optional auth for discovery/public.
- Personalized/authenticated feeds should not be CDN cached; worker aligns with that.

p95 below 200 ms:
- Not realistic from current structure under load without measured proof. Cross-partition Cosmos queries, enrichment, reputation batch reads, and in-memory sorting are p95 risks.

Required changes:
- Discovery feed: precompute or materialize rank candidates; return explanation metadata.
- Free custom feed: enforce one feed in backend and show clear client limit.
- Black custom feeds: enforce three feeds and expose entitlement reason.
- News Board: separate editorial query/entity; do not just filter `isNews`.
- Editorial boosts: explicit boost rules with audit trail.
- Reputation-aware ranking: use capped quality/reputation signals, not raw virality.
- Anti-ragebait ranking: downrank high-report, rapid-reaction, low-reputation, rage terms, repeated engagement-bait patterns.

## 14. Moderation and AI Policy Audit

Hive integration:
- Text/media moderation is implemented in `functions/src/posts/service/moderationUtil.ts`.
- Profile field moderation exists in `functions/src/users/service/profileModerationService.ts`.
- Thresholds appear dynamically configurable through admin config.

Text/image/deepfake:
- Text and media moderation are visible.
- AI/synthetic/deepfake category matching is present by category-name patterns.
- Deepfake-specific product flow is unclear.

Threshold handling:
- Backend maps Hive thresholds to allow/warn/block.
- Hive errors often queue/warn rather than block, which is pragmatic but must be visible to moderators.

Block/allow:
- Blocked content returns appeal-eligible errors for posts/profile updates.
- AI-generated posts are blocked at publish time.

Appeals/community voting/mod review:
- Backend and widgets exist for appeals and voting.
- Moderator console exists.
- Full user-facing lifecycle is fragmented.

Audit trail:
- Moderation decisions and admin audit entries exist.
- Public-safe audit receipt needs clearer UI.

Numeric AI scores:
- Numeric score/confidence fields exist internally.
- UI tests verify post cards do not display AI percentages.
- Keep numeric scores private.

Simple labels:
- Public labels should be `Human-authored`, `AI-assisted`, and `Under review`; `Blocked after review` belongs only in appeal/moderation history.
- Display consistency needs end-to-end audit.

AI-generated reputation:
- Since AI-generated posts are blocked, they do not earn post reputation.
- Add explicit tests that blocked AI-generated submit attempts do not create positive reputation events.

Missing abuse cases:
- Coordinated appeals voting, reporter harassment, profile impersonation, repeated borderline AI spam, edited-after-approval content, media reupload evasion, reputation farming by low-effort human posts.

## 15. Auth, Identity, and Guest Mode Audit

Supported providers:
- Google, Apple, World ID, Email UI/options exist.
- OAuth2 provider hints in `oauth2_service.dart`.

PKCE:
- Flutter AppAuth/OAuth2 path indicates PKCE-capable architecture.

JWT:
- Backend verifier expects issuer/audience and UUID-v7 `sub`.
- JWT `sub` mapping to users.id is aligned with target.

Refresh:
- Refresh token flow exists in backend/client services.

Guest mode:
- Riverpod guest mode exists and Create tab blocks guests.

UUID v7:
- Backend verifier enforces UUID-v7 for JWT subject.
- Post creation uses UUID v7.

Provider subject privacy:
- Provider links exist in schema, but product privacy handling is unclear.

Session persistence:
- Secure storage and web session storage paths exist.
- Internal keys still use Asora names, which is acceptable unless user-facing.

Logout/delete:
- Logout exists; account deletion exists via privacy flow.

Security risks:
- Legacy endpoint references can bypass intended canonical flow if still active.
- Debug request/response body logging should be constrained.
- Postgres SSL `rejectUnauthorized:false` should be revisited.
- Env names include high-sensitivity secrets expected from environment/Key Vault; no values should be committed.

UX gaps:
- Provider errors, account linking, consent, guest upgrade, and delete-account confirmation need clearer flows.

## 16. Privacy, Compliance, and Safety Audit

Visible GDPR/POPIA support:
- `lib/features/privacy/privacy_settings_screen.dart`
- `lib/features/privacy/services/privacy_api.dart`
- `functions/src/privacy/common/models.ts`
- `functions/src/privacy/service/cascadeDelete.ts`

Implemented/partial:
- Export request/status.
- Delete request with hard-delete flag support.
- Legal hold model.
- DSR statuses and audit entries.
- Account deletion returns user to auth gate.

Risks:
- Cascade deletion/anonymisation may not cover every active container listed in `cosmos.ts`, including custom feeds, notifications, counters, receipt events, messages, public profiles, rewards/reputation ledgers, and invites.
- Consent logging is not clearly surfaced in the app.
- No PII in logs is not proven; debug network logs and backend logs need an explicit policy.
- IP hashing/redaction is unclear from repo.
- Privacy/terms exist in marketing site, but in-app legal surfaces are unclear.
- Incident/runbook docs may exist, but active operational linkage was not fully audited.

Required before beta:
- Entity-by-entity DSR matrix.
- Tests proving export/delete coverage for every active data store.
- Consent version storage.
- PII log redaction tests.
- In-app Privacy & Safety hub.

## 17. Test and CI/CD Audit

Test structure:
- Flutter unit/widget/integration tests in `test/` and `integration_test/`.
- Backend Jest tests in `functions/src/**/*.test.ts`, `functions/tests/`, `functions/__tests__/`.
- React control panel tests in `apps/control-panel/src/**/*.test.jsx`.
- Scripts for OpenAPI, route guards, Cosmos contracts, launch readiness, k6 load tests.

CI workflows include:
- `.github/workflows/ci.yml`
- `flutter-ci.yml`
- `api-contract.yml`
- `openapi.yml`
- `schema-check.yml`
- `e2e-integration.yml`
- `launch-readiness-gate.yml`
- `mobile-release-build.yml`
- `mobile-security-check.yml`
- `deploy-*.yml`
- `deploy-feed-cache-worker.yml`
- `terraform-ci.yml`

Coverage:
- Flutter CI runs `flutter test --coverage`.
- `scripts/coverage_baseline.json` enforces total `89.87`, P1 `80`, P2 `80`, P3 `80`.
- Functions Jest thresholds: statements 85, branches 72, lines 85, functions 85.
- Route guard script exists at `scripts/validate-functions-route-guards.js`.

Commands:

```powershell
flutter pub get
flutter test --coverage
bash scripts/check_coverage_gates.sh
cd functions; npm ci; npm run typecheck; npm run test:coverage
npm run openapi:lint
npm run openapi:test:contract
npm run test:route-guards
```

The audit was a static read-only inspection; full test suites were not run for the report.

## 18. Build and Run Instructions

Local tool versions observed during the audit:
- Flutter `3.44.2`
- Dart `3.12.2`
- Node `v22.17.0`
- npm `11.11.0`

Flutter app:

```powershell
flutter pub get
flutter run --dart-define=ENVIRONMENT=development --dart-define=API_BASE_URL=[REQUIRED] --dart-define=AUTH_URL=[REQUIRED]
```

Backend:

```powershell
cd functions
npm ci
npm run build
npm run test:coverage
func start
```

Required/expected environment names, values intentionally omitted:

```text
COSMOS_CONNECTION_STRING=[REQUIRED]
COSMOS_DATABASE_NAME=[OPTIONAL]
JWT_SECRET=[REQUIRED]
JWT_ISSUER=[REQUIRED]
HIVE_API_KEY=[REQUIRED]
KV_URL=[REQUIRED]
FCM_PROJECT_ID=[REQUIRED]
FCM_CLIENT_EMAIL=[REQUIRED]
FCM_PRIVATE_KEY=[REQUIRED]
APPLICATIONINSIGHTS_CONNECTION_STRING=[OPTIONAL]
CORS_ALLOWED_ORIGINS=[OPTIONAL]
RATE_LIMITS_ENABLED=[OPTIONAL]
RATE_LIMIT_CONTAINER=[OPTIONAL]
AUDIT_HMAC_KEY=[OPTIONAL]
POSTGRES_CONNECTION_STRING=[REQUIRED where Postgres services run]
GOOGLE_WEB_CLIENT_ID=[REQUIRED where Google auth runs]
APPLE_CLIENT_ID=[REQUIRED where Apple auth runs]
WORLD_CLIENT_ID=[REQUIRED where World auth runs]
```

Known setup issues:
- `npm ci` should be preferred in CI. Prior local Windows installs may need `npm install --ignore-scripts` only when the prepare hook blocks dependency setup.
- `.fvmrc` governs CI Flutter version; local Flutter is newer than `pubspec.yaml` minimum.
- Staging/prod mobile pins appear planned rather than live in `environment_config.dart`.

## 19. Naming/Rebrand Audit: Asora to Lythaus

Must change now for user-facing rebrand:
- App/store display strings that still say Asora, if any remain after targeted scan.
- Asset `assets/brand/asora_mark.svg` if visible.
- Share/deeplink copy where user-facing.
- Marketing/legal inconsistencies such as `lythaus.app`, `lythaus.com`, and `lythaus.asora.co.za` domain mix.

Can remain internally:
- `pubspec.yaml` package name `asora`.
- Dart imports `package:asora/...`.
- Internal class names such as `AsoraApp` and `AsoraTheme`, if not user-visible.
- Generated package names during migration.
- Database name defaults and repo/workspace names.

Should not change yet without deployment plan:
- Android package ID and iOS schemes such as `com.asora.app`, `asora://`.
- Azure Function/resource names using Asora.
- Terraform resource names.
- OpenAPI server URLs using Asora infrastructure.
- Keychain/shared preference identifiers.

## 20. Recommended MVP Information Architecture

Bottom navigation:
1. Discover: public-interest discovery feed, high-signal posts, search/trending as secondary.
2. Feeds: custom feeds list, create/edit feed, Free/Black limits.
3. Create: post composer, AI label, proof signals, moderation receipt.
4. Alerts: replies, moderation, appeals, reputation, system notifications.
5. Profile: public profile, reputation, trust passport, settings.

Primary screens:
- Discovery feed
- Custom feeds
- News Board
- Create post
- Notifications
- Profile
- Settings
- Privacy & Safety
- Reputation ledger
- Appeal center

Secondary screens:
- Post detail
- Comment thread
- Report content/profile
- Appeal detail/timeline
- Feed editor
- Profile editor
- Tier/plan details
- Legal pages

Moderator/admin:
- Canonical web control panel for staff.
- In-app moderator console only if mobile moderation is a real requirement.
- Admin surfaces: queue, case detail, appeals, flags, users, audit, config, Hive test, invites.

Guest differences:
- Can browse Discovery and public profiles.
- Cannot create, comment, vote, appeal, customize feeds, or access News Board.
- Sees clear read-only guest banner and sign-in actions.

Free differences:
- Discovery feed.
- One custom feed.
- No News Board unless product decides free preview.

Black differences:
- Discovery feed.
- Three custom feeds.
- News Board.
- Possibly stronger reputation/accountability display, but not coloured feed priority.

## 21. Recommended MVP User Stories

P0 soft-launch blockers:
- As a guest, I want to browse Discovery read-only, so that I can understand Lythaus before signing up. Acceptance: guest can read; write actions prompt sign-in; no auth-only cache leakage.
- As a new user, I want to sign up with Google, Apple, World, or email, so that I can create an accountable account. Acceptance: provider errors recover; JWT sub maps to user id; consent is stored.
- As a user, I want to label posts as human-authored or AI-assisted, so that readers understand authorship. Acceptance: label required where relevant; AI-generated submit attempts are blocked; no public numeric AI score.
- As a user, I want to appeal a blocked moderation decision, so that mistakes can be corrected. Acceptance: appeal button, case id, timeline, final state.
- As a user, I want export/delete controls, so that privacy rights are usable. Acceptance: export/delete status, cooldown/legal hold messages, verified cascade tests.

P1 strong MVP:
- As a free user, I want one custom feed, so that I can tailor Lythaus without paying. Acceptance: one feed allowed; second feed explains tier limit.
- As a Black user, I want three or more custom feeds and all eligible rewards, so that paid value is clear. Acceptance: entitlements reflected consistently client/server.
- As a moderator, I want a queue with evidence and policy context, so that decisions are accountable. Acceptance: decision writes audit trail.
- As a reader, I want to know why a post appears, so that feed ranking feels transparent. Acceptance: why-this shows safe ranking factors.
- As a user, I want a reputation ledger, so that I understand score changes. Acceptance: each event has reason, source, and appealability where relevant.

P2 post-launch:
- As an Editorial Contributor applicant, I want to submit portfolio and external work, so that I can become News Board eligible.
- As an editor, I want peer review inputs, so that Editorial Contributor eligibility is accountable.
- As a user, I want notification categories, so that safety alerts remain visible without spam.
- As a moderator, I want abuse-pattern dashboards, so that coordinated manipulation is visible.

P3 later:
- As a user, I want advanced feed refinements, so that I can tune signal without addiction loops.
- As a legal/admin user, I want incident runbooks tied to audit logs, so that safety incidents are traceable.
- As a product team, I want A/B-safe trust metrics, so that improvements do not optimize rage engagement.

## 22. Risk Register

| Risk | Area | Severity | Likelihood | Impact | Evidence | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| AI policy contradiction | Product/backend | blocker | high | high | Composer/backend block generated AI | Decide policy and update tests/copy | product/backend |
| Feed p95 target missed | Backend | high | high | high | Cross-partition/enrichment/in-memory ranking | Materialized feed/ranking cache | backend/infra |
| OpenAPI drift | API | high | medium | high | Source/OpenAPI exact mismatches | Route inventory contract gate | backend |
| DSR incomplete cascade | Privacy | high | medium | high | Cosmos containers exceed cascade evidence | DSR coverage matrix/tests | backend/legal |
| Duplicate admin surfaces | UX/ops | high | high | medium | Flutter and React admin consoles | Pick canonical surface | product/design |
| Auth legacy paths | Auth | high | medium | high | Email legacy endpoints and OAuth2 paths | Auth source-of-truth cleanup | backend/frontend |
| Tier mismatch | Monetisation | high | medium | medium | Client News tier level vs backend gate | Entitlement contract | product/backend |
| PII/body logging | Privacy | medium | medium | high | Dio debug body logs | Redaction policy and tests | frontend/backend |
| Schema drift | Data | high | high | high | `database/migrate_to_target_schema.sql` inconsistencies | Canonical migrations | backend/infra |
| Reputation gaming | Trust | high | medium | high | Reputation exists before final rules | Caps, quality signals, abuse tests | product/backend |
| Rebrand half-state | Brand | medium | high | medium | Asora/Lythaus mixed names | User-facing string audit | design/frontend |
| Editorial promise thin | Product | high | high | medium | News Board lacks Editorial Contributor workflow | Build editorial MVP slice | product/backend |

## 23. Questions for Kyle / Product Owner

Must answer before implementation:
- What exact Hive/risk thresholds distinguish mild AI assistance from strong AI-generation signals?
- Is the React control panel or Flutter admin shell the canonical moderator/admin surface?
- What exact user-visible tiers are in MVP: Free and Black only, or a third tier now?
- Which Editorial Contributor subtypes are allowed at MVP, and which require stricter verification?
- What profile fields are public by default, private by default, and user-configurable?

Should answer before soft launch:
- What reputation events should earn points, and what hard caps prevent volume farming?
- What appeal decisions can community voters influence versus staff moderators only?
- What exact guest limits should appear in UI?
- What domains are canonical for app links, support, privacy, and marketing?
- What is the minimum acceptable DSR deletion behavior under legal hold?

Can decide later:
- Fourth tier naming and entitlement set.
- Peer-review scoring details for editorial applicants.
- Advanced custom feed filters.
- Public trust passport expansion levels.
- Long-term newsroom/editorial governance model.

## 24. Final Recommendations

Top 10 architecture decisions:
1. Canonical API/OpenAPI source and route drift gate.
2. Canonical auth/session path.
3. AI-generated content policy enforcement and threshold calibration.
4. Feed ranking architecture.
5. DSR entity coverage.
6. Entitlement/tier contract.
7. Admin surface consolidation.
8. Reputation event model.
9. Editorial/news data model.
10. Observability and PII redaction standard.

Top 10 UX decisions:
1. Bottom nav IA.
2. Guest mode messaging.
3. Composer AI label flow.
4. Moderation block/appeal notices.
5. Custom feed tier lock states.
6. News Board locked/active states.
7. Reputation ledger explanation.
8. Profile visibility editor.
9. Privacy & Safety settings hub.
10. Moderator queue/case UX.

Top 10 engineering tasks:
1. Add route-vs-OpenAPI exact drift CI gate.
2. Add AI policy tests for label/block/reputation behavior.
3. Build entitlement API consumed by all tier-gated UI.
4. Add DSR cascade coverage tests for every active container/table.
5. Consolidate feed ranking and materialization plan.
6. Remove or guard debug body logging.
7. Fix Postgres TLS verification posture.
8. Wire onboarding and privacy settings routes.
9. Add profile edit screen backed by moderated profile update.
10. Decide and remove/deprecate duplicate admin shell.

Top 10 product/design tasks:
1. Finalize MVP IA.
2. Write AI label and appeal copy.
3. Define reputation rules in user-readable form.
4. Design News Board MVP states.
5. Design tier limit states.
6. Design profile visibility matrix.
7. Design privacy/export/delete flow.
8. Design moderation case timeline.
9. Create rebrand string/domain checklist.
10. Define Editorial Contributor application requirements.

Recommended 2-week internal beta plan:
- Days 1-2: lock AI policy, MVP IA, tier entitlements, admin surface decision.
- Days 3-4: route/OpenAPI drift cleanup, entitlement contract, News Board lock states.
- Days 5-6: profile edit/visibility, Privacy & Safety hub routing, guest limit UX.
- Days 7-8: appeal timeline, moderation notice copy, reputation earning-rule UI.
- Days 9-10: DSR coverage tests, AI reputation tests, feed p95 measurement baseline.
- Days 11-12: rebrand user-facing strings/assets/domains, app store/privacy evidence pass.
- Days 13-14: full CI, smoke tests, internal beta walkthrough, issue triage.
