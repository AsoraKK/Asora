# Cosmos container contracts

This document enumerates the Cosmos containers that back Asora's social, moderation, and custom-feed surfaces. Partition keys reference ADR 002 while tuning names to match the API contracts; TTL is disabled unless explicitly stated.

## posts
- **Partition key**: `/authorId`
- **Purpose**: Stores the canonical post projection consumed by all feeds. `isNews`, `authorRole`, and `clusterId` allow the hybrid news surface to mark sourced journalists/contributors and group story clusters for traceability.

```jsonc
{
  "id": "post::3f5b5d7e-001",
  "authorId": "user::d90f3c8a-007",
  "partitionKey": "user::d90f3c8a-007",
  "content": {
    "text": "New fact-checking initiative is live.",
    "mediaUrls": [],
    "attachments": {}
  },
  "topicIds": ["topic::global-news"],
  "visibility": "public",
  "contentType": "text",
  "createdAt": "2024-11-01T12:00:00Z",
  "updatedAt": "2024-11-01T12:05:00Z",
  "score": 92,
  "likeCount": 312,
  "commentCount": 48,
  "shareCount": 63,
  "authorRole": "journalist",
  "isNews": true,
  "clusterId": "cluster::climate",
  "metadata": {
    "verifiedStream": "hybrid-news"
  }
}
```

## comments
- **Partition key**: `/postId`
- **Purpose**: Thread-level projection for each post.

```jsonc
{
  "id": "comment::a1c2b3d4",
  "postId": "post::3f5b5d7e-001",
  "partitionKey": "post::3f5b5d7e-001",
  "authorId": "user::b2a04621",
  "content": "Thanks for the breakdown!",
  "createdAt": "2024-11-01T12:02:00Z",
  "visibility": "public"
}
```

## likes
- **Partition key**: `/contentId`
- **Purpose**: Aggregates per-content engagement.

```jsonc
{
  "id": "like::8b7c6d5e",
  "contentId": "post::3f5b5d7e-001",
  "partitionKey": "post::3f5b5d7e-001",
  "userId": "user::577a9b13",
  "createdAt": "2024-11-01T12:03:00Z"
}
```

## flags
- **Partition key**: `/targetId`
- **Purpose**: Moderation triage per flagged asset.

```jsonc
{
  "id": "flag::c3d4e5f6",
  "targetId": "post::3f5b5d7e-001",
  "partitionKey": "post::3f5b5d7e-001",
  "reporterId": "user::0a1b2c3d",
  "reason": "misinformation",
  "details": "Claim lacks source citations.",
  "createdAt": "2024-11-01T12:04:00Z"
}
```

## appeals
- **Partition key**: `/id`
- **Purpose**: Stores appeal documents keyed by appeal id so votes can reference stable identifiers.

```jsonc
{
  "id": "appeal::f8e7d6c5",
  "caseId": "case::0162",
  "contentId": "post::3f5b5d7e-001",
  "partitionKey": "appeal::f8e7d6c5",
  "authorId": "user::d90f3c8a-007",
  "statement": "Requesting a second review with supporting docs.",
  "evidenceUrls": ["https://asora.app/evidence/123"],
  "status": "pending",
  "createdAt": "2024-11-01T12:10:00Z"
}
```

## votes
- **Partition key**: `/appealId`
- **Purpose**: Aggregates community votes per appeal, weighted by reputation.

```jsonc
{
  "id": "vote::11223344",
  "appealId": "appeal::f8e7d6c5",
  "partitionKey": "appeal::f8e7d6c5",
  "userId": "user::99887766",
  "vote": "approve",
  "weight": 1.8,
  "createdAt": "2024-11-01T12:12:00Z"
}
```

## moderation_decisions
- **Partition key**: `/itemId`
- **Purpose**: Decisions mirror moderated content; storing them separately simplifies audit trails and avoids re-scanning appeals lumen.

```jsonc
{
  "id": "decision::0176",
  "itemId": "post::3f5b5d7e-001",
  "partitionKey": "post::3f5b5d7e-001",
  "caseId": "case::0162",
  "userId": "user::aabbccdd",
  "action": "remove",
  "rationale": "Violates authenticity policy.",
  "createdAt": "2024-11-01T12:06:00Z",
  "expiresAt": "2024-11-08T12:06:00Z"
}
```

## config
- **Partition key**: `/partitionKey`
- **Purpose**: Stores keyed config (e.g., moderation thresholds, feed tuning) shared across consumers.

```jsonc
{
  "id": "moderation",
  "partitionKey": "moderation",
  "version": 12,
  "updatedAt": "2025-12-27T10:15:30.123Z",
  "updatedBy": "admin@asora.co.za",
  "payload": {
    "schemaVersion": 1,
    "moderation": {
      "temperature": 0.2,
      "hiveAutoFlagThreshold": 0.85,
      "hiveAutoRemoveThreshold": 0.95,
      "enableAutoModeration": true,
      "enableAzureContentSafety": true
    },
    "featureFlags": {
      "appealsEnabled": true,
      "communityVotingEnabled": true,
      "pushNotificationsEnabled": true,
      "maintenanceMode": false
    }
  }
}
```

## custom_feeds
- **Partition key**: `/ownerId`
- **Purpose**: Each document defines the three-layer filter set that selectors execute when building custom feeds.
- **Note**: `isHome` lets the client nominate a single feed as their default home view.

```jsonc
{
  "id": "custom::55aa33bb",
  "ownerId": "user::d90f3c8a-007",
  "partitionKey": "user::d90f3c8a-007",
  "name": "Morning Signals",
  "contentType": "text",
  "sorting": "relevant",
  "includeKeywords": ["verification", "press"],
  "excludeKeywords": ["rumor"],
  "includeAccounts": ["user::7b7c7d7e"],
  "excludeAccounts": [],
  "isHome": true,
  "createdAt": "2024-10-01T06:00:00Z",
  "updatedAt": "2024-10-01T06:00:00Z"
}
```

## users (Cosmos projection)
- **Partition key**: `/id`
- **Purpose**: Mirrors public profile, preferences, and settings for fast feed joins.

```jsonc
{
  "id": "user::d90f3c8a-007",
  "partitionKey": "user::d90f3c8a-007",
  "profile": {
    "displayName": "Asora Newsroom",
    "handle": "@asora",
    "avatarUrl": "https://assets.asora.app/avatar.png",
    "bio": "Authenticity-first newsroom.",
    "preferences": {
      "language": "en",
      "timezone": "UTC",
      "allowPersonalizedNews": true,
      "notificationChannels": ["email", "push"]
    },
    "badges": ["journalist", "verified"]
  },
  "settings": {
    "feedSort": "relevant",
    "mutedTopics": []
  },
  "updatedAt": "2024-11-01T12:15:00Z"
}
```
