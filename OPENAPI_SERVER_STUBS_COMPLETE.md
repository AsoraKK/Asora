# Azure Functions Server Stubs Generation - Complete ✓

**Date:** 2025-12-09  
**Source:** `docs/openapi.yaml` (validated, 34 operations, 0 errors, 0 warnings)  
**Status:** All v1 endpoints implemented as TypeScript stubs

---

## Summary

Successfully generated Azure Functions (Node/TypeScript) server stubs for all **24 Phase 1 (v1) operations** from the validated OpenAPI 3.0.3 specification.

### Statistics

- **24 function handlers** created (all return 501 NOT_IMPLEMENTED)
- **2 shared modules** created (types, HTTP handler wrapper)
- **6 new domains** scaffolded (users, posts, custom-feeds, appeals + extensions to auth, feed, moderation)
- **0 TypeScript compilation errors** (`npm run typecheck` passes)
- **10 v2 endpoints** documented but not implemented (Phase 2)

---

## Generated Files

### Shared Infrastructure

#### `functions/src/shared/types/openapi.ts` (New)
TypeScript interfaces for all OpenAPI request/response schemas:
- Error handling: `ErrorResponse`
- Auth: `AuthTokenRequest`, `AuthTokenResponse`, `RefreshTokenRequest`, `RefreshTokenResponse`
- Users: `UserProfile`, `UpdateUserProfileRequest`, `PublicUserProfile`
- Posts: `CreatePostRequest`, `Post`, `PostView`, `CursorPaginatedPostView`
- Custom Feeds: `CustomFeedDefinition`, `CreateCustomFeedRequest`, `UpdateCustomFeedRequest`, `CustomFeedListResponse`
- Moderation: `ModerationCase`, `ModerationDecision`, `ModerationCaseListResponse`, `ModerationCaseResponse`, `ModerationDecisionRequest`
- Appeals: `Appeal`, `FileAppealRequest`, `AppealResponse`, `AppealVote`, `AppealDetailsResponse`, `VoteOnAppealRequest`, `VoteOnAppealResponse`
- Pagination: `CursorPaginationParams`, `FeedQueryParams`

#### `functions/src/shared/http/handler.ts` (New)
HTTP handler wrapper providing:
- Correlation ID injection and propagation
- Standardized error response formatting (`ErrorResponse` schema)
- Request body parsing (JSON)
- Path/query parameter extraction
- Response helpers: `ok()`, `created()`, `accepted()`, `noContent()`, `badRequest()`, `unauthorized()`, `forbidden()`, `notFound()`, `notImplemented()`, `internalError()`
- Type-safe request/response handling via generics

---

## Domain-by-Domain Breakdown

### 1. Auth Domain (2 functions)

**Directory:** `functions/src/auth/routes/`

| Function | Method | Path | operationId | Status |
|----------|--------|------|-------------|--------|
| `auth_token_exchange.function.ts` | POST | `/api/auth/token` | `auth_token_exchange` | ✓ Stub |
| `auth_token_refresh.function.ts` | POST | `/api/auth/refresh` | `auth_token_refresh` | ✓ Stub |

**Implementation Notes:**
- Token exchange: Validate grant_type, exchange provider code, create/update user in PG + Cosmos, generate JWT
- Token refresh: Validate refresh token, generate new token pair

---

### 2. Users Domain (3 functions)

**Directory:** `functions/src/users/` (New)

| Function | Method | Path | operationId | Status |
|----------|--------|------|-------------|--------|
| `users_me_get.function.ts` | GET | `/api/users/me` | `users_me_get` | ✓ Stub |
| `users_me_update.function.ts` | PATCH | `/api/users/me` | `users_me_update` | ✓ Stub |
| `users_get_by_id.function.ts` | GET | `/api/users/{id}` | `users_get_by_id` | ✓ Stub |

**Index:** `functions/src/users/index.ts`

**Implementation Notes:**
- Get current user: Merge PG users table + Cosmos users container
- Update profile: Update Cosmos users doc, optionally PG for username
- Get by ID: Return public profile only (filter sensitive fields)

---

