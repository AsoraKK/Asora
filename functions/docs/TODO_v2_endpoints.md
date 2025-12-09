# Phase 2 (v2) Endpoints - TODO

This document lists OpenAPI operations that are **defined in the spec** but **not yet implemented** as Azure Functions. These endpoints are marked as "v2/future" and will be implemented in Phase 2.

## Summary

- **10 v2 endpoints** defined in `docs/openapi.yaml`
- **0 implemented** (all pending Phase 2)
- Domains: Reputation, Search, Trending, Integrations, Onboarding

---

## Reputation Domain (3 endpoints)

### 1. `reputation_me_get`
- **Method:** GET
- **Path:** `/api/reputation/me`
- **Summary:** XP totals, current tier, and breakdown
- **Description:** Fetch reputation overview from PostgreSQL snapshots
- **Request:** None
- **Response:** `ReputationOverview`
- **Implementation Notes:**
  - Query PostgreSQL `reputation_snapshots` table
  - Calculate XP total, current tier, privileges
  - Return breakdown by source (posts, moderation, appeals)

### 2. `reputation_history_get`
- **Method:** GET
- **Path:** `/api/reputation/history`
- **Summary:** Paginated XP event history
- **Description:** Cursor-based listing for client leaderboards
- **Request:** Query params (cursor, limit)
- **Response:** `ReputationHistoryResponse` (cursor-paginated)
- **Implementation Notes:**
  - Query Cosmos `reputation_events` container or PostgreSQL event log
  - Apply cursor-based pagination
  - Return events with (action, xpDelta, timestamp, source)

### 3. `reputation_events_ingest`
- **Method:** POST
- **Path:** `/api/reputation/events`
- **Summary:** Internal ingestion for XP events
- **Description:** Internal-only endpoint for recording XP deltas
- **Request:** `ReputationEventRequest` (action, xpDelta, userId, source)
- **Response:** `ReputationEvent` (202 Accepted)
- **Implementation Notes:**
  - Validate event data
  - Store in Cosmos `reputation_events` container
  - Trigger background worker to update user XP totals
  - Not publicly exposed (internal service-to-service only)

---

## Search Domain (1 endpoint)

### 4. `search_global_get`
- **Method:** GET
- **Path:** `/api/search`
- **Summary:** Global search across posts and users
- **Description:** Full-text search with type and timeframe filters
- **Request:** Query params (query, types, timeframe, cursor, limit)
- **Response:** `SearchResponse` (ranked results)
- **Implementation Notes:**
  - Integrate with Azure Cognitive Search or Cosmos full-text search
  - Support types: `post`, `user`
  - Apply timeframe filters (24h, 7d, 30d)
  - Return ranked results with relevance scores
  - Cursor-based pagination

---

## Trending Domain (2 endpoints)

### 5. `trending_posts_get`
- **Method:** GET
- **Path:** `/api/trending/posts`
- **Summary:** Trending posts for requested timeframe
- **Description:** Hot posts based on engagement velocity
- **Request:** Query params (timeframe, categories, cursor, limit)
- **Response:** `TrendingResponse` (cursor-paginated posts)
- **Implementation Notes:**
  - Calculate trending score: (likes + comments) / age_hours
  - Apply timeframe filter (24h, 7d, 30d)
  - Optionally filter by categories
  - Return posts with engagement metrics

### 6. `trending_topics_get`
- **Method:** GET
- **Path:** `/api/trending/topics`
- **Summary:** Trending topic list
- **Description:** Popular topics by usage frequency
- **Request:** Query params (timeframe, categories, cursor, limit)
- **Response:** `TrendingResponse` (cursor-paginated topics)
- **Implementation Notes:**
  - Aggregate topic mentions from recent posts
  - Calculate trending score by frequency and recency
  - Return topic names with post counts

---

## Integrations Domain (2 endpoints)

