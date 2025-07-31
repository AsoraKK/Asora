# Dynamic Moderation Configuration for Asora

## Overview

The `moderationConfig.ts` system enables real-time moderation rule updates without code deployment. Configuration is stored in Cosmos DB and cached for 5 minutes to optimize performance.

## Configuration Document Structure

Store in Cosmos DB collection `config` with document ID `moderation`:

```json
{
  "id": "moderation",
  "partitionKey": "moderation",
  "thresholds": {
    "safe": 0.3,
    "warned": 0.7,
    "blocked": 1.0
  },
  "visibility": {
    "showScorecardIfFlagged": true,
    "alwaysShowIfOptedIn": true,
    "showOnRequest": true
  },
  "appeal": {
    "autoHide": 0.9,
    "appealWindowDays": 7,
    "reviewWindowMinutes": 5,
    "voteThresholdPercent": 60
  },
  "charLimits": {
    "post": 2000,
    "comment": 600,
    "aiDetectionThreshold": 250
  },
  "categories": [
    "nudity",
    "violence", 
    "hate",
    "self_harm",
    "sexual_activity",
    "graphic",
    "spam"
  ],
  "categoryThresholds": {
    "violence": 0.2,
    "hate": 0.1,
    "nudity": 0.4,
    "spam": 0.6
  },
  "updatedAt": "2025-07-28T19:30:00Z",
  "updatedBy": "admin@asora.co.za"
}
```

## Usage Examples

### 1. Stricter Hate Speech Detection
```json
{
  "categoryThresholds": {
    "hate": 0.05,
    "violence": 0.15
  }
}
```

### 2. Relaxed Content for Premium Users
```json
{
  "thresholds": {
    "safe": 0.4,
    "warned": 0.8,
    "blocked": 1.2
  }
}
```

### 3. Emergency Lockdown Mode
```json
{
  "thresholds": {
    "safe": 0.1,
    "warned": 0.2,
    "blocked": 0.3
  },
  "charLimits": {
    "post": 500,
    "comment": 200,
    "aiDetectionThreshold": 50
  }
}
```

## Benefits

- **Real-time Updates**: No code deployment needed for policy changes
- **A/B Testing**: Test different thresholds for user segments
- **Emergency Response**: Quickly tighten moderation during incidents
- **Performance**: 5-minute caching reduces Cosmos DB calls
- **Fallback Safety**: Automatically uses policy.ts if DB is unreachable

## Admin Interface Integration

The dynamic configuration supports building admin dashboards that can:

1. **Live Preview**: Show how threshold changes affect existing content
2. **Scheduled Updates**: Apply stricter rules during high-traffic periods
3. **Category Management**: Fine-tune detection for specific content types
4. **Appeal Analytics**: Adjust voting thresholds based on community feedback

## GitHub Copilot Benefits

With this system, Copilot can generate:

- **Context-aware moderation logic** that respects dynamic thresholds
- **Admin override functions** for emergency content management
- **Tier-aware visibility enforcement** based on user subscription level
- **Appeal workflow automation** with configurable voting mechanisms

## Hive AI Integration

The system integrates with **Hive AI** through `shared/hiveClient.ts`:

### Enhanced Response Format
```typescript
{
  score: 0.65,                    // Overall safety score
  decision: "warn",               // approve | warn | block
  categories: {                   // Category breakdown
    "hate": 0.12,
    "violence": 0.05,
    "nudity": 0.02
  },
  triggeredRules: [               // Rules that fired
    "hate: 0.12 > 0.1"
  ],
  raw: { /* Full Hive response */ }
}
```

### Environment Variables
- `HIVE_TEXT_KEY`: Text classification API key
- `HIVE_IMAGE_KEY`: Image moderation API key (future)
- `HIVE_DEEPFAKE_KEY`: AI-generated detection key (future)

### Category-Specific Thresholds
```json
{
  "categoryThresholds": {
    "hate": 0.1,        // Stricter hate detection
    "violence": 0.2,    // Moderate violence threshold
    "nudity": 0.4,      // Relaxed nudity for art/education
    "spam": 0.6         // Balanced spam detection
  }
}
```

### Appeal and Transparency Features
- **Detailed Logging**: All scores and categories stored for appeals
- **Rule Transparency**: Users can see which rules triggered moderation
- **Category Breakdown**: Fine-grained understanding of content issues
- **Decision Tracking**: Complete audit trail for moderation decisions