### 3. Posts Domain (4 functions)

**Directory:** `functions/src/posts/` (New)

| Function | Method | Path | operationId | Status |
|----------|--------|------|-------------|--------|
| `posts_create.function.ts` | POST | `/api/posts` | `posts_create` | ✓ Stub |
| `posts_get_by_id.function.ts` | GET | `/api/posts/{id}` | `posts_get_by_id` | ✓ Stub |
| `posts_delete.function.ts` | DELETE | `/api/posts/{id}` | `posts_delete` | ✓ Stub |
| `posts_list_by_user.function.ts` | GET | `/api/users/{userId}/posts` | `posts_list_by_user` | ✓ Stub |

**Index:** `functions/src/posts/index.ts`

**Implementation Notes:**
- Create: Validate input, store in Cosmos posts (PK `/authorId`), apply moderation
- Get by ID: Fetch post + author profile, enrich with engagement metrics
- Delete: Verify ownership, delete document
- List by user: Query by partition key `/authorId`, cursor-paginated

---

### 4. Feed Domain (3 functions)

**Directory:** `functions/src/feed/routes/` (Extended)

| Function | Method | Path | operationId | Status |
|----------|--------|------|-------------|--------|
| `feed_discover_get.function.ts` | GET | `/api/feed/discover` | `feed_discover_get` | ✓ Stub |
| `feed_news_get.function.ts` | GET | `/api/feed/news` | `feed_news_get` | ✓ Stub |
| `feed_user_get.function.ts` | GET | `/api/feed/user/{userId}` | `feed_user_get` | ✓ Stub |

**Implementation Notes:**
- Discover: Mix journalists + community, apply topic filters, ranking algorithm
- News: Filter `isNews=true`, journalist + high-rep users, include `authorRole`
- User timeline: Fetch followed accounts from social graph, query posts, cursor-paginated

---

### 5. Custom Feeds Domain (6 functions)

**Directory:** `functions/src/custom-feeds/` (New)

| Function | Method | Path | operationId | Status |
|----------|--------|------|-------------|--------|
| `customFeeds_list.function.ts` | GET | `/api/custom-feeds` | `customFeeds_list` | ✓ Stub |
| `customFeeds_create.function.ts` | POST | `/api/custom-feeds` | `customFeeds_create` | ✓ Stub |
| `customFeeds_getById.function.ts` | GET | `/api/custom-feeds/{id}` | `customFeeds_getById` | ✓ Stub |
| `customFeeds_update.function.ts` | PATCH | `/api/custom-feeds/{id}` | `customFeeds_update` | ✓ Stub |
| `customFeeds_delete.function.ts` | DELETE | `/api/custom-feeds/{id}` | `customFeeds_delete` | ✓ Stub |
| `customFeeds_getItems.function.ts` | GET | `/api/custom-feeds/{id}/items` | `customFeeds_getItems` | ✓ Stub |

**Index:** `functions/src/custom-feeds/index.ts`

**Implementation Notes:**
- List: Query Cosmos `custom_feeds` (PK `/ownerId`), apply tier limits
- Create: Validate 3-layer filters (content type, keywords, accounts), check tier limits
- Get/Update/Delete: Verify ownership
- Get items: Apply filters, query posts, enrich with author profiles

---

### 6. Moderation Domain (3 functions)

**Directory:** `functions/src/moderation/routes/` (Extended)

| Function | Method | Path | operationId | Status |
|----------|--------|------|-------------|--------|
| `moderation_queue_list.function.ts` | GET | `/api/moderation/queue` | `moderation_queue_list` | ✓ Stub |
| `moderation_cases_getById.function.ts` | GET | `/api/moderation/cases/{id}` | `moderation_cases_getById` | ✓ Stub |
| `moderation_cases_decide.function.ts` | POST | `/api/moderation/cases/{id}/decision` | `moderation_cases_decide` | ✓ Stub |

**Implementation Notes:**
- Queue: Filter by `status=pending`, require moderation permissions
- Get case: Fetch case + decision history, optionally target content
- Decide: Validate action (approve/reject/escalate), update case status, apply moderation action

