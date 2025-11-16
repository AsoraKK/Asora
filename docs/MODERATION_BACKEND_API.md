# Moderation Backend API Specification

**Status:** Expected contracts - verification needed against actual Azure Functions implementation  
**Frontend Integration:** `lib/features/moderation/application/moderation_service.dart`

## Overview

This document specifies the expected HTTP API contracts for the moderation console backend. The Flutter frontend (ModerationService) expects these endpoints to be implemented by Azure Functions under the `/moderation/*` path.

## Authentication

All endpoints require JWT bearer token authentication via `Authorization: Bearer <token>` header.

## Role Authorization

Moderation console endpoints require:
- **User role:** `moderator` or `admin` (enum: `UserRole.moderator`, `UserRole.admin`)
- **Feature flag:** `ENABLE_MODERATION_CONSOLE` must be true (optional, for additional gating)

Frontend enforces access control via `ModeratorGuard` widget.

---

## Endpoints

### 1. Get Moderation Queue

**Purpose:** Retrieve paginated, filterable list of content items awaiting moderation review.

**Endpoint:** `GET /moderation/review-queue`

**Query Parameters:**
```typescript
{
  page?: number;           // Page number (0-indexed)
  limit?: number;          // Items per page (default: 50)
  types?: string[];        // Filter: ['post', 'comment', 'report', 'appeal']
  severities?: string[];   // Filter: ['low', 'medium', 'high', 'critical']
  ageRange?: string;       // Filter: 'last24h', 'last7d', 'last30d', 'all'
  queue?: string;          // Filter: 'standard', 'high-priority', 'escalated', 'review', 'resolved'
}
```

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "string",
      "itemType": "post | comment | report | appeal",
      "severity": "low | medium | high | critical",
      "reportCount": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "queueType": "standard | high-priority | escalated | review | resolved",
      "contentSnippet": "string",
      "reporterIds": ["string"],
      "assignedModerators": ["string"],
      "aiSignals": {
        "toxicity": 0.0,
        "spam": 0.0,
        "harassment": 0.0,
        "hateSpeech": 0.0
      }
    }
  ],
  "total": 0,
  "page": 0,
  "limit": 50,
  "hasMore": false
}
```

---

### 2. Get Moderation Case

**Purpose:** Retrieve detailed case information including reports, AI signals, audit trail, and appeal details.

**Endpoint:** `GET /moderation/cases/:caseId`

**Path Parameters:**
- `caseId` (string, required): Unique identifier for the moderation case

**Response:** `200 OK`
```json
{
  "id": "string",
  "itemType": "post | comment | report | appeal",
  "contentId": "string",
  "contentText": "string",
  "contentAuthorId": "string",
  "contentAuthorUsername": "string",
  "contentCreatedAt": "2024-01-01T00:00:00.000Z",
  "queueType": "standard | high-priority | escalated | review | resolved",
  "severity": "low | medium | high | critical",
  "status": "pending | under_review | resolved | escalated",
  "currentModerator": "string?",
  "assignedAt": "2024-01-01T00:00:00.000Z?",
  "reports": [
    {
      "id": "string",
      "reporterId": "string",
      "reporterUsername": "string",
      "reason": "string",
      "description": "string",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "aiSignals": {
    "toxicity": 0.0,
    "spam": 0.0,
    "harassment": 0.0,
    "hateSpeech": 0.0,
    "violenceOrGore": 0.0,
    "sexualContent": 0.0,
    "languageQuality": 0.0,
    "recommendations": ["string"]
  },
  "appealDetails": {
    "appealId": "string",
    "appealType": "content_removal | account_suspension | content_flagged",
    "appealReason": "string",
    "userStatement": "string",
    "submittedAt": "2024-01-01T00:00:00.000Z",
    "urgencyScore": 0
  }?,
  "previousDecisions": [
    {
      "id": "string",
      "moderatorId": "string",
      "moderatorUsername": "string",
      "action": "approve | reject | escalate | request_info",
      "reason": "string",
      "notes": "string",
      "decidedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "metadata": {
    "viewCount": 0,
    "interactionCount": 0,
    "reportPatternScore": 0.0,
    "userHistoryFlags": 0
  }
}
```

---

### 3. Submit Moderation Decision

**Purpose:** Submit moderator's decision (approve/reject/escalate/request_info) on a case.

**Endpoint:** `POST /moderation/cases/:caseId/decision`

**Path Parameters:**
- `caseId` (string, required): Case identifier

**Request Body:**
```json
{
  "action": "approve | reject | escalate | request_info",
  "reason": "string",
  "notes": "string?",
  "metadata": {
    "confidenceLevel": "low | medium | high",
    "reviewDurationSeconds": 0
  }?
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "decision": {
    "id": "string",
    "caseId": "string",
    "moderatorId": "string",
    "action": "approve | reject | escalate | request_info",
    "reason": "string",
    "notes": "string?",
    "decidedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 4. Escalate Case

**Purpose:** Escalate a case to a different queue (e.g., high-priority, admin review).

**Endpoint:** `POST /moderation/cases/:caseId/escalate`

**Path Parameters:**
- `caseId` (string, required): Case identifier

**Request Body:**
```json
{
  "targetQueue": "high-priority | escalated | admin-review",
  "reason": "string",
  "priority": "low | medium | high | critical",
  "notes": "string?"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "caseId": "string",
  "newQueue": "string",
  "escalatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 5. Get Case Audit Trail

**Purpose:** Retrieve chronological audit trail for a specific case (moderator actions, status changes).

**Endpoint:** `GET /moderation/cases/:caseId/audit`

**Path Parameters:**
- `caseId` (string, required): Case identifier

**Response:** `200 OK`
```json
{
  "entries": [
    {
      "id": "string",
      "caseId": "string",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "eventType": "case_created | assigned | decision_made | escalated | status_changed | comment_added",
      "actorId": "string",
      "actorUsername": "string",
      "actorRole": "system | moderator | admin",
      "details": {
        "action": "string?",
        "reason": "string?",
        "previousValue": "string?",
        "newValue": "string?"
      },
      "metadata": {}
    }
  ]
}
```

---

### 6. Search Audit Logs

**Purpose:** Search across all moderation audit logs with filters (moderator activity monitoring).

**Endpoint:** `GET /moderation/audit`

**Query Parameters:**
```typescript
{
  moderatorId?: string;      // Filter by moderator
  caseId?: string;           // Filter by case
  eventType?: string;        // Filter by event type
  startDate?: string;        // ISO 8601 datetime
  endDate?: string;          // ISO 8601 datetime
  page?: number;             // Page number
  limit?: number;            // Items per page
}
```

**Response:** `200 OK`
```json
{
  "entries": [
    // Same structure as case audit entries
  ],
  "total": 0,
  "page": 0,
  "limit": 50,
  "hasMore": false
}
```

---

### 7. Get My Appeals (User-facing)

**Purpose:** Retrieve current user's submitted appeals (not moderation console, but used by appeal submission flow).

**Endpoint:** `GET /api/getMyAppeals`

**Response:** `200 OK`
```json
{
  "success": true,
  "appeals": [
    {
      "appealId": "string",
      "contentId": "string",
      "contentType": "post | comment",
      "appealType": "content_removal | account_suspension | content_flagged",
      "appealReason": "string",
      "userStatement": "string",
      "status": "pending | under_review | approved | denied",
      "submittedAt": "2024-01-01T00:00:00.000Z",
      "resolvedAt": "2024-01-01T00:00:00.000Z?",
      "urgencyScore": 0,
      "moderatorResponse": "string?"
    }
  ]
}
```

---

### 8. Submit Appeal (User-facing)

**Purpose:** User submits an appeal for moderated content.

**Endpoint:** `POST /api/appealContent`

**Request Body:**
```json
{
  "contentId": "string",
  "contentType": "post | comment",
  "appealType": "content_removal | account_suspension | content_flagged",
  "appealReason": "string",
  "userStatement": "string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "appeal": {
    "appealId": "string",
    "contentId": "string",
    "status": "pending",
    "submittedAt": "2024-01-01T00:00:00.000Z",
    "urgencyScore": 0
  }
}
```

---

## Error Responses

All endpoints should follow consistent error response format:

**HTTP 400 Bad Request**
```json
{
  "success": false,
  "message": "Invalid request parameters",
  "code": "INVALID_PARAMETERS"
}
```

**HTTP 401 Unauthorized**
```json
{
  "success": false,
  "message": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**HTTP 403 Forbidden**
```json
{
  "success": false,
  "message": "Insufficient permissions (requires moderator role)",
  "code": "FORBIDDEN"
}
```

**HTTP 404 Not Found**
```json
{
  "success": false,
  "message": "Case not found",
  "code": "NOT_FOUND"
}
```

**HTTP 500 Internal Server Error**
```json
{
  "success": false,
  "message": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

---

## Frontend Exception Handling

The `ModerationService` throws `ModerationException` on failures with:
- `message` (string): User-facing error message
- `code` (string): Error code for programmatic handling
- `originalError` (dynamic): Original exception for debugging

Example:
```dart
throw ModerationException(
  'Failed to fetch moderation queue',
  code: 'QUEUE_FETCH_FAILED',
  originalError: dioException,
);
```

---

## Observability

All repository methods are wrapped with `AsoraTracer.traceRepository()` for:
- Distributed tracing
- Performance monitoring
- Error tracking
- Operation duration metrics

Frontend logs all moderation actions via `ModerationTelemetry.logModerationAction()` with:
- Action type (view, decision, escalate)
- Case ID
- Moderator ID
- Timestamp
- No PII (Personally Identifiable Information)

---

## Verification Checklist

**Backend Implementation Status:** ⏳ Pending verification

To verify backend implementation:

1. **Endpoint Availability:**
   - [ ] `GET /moderation/review-queue`
   - [ ] `GET /moderation/cases/:caseId`
   - [ ] `POST /moderation/cases/:caseId/decision`
   - [ ] `POST /moderation/cases/:caseId/escalate`
   - [ ] `GET /moderation/cases/:caseId/audit`
   - [ ] `GET /moderation/audit`
   - [ ] `GET /api/getMyAppeals`
   - [ ] `POST /api/appealContent`

2. **Authentication & Authorization:**
   - [ ] JWT bearer token validation
   - [ ] Role-based access control (moderator/admin)
   - [ ] 401/403 responses for unauthorized access

3. **Request/Response Contracts:**
   - [ ] Query parameters match specification
   - [ ] Request body schemas match specification
   - [ ] Response schemas match specification
   - [ ] Consistent error response format

4. **Data Integrity:**
   - [ ] AI signals present and accurate
   - [ ] Appeal urgency scores calculated correctly
   - [ ] Audit trail captures all moderator actions
   - [ ] Timestamps in ISO 8601 format

5. **Performance:**
   - [ ] Pagination works for large datasets
   - [ ] Filter queries perform efficiently
   - [ ] Response times under 1 second for typical queries

---

## Related Documentation

- **Frontend Implementation:** `lib/features/moderation/application/moderation_service.dart`
- **Domain Models:** `lib/features/moderation/domain/*.dart`
- **UI Components:** `lib/features/moderation/presentation/`
- **Access Control:** `lib/features/moderation/presentation/widgets/moderator_guard.dart`
- **CEO Policy on Urgency Scores:** See `lib/features/moderation/presentation/widgets/urgency_indicator.dart` (numeric scores shown to appeal submitters only)

---

**Last Updated:** 2025-01-16  
**Maintained By:** Asora Engineering Team