### 7. `integrations_feed_discover_get`
- **Method:** GET
- **Path:** `/api/integrations/feed/discover`
- **Summary:** External discover feed for partners
- **Description:** Partner-gated discover feed access
- **Request:** Query params (partnerId) + header (X-Partner-ApiKey)
- **Response:** `PartnerFeedResponse`
- **Implementation Notes:**
  - Validate `X-Partner-ApiKey` header
  - Verify `partnerId` in allow-list
  - Return standard discover feed with partner attribution
  - Rate limit by partner

### 8. `integrations_feed_news_get`
- **Method:** GET
- **Path:** `/api/integrations/feed/news`
- **Summary:** External news feed for partners
- **Description:** Partner-gated news feed access
- **Request:** Query params (partnerId) + header (X-Partner-ApiKey)
- **Response:** `PartnerFeedResponse`
- **Implementation Notes:**
  - Validate `X-Partner-ApiKey` header
  - Verify `partnerId` in allow-list
  - Return standard news feed with partner attribution
  - Rate limit by partner

---

## Onboarding Domain (2 endpoints)

### 9. `onboarding_invite_validate`
- **Method:** POST
- **Path:** `/api/auth/onboarding/invite`
- **Summary:** Validate invite codes and surface tier grants
- **Description:** Check invite code validity and return tier metadata
- **Request:** `InviteCodeRequest` (code)
- **Response:** `InviteCodeResponse` (tier, metadata)
- **Implementation Notes:**
  - Query PostgreSQL `invite_codes` table (if exists)
  - Verify code is valid, not expired, and not already redeemed
  - Return tier grant info (e.g., "premium", "journalist")
  - Mark code as pending redemption

### 10. `onboarding_journalist_apply`
- **Method:** POST
- **Path:** `/api/auth/onboarding/journalist-application`
- **Summary:** Submit journalist application data
- **Description:** Apply for journalist verification
- **Request:** `JournalistApplicationRequest` (credentials, portfolio, etc.)
- **Response:** `JournalistApplicationResponse` (202 Accepted)
- **Implementation Notes:**
  - Validate application data (portfolio URL, credentials, bio)
  - Store in PostgreSQL `journalist_verifications` table
  - Set status = 'pending'
  - Trigger admin notification for review
  - Return application ID for tracking

---

## Implementation Priority

1. **Reputation** (foundation for moderation, appeals, custom feeds tier limits)
2. **Search** (core discovery feature)
3. **Trending** (engagement-driven discovery)
4. **Integrations** (partner enablement, low priority)
5. **Onboarding** (invite system, journalist verification)

---

## Next Steps

When implementing Phase 2:

1. **Create function files** following the same pattern as v1:
   - `functions/src/reputation/reputation_me_get.function.ts`
   - `functions/src/search/search_global_get.function.ts`
   - etc.

2. **Define missing types** in `shared/types/openapi.ts`:
   - `ReputationOverview`
   - `ReputationHistoryResponse`
   - `ReputationEventRequest`
   - `ReputationEvent`
   - `SearchResponse`
   - `TrendingResponse`
   - `PartnerFeedResponse`
   - `InviteCodeRequest`
   - `InviteCodeResponse`
   - `JournalistApplicationRequest`
   - `JournalistApplicationResponse`

3. **Update database schemas**:
   - PostgreSQL: `reputation_snapshots`, `journalist_verifications`, `invite_codes`
   - Cosmos: `reputation_events` container (optional)

4. **Wire up index.ts** with new modules:
   ```typescript
   trySyncImport('reputation', () => require('./reputation'));
   trySyncImport('search', () => require('./search'));
   trySyncImport('trending', () => require('./trending'));
   trySyncImport('integrations', () => require('./integrations'));
   trySyncImport('onboarding', () => require('./onboarding'));
   ```

5. **Implement business logic** (currently all stubs return 501 NOT_IMPLEMENTED)

---

**OpenAPI Spec Version:** 1.0.0  
**Last Updated:** 2025-12-09