---

### 7. Appeals Domain (3 functions)

**Directory:** `functions/src/appeals/` (New)

| Function | Method | Path | operationId | Status |
|----------|--------|------|-------------|--------|
| `appeals_create.function.ts` | POST | `/api/appeals` | `appeals_create` | ✓ Stub |
| `appeals_getById.function.ts` | GET | `/api/appeals/{id}` | `appeals_getById` | ✓ Stub |
| `appeals_vote.function.ts` | POST | `/api/appeals/{id}/votes` | `appeals_vote` | ✓ Stub |

**Index:** `functions/src/appeals/index.ts`

**Implementation Notes:**
- Create: Validate appeal eligibility, store in Cosmos `appeals` (PK `/id`)
- Get: Fetch appeal + votes from `votes` container, calculate tallies
- Vote: Validate vote (uphold/deny), calculate weight by reputation, update tallies

---

## Phase 2 (v2) Endpoints (Not Implemented)

Documented in **`functions/docs/TODO_v2_endpoints.md`**:

| Domain | Endpoints | Operations |
|--------|-----------|------------|
| Reputation | 3 | `reputation_me_get`, `reputation_history_get`, `reputation_events_ingest` |
| Search | 1 | `search_global_get` |
| Trending | 2 | `trending_posts_get`, `trending_topics_get` |
| Integrations | 2 | `integrations_feed_discover_get`, `integrations_feed_news_get` |
| Onboarding | 2 | `onboarding_invite_validate`, `onboarding_journalist_apply` |

**Total:** 10 v2 endpoints (all return TODO comments, no handlers generated)

---

## Integration Changes

### `functions/src/index.ts`
Updated to load new modules:
```typescript
trySyncImport('users', () => require('./users'));
trySyncImport('posts', () => require('./posts'));
trySyncImport('custom-feeds', () => require('./custom-feeds'));
trySyncImport('appeals', () => require('./appeals'));
```

### Domain Index Files
Updated to import OpenAPI handlers:
- `functions/src/auth/index.ts` → imports `auth_token_exchange.function`, `auth_token_refresh.function`
- `functions/src/feed/index.ts` → imports `feed_discover_get.function`, `feed_news_get.function`, `feed_user_get.function`
- `functions/src/moderation/index.ts` → imports `moderation_queue_list.function`, `moderation_cases_getById.function`, `moderation_cases_decide.function`

---

## Handler Pattern

All handlers follow this structure:

```typescript
import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { RequestType, ResponseType } from '@shared/types/openapi';

export const operation_id = httpHandler<RequestType, ResponseType>(async (ctx) => {
  ctx.context.log(`[operation_id] Description [${ctx.correlationId}]`);

  // TODO: Implement business logic
  // - Extract user ID from JWT (if auth required)
  // - Validate input
  // - Query/update Cosmos/PostgreSQL
  // - Return response

  return ctx.notImplemented('operation_id');
});

// Register HTTP trigger
app.http('operation_id', {
  methods: ['GET|POST|PATCH|DELETE'],
  authLevel: 'anonymous', // TODO: Change to 'function' + add middleware
  route: 'path/to/resource',
  handler: operation_id,
});
```

All handlers currently return:
```json
{
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "Operation 'operation_id' is not implemented yet",
    "correlationId": "uuid-v4"
  }
}
```
HTTP status: **501 Not Implemented**

---

## Validation Results

### TypeScript Compilation
```bash
$ npm run typecheck
✓ No errors
```

### OpenAPI Spec
```bash
$ redocly lint docs/openapi.yaml
✓ Your API description is valid. 🎉
0 errors, 0 warnings
```

---

## Next Steps

### 1. Implement Business Logic
Replace `ctx.notImplemented()` with actual implementations:
- Database queries (Cosmos DB, PostgreSQL)
- Authentication middleware (JWT verification)
- Authorization checks (role-based, ownership)
- Input validation (Joi, Zod)
- Pagination cursors (opaque encoding)
- Moderation pipelines (Hive AI, Azure Content Safety)

