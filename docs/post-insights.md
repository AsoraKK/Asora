# Post Insights API & Feature

**Feature Summary**: Author-only transparency into moderation decisions, without exposing raw signals or thresholds.

---

## API Endpoint

### `GET /api/posts/{postId}/insights`

Returns sanitized moderation insights for a specific post.

#### Authorization

- **Authentication**: Required (JWT bearer token)
- **Authorization**: Must be either:
  - The **post author** (post.authorId === userId), OR
  - A user with **admin** role

#### Response Codes

| Status | Description |
|--------|-------------|
| 200 | Success - returns insights payload |
| 401 | Unauthorized - missing or invalid token |
| 403 | Forbidden - not author and not admin |
| 404 | Not Found - post doesn't exist or was deleted |

#### Response Payload (`PostInsightsResponse`)

```json
{
  "postId": "abc-123",
  "riskBand": "LOW",
  "decision": "ALLOW",
  "reasonCodes": ["HIVE_SCORE_UNDER_THRESHOLD"],
  "configVersion": 5,
  "decidedAt": "2025-01-10T14:30:00.000Z",
  "appeal": {
    "status": "APPROVED",
    "updatedAt": "2025-01-12T09:00:00.000Z"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `postId` | string | The post ID |
| `riskBand` | `LOW` \| `MEDIUM` \| `HIGH` | Aggregated risk level |
| `decision` | `ALLOW` \| `QUEUE` \| `BLOCK` | Moderation decision made |
| `reasonCodes` | string[] | Category-level reason codes (sanitized) |
| `configVersion` | number | Moderation config version used |
| `decidedAt` | ISO 8601 string | When the decision was made |
| `appeal` | object | Appeal status if applicable |
| `appeal.status` | `NONE` \| `PENDING` \| `APPROVED` \| `REJECTED` | Current appeal state |
| `appeal.updatedAt` | ISO 8601 string? | When appeal was last updated |

#### Risk Band Mapping

| Moderation Decision | Risk Band |
|--------------------|-----------|
| `BLOCK` | `HIGH` |
| `QUEUE` | `MEDIUM` |
| `ALLOW` | `LOW` |
| Unknown/null | `MEDIUM` (default) |

---

## What Is NOT Returned

The following fields are **explicitly excluded** to prevent gaming the moderation system:

- `score` / `scores` - Raw numeric scores
- `threshold` / `thresholds` - Score thresholds
- `probability` / `probabilities` - Classification probabilities
- `confidence` - Confidence values
- `severity` - Severity ratings
- `rawResponse` - Upstream provider responses
- `hiveScore` / `azureScore` - Provider-specific scores

Only category-level reason codes (e.g., `HIVE_SCORE_UNDER_THRESHOLD`) are returned.

---

## Flutter UI

The insights panel is displayed on the Post Card for the post author only.

### Component: `PostInsightsPanel`

Location: `lib/features/feed/presentation/post_insights_panel.dart`

#### Behavior

| API Response | UI Behavior |
|--------------|-------------|
| 200 Success | Shows panel with risk band chip, config version, appeal status |
| 403 Forbidden | Renders nothing (`SizedBox.shrink()`) |
| 404 Not Found | Renders nothing |
| Error | Renders nothing |
| Loading | Shows skeleton with `LinearProgressIndicator` |

#### Risk Band Styling

| Band | Color |
|------|-------|
| LOW | Green (`Colors.green`) |
| MEDIUM | Orange (`Colors.orange`) |
| HIGH | Red (`Colors.red`) |

### Provider: `postInsightsProvider`

Location: `lib/features/feed/application/post_insights_providers.dart`

```dart
final postInsightsProvider = FutureProvider.autoDispose.family<InsightsResult, String>(...);
```

- Uses `autoDispose` for memory efficiency
- Watches `tokenVersionProvider` to invalidate on auth changes
- Returns sealed `InsightsResult` type:
  - `InsightsSuccess(PostInsights)` - data loaded
  - `InsightsAccessDenied()` - 403
  - `InsightsNotFound()` - 404
  - `InsightsError(String message)` - other errors

---

## Running Tests

### Backend Tests (Jest)

```bash
cd functions && npm test -- --testPathPattern="posts/(insights|posts_get_insights)"
```

Expected: 32 tests passing (18 unit + 14 route tests)

### Flutter Tests

```bash
flutter test test/features/feed/domain/post_insights_test.dart
flutter test test/features/feed/presentation/post_insights_panel_test.dart
```

Expected: 21 domain tests + 9 widget tests passing

---

## Manual Verification

1. **As post author**: View your own post → Insights panel should appear with risk band
2. **As admin**: View any post → Insights panel should appear
3. **As other user**: View someone else's post → No Insights panel visible
4. **Unauthenticated**: API returns 401

### Check no forbidden fields leak

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/posts/{postId}/insights | jq 'keys'
```

Expected keys: `postId`, `riskBand`, `decision`, `reasonCodes`, `configVersion`, `decidedAt`, `appeal`

Should NOT contain: `score`, `threshold`, `probability`, `confidence`, `severity`

---

## Files Changed

### Backend
- `functions/src/posts/service/insightsService.ts` - Core service
- `functions/src/posts/posts_get_insights.function.ts` - HTTP handler
- `functions/src/posts/index.ts` - Export wiring
- `functions/tests/posts/insights.test.ts` - Unit tests
- `functions/tests/posts/posts_get_insights.route.test.ts` - Route tests

### Flutter
- `lib/features/feed/domain/post_insights.dart` - Domain model
- `lib/features/feed/application/post_insights_providers.dart` - Riverpod providers
- `lib/features/feed/presentation/post_insights_panel.dart` - UI widget
- `lib/widgets/post_card.dart` - Integration point
- `test/features/feed/domain/post_insights_test.dart` - Model tests
- `test/features/feed/presentation/post_insights_panel_test.dart` - Widget tests
