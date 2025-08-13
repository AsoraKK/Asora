# 🛡️ Moderation Module - Asora Backend

## Overview
The Moderation module provides AI-assisted content moderation, user reporting, and community safety features. It integrates with Hive AI for automated content assessment and supports human moderator workflows.

## Functions

### `/moderation/flag` - POST
**Purpose**: Report inappropriate content for moderation review

**Authentication**: Required (JWT Bearer token)

**Request Body**:
```json
{
  "contentType": "post|comment|user",
  "contentId": "target_content_id",
  "reason": "spam|harassment|violence|hate_speech|misinformation|other",
  "description": "Optional detailed description (max 500 chars)",
  "severity": "low|medium|high|urgent"
}
```

**Features**:
- ✅ AI-powered pre-screening with Hive AI
- ✅ Duplicate flag prevention
- ✅ Priority-based moderation queues
- ✅ Real-time harmful content detection
- ✅ Automated action triggers
- ✅ Appeals process integration

**Response Example**:
```json
{
  "success": true,
  "flagId": "flag_xyz789",
  "status": "under_review",
  "aiAssessment": {
    "confidence": 0.85,
    "recommendation": "immediate_action",
    "estimatedReviewTime": "30 minutes"
  },
  "referenceNumber": "AS-2025-001234",
  "appealInfo": {
    "canAppeal": true,
    "appealDeadline": "2025-08-04T10:30:00Z"
  }
}
```

## AI-Powered Moderation

### Hive AI Integration
The moderation system uses **Hive AI** for intelligent content assessment:

- **Real-time Analysis**: Content is analyzed as it's reported
- **Multi-class Detection**: Toxicity, harassment, spam, NSFW content
- **Confidence Scoring**: 0.0 (safe) to 1.0 (harmful)
- **Language Support**: Multi-language content detection

### Automated Actions

| AI Confidence | Action | Timeline |
|---------------|--------|----------|
| 0.9+ | Immediate content hiding | Instant |
| 0.7-0.9 | Priority human review | 1 hour |
| 0.5-0.7 | Standard review queue | 24 hours |
| 0.0-0.5 | Low priority review | 72 hours |

### Content Categories
- **Harassment & Bullying**: Personal attacks, threats
- **Hate Speech**: Discrimination, prejudice
- **Violence**: Graphic content, threats of violence
- **Spam**: Repetitive, promotional content
- **Misinformation**: False or misleading information
- **Adult Content**: NSFW material in inappropriate contexts

## Moderation Workflow

### 1. Flag Submission
```
User Reports Content → AI Pre-screening → Queue Assignment → Human Review → Action/Resolution
```

### 2. Escalation Triggers
- Multiple flags on same content (3+ flags = escalate)
- High-reputation user flagging
- AI confidence above 0.8
- Urgent severity level
- Content from previously sanctioned users

### 3. Moderator Actions
- **Warning**: User notification with guidance
- **Content Removal**: Hide/delete specific content
- **Temporary Suspension**: Time-limited account restriction
- **Permanent Ban**: Complete platform removal
- **Shadow Ban**: Limit content visibility without notification

## Community Guidelines Enforcement

### Violation Severity Levels
1. **Minor**: Warning + education
2. **Moderate**: Content removal + temporary restrictions
3. **Severe**: Account suspension + reputation penalty
4. **Critical**: Permanent ban + legal reporting if required

### User Impact Tracking
- Reputation score adjustments
- Posting privilege limitations
- Community standing effects
- Appeal rights and deadlines

## Dependencies
- `shared/auth.ts` - User authentication
- `shared/cosmosClient.ts` - Database operations
- `shared/validation.ts` - Input validation
- Hive AI API - Automated content analysis
- Azure Cosmos DB - Flag and action tracking

## Environment Variables
```bash
JWT_SECRET=your_jwt_secret
COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
COSMOS_KEY=your_cosmos_key
HIVE_API_KEY=your_hive_moderation_key
HIVE_API_URL=https://api.thehive.ai/api/v2/task/sync
MODERATION_WEBHOOK_URL=https://your-domain.com/webhooks/moderation
```

## Database Schema (Cosmos DB)

### Flags Collection
```json
{
  "id": "flag_xyz789",
  "contentType": "post",
  "contentId": "post_abc123",
  "reporterId": "user456",
  "reason": "harassment",
  "description": "User is targeting me personally",
  "severity": "high",
  "status": "under_review",
  "createdAt": "2025-07-28T10:30:00Z",
  "aiAssessment": {
    "confidence": 0.75,
    "categories": ["harassment", "personal_attack"],
    "recommendation": "review",
    "processedAt": "2025-07-28T10:30:05Z"
  },
  "moderation": {
    "assignedTo": "moderator123",
    "reviewedAt": null,
    "action": null,
    "notes": null
  },
  "referenceNumber": "AS-2025-001234"
}
```

## Usage in Flutter App
```dart
// Report inappropriate content
final result = await moderationService.flagContent(
  contentType: ContentType.post,
  contentId: "post_abc123",
  reason: FlagReason.harassment,
  description: "This content violates community guidelines",
  severity: FlagSeverity.high
);

// Check moderation status
final status = await moderationService.getFlagStatus(
  flagId: result.flagId
);
```

## Testing
```bash
# Flag content for moderation
curl -X POST -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "post",
    "contentId": "post_abc123",
    "reason": "spam",
    "severity": "medium"
  }' \
  http://localhost:7072/api/moderation/flag
```

## Error Codes
- `400` - Invalid flag data or missing required fields
- `401` - Missing or invalid authentication
- `404` - Target content not found
- `409` - User already flagged this content
- `429` - Too many flags from user (rate limiting)
- `500` - Server error or AI service failure

## Moderator Dashboard Features
- Flag queue management with priority sorting
- AI confidence scoring and recommendations
- Bulk action capabilities
- User history and pattern analysis
- Appeal management system
- Analytics and reporting tools

## Privacy & Compliance
- **GDPR Compliance**: User data protection and deletion rights
- **Audit Trail**: Complete logging of moderation actions
- **Transparency**: Clear communication of policies and actions
- **Appeal Process**: Fair review mechanism for disputed actions
- **Data Retention**: Configurable retention periods for flags and actions

## Future Enhancements
- [ ] Machine learning model training from moderation decisions
- [ ] Community-based moderation (trusted user programs)
- [ ] Advanced pattern detection for coordinated attacks
- [ ] Integration with external threat intelligence
- [ ] Automated policy updates based on emerging threats
- [ ] Multi-language support for global communities