### 2. Add Middleware
- **requireAuth**: Extract and verify JWT, inject user ID into context
- **requireRoles**: Check user roles/reputation for moderation, admin endpoints
- **withRateLimit**: Apply rate limiting (already exists in repo)
- **CORS handling**: Integrate existing `handleCorsAndMethod` utility

### 3. Write Tests
For each handler:
- Unit tests: Mock Cosmos/PG, test business logic
- Integration tests: Test against live Cosmos emulator
- Contract tests: Validate against OpenAPI spec (Prism, Dredd)

### 4. Deploy and Monitor
- Deploy to Azure Functions Flex Consumption
- Monitor correlation IDs in Application Insights
- Track 501 responses to identify unimplemented operations

### 5. Implement Phase 2 (v2)
Refer to `functions/docs/TODO_v2_endpoints.md` for:
- Reputation system (XP, tiers, events)
- Search (Azure Cognitive Search integration)
- Trending (engagement-based ranking)
- Integrations (partner API keys)
- Onboarding (invite codes, journalist verification)

---

## Files Created

### Shared
- `functions/src/shared/types/openapi.ts`
- `functions/src/shared/http/handler.ts`

### Auth (2 files)
- `functions/src/auth/routes/auth_token_exchange.function.ts`
- `functions/src/auth/routes/auth_token_refresh.function.ts`

### Users (4 files)
- `functions/src/users/users_me_get.function.ts`
- `functions/src/users/users_me_update.function.ts`
- `functions/src/users/users_get_by_id.function.ts`
- `functions/src/users/index.ts`

### Posts (5 files)
- `functions/src/posts/posts_create.function.ts`
- `functions/src/posts/posts_get_by_id.function.ts`
- `functions/src/posts/posts_delete.function.ts`
- `functions/src/posts/posts_list_by_user.function.ts`
- `functions/src/posts/index.ts`

### Feed (3 files)
- `functions/src/feed/routes/feed_discover_get.function.ts`
- `functions/src/feed/routes/feed_news_get.function.ts`
- `functions/src/feed/routes/feed_user_get.function.ts`

### Custom Feeds (7 files)
- `functions/src/custom-feeds/customFeeds_list.function.ts`
- `functions/src/custom-feeds/customFeeds_create.function.ts`
- `functions/src/custom-feeds/customFeeds_getById.function.ts`
- `functions/src/custom-feeds/customFeeds_update.function.ts`
- `functions/src/custom-feeds/customFeeds_delete.function.ts`
- `functions/src/custom-feeds/customFeeds_getItems.function.ts`
- `functions/src/custom-feeds/index.ts`

### Moderation (3 files)
- `functions/src/moderation/routes/moderation_queue_list.function.ts`
- `functions/src/moderation/routes/moderation_cases_getById.function.ts`
- `functions/src/moderation/routes/moderation_cases_decide.function.ts`

### Appeals (4 files)
- `functions/src/appeals/appeals_create.function.ts`
- `functions/src/appeals/appeals_getById.function.ts`
- `functions/src/appeals/appeals_vote.function.ts`
- `functions/src/appeals/index.ts`

### Documentation
- `functions/docs/TODO_v2_endpoints.md`

### Modified Files
- `functions/src/index.ts` (added module imports)
- `functions/src/auth/index.ts` (added OpenAPI handlers)
- `functions/src/feed/index.ts` (added OpenAPI handlers)
- `functions/src/moderation/index.ts` (added OpenAPI handlers)

---

**Total Files Created:** 31  
**Total Files Modified:** 4  
**Total Lines of Code:** ~3,500 (including comments and TODO blocks)

---

## Acceptance Criteria ✓

- [x] All generated `.ts` files compile under `tsc` (0 errors)
- [x] Folder structure matches specified layout
- [x] Each v1 operation has a corresponding handler file
- [x] Handlers exported with correct `operationId` names
- [x] HTTP method and route configured in function metadata
- [x] `docs/openapi.yaml` unchanged
- [x] No business logic implemented (all return 501 stubs)
- [x] Summary document created with function counts and gaps

---

**Ready for business logic implementation.** 🚀
