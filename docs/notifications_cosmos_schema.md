# Cosmos DB Schema for Notifications Subsystem

## Overview

The notifications subsystem uses 4 Cosmos DB containers, all partitioned by `userId` for optimal query performance and scalability.

## Containers

### 1. `notification_events`

**Purpose**: Event queue for pending/failed notification dispatch  
**Partition Key**: `/userId`  
**TTL**: 30 days (events auto-expire after processing)

**Schema**:
```json
{
  "id": "uuid-v4",
  "userId": "string (partition key)",
  "eventType": "POST_LIKE | POST_COMMENT | POST_SHARE | COMMENT_REPLY | FOLLOWER_NEW | SAFETY_CONTENT_FLAGGED | SAFETY_ACCOUNT_WARNING | SECURITY_NEW_DEVICE | SECURITY_PASSWORD_CHANGED | SECURITY_ACCOUNT_LOCKED | NEWS_SYSTEM_UPDATE | MARKETING_PROMOTION",
  "category": "SOCIAL | SAFETY | SECURITY | NEWS | MARKETING",
  "payload": {
    "actorId": "string?",
    "actorName": "string?",
    "targetId": "string",
    "targetType": "post | comment | user",
    "snippet": "string?",
    "...": "event-specific fields"
  },
  "status": "PENDING | PROCESSING | COMPLETED | FAILED | RATE_LIMITED | DEDUPLICATED",
  "retryCount": "number (0-5)",
  "nextRetryAt": "ISO8601 datetime?",
  "lastError": "string?",
  "dedupeKey": "string? (for aggregation)",
  "createdAt": "ISO8601 datetime",
  "processedAt": "ISO8601 datetime?"
}
```

**Indexes**:
- `status` (for timer-trigger queries)
- `retryCount` (for retry logic)
- `nextRetryAt` (for scheduled retries)
- `dedupeKey` (for deduplication checks)
- `createdAt` (for sorting)

**Queries**:
- Find pending events: `WHERE c.status = 'PENDING' OR (c.status = 'FAILED' AND c.retryCount < 5 AND c.nextRetryAt <= @now)`
- Check dedupe: `WHERE c.userId = @userId AND c.dedupeKey = @key AND c.createdAt >= @window`

---

### 2. `notifications`

**Purpose**: In-app notification list (user's notification centre)  
**Partition Key**: `/userId`  
**TTL**: 30 days (old notifications auto-expire)

**Schema**:
```json
{
  "id": "uuid-v4",
  "userId": "string (partition key)",
  "category": "SOCIAL | SAFETY | SECURITY | NEWS | MARKETING",
  "eventType": "POST_LIKE | ...",
  "title": "string (rendered)",
  "body": "string (rendered)",
  "deeplink": "asora://post/{id} | asora://user/{id} | ...",
  "targetId": "string?",
  "targetType": "post | comment | user?",
  "read": "boolean",
  "readAt": "ISO8601 datetime?",
  "dismissed": "boolean",
  "dismissedAt": "ISO8601 datetime?",
  "createdAt": "ISO8601 datetime"
}
```

**Indexes**:
- `category` (for filtering)
- `read` (for unread counts)
- `dismissed` (for filtering)
- `createdAt` (for sorting/pagination)

**Queries**:
- Unread count: `SELECT VALUE COUNT(1) FROM c WHERE c.userId = @userId AND c.read = false AND c.dismissed = false`
- Paginated list: `WHERE c.userId = @userId AND c.dismissed = false ORDER BY c.createdAt DESC`
- Rate limit check: `WHERE c.userId = @userId AND c.category = @category AND c.createdAt >= @window`

---

### 3. `notification_preferences`

**Purpose**: User notification settings  
**Partition Key**: `/userId`  
**TTL**: None (persisted indefinitely)

**Schema**:
```json
{
  "id": "userId (same as partition key)",
  "userId": "string (partition key)",
  "timezone": "string (IANA timezone, e.g., 'America/Los_Angeles')",
  "quietHours": [
    false, false, false, false, false, false, false, true, // 00-07 (7am onwards is quiet)
    true, true, true, true, true, true, true, true,         // 08-15
    true, true, true, true, true, true, false, false       // 16-23 (10pm onwards allows)
  ],
  "categories": {
    "social": true,
    "news": true,
    "marketing": true
  },
  "updatedAt": "ISO8601 datetime"
}
```

**Notes**:
- `quietHours`: 24-element boolean array (index = hour, true = quiet)
- Safety and security notifications ignore category toggles (always sent)
- Default quiet hours: 22:00-07:00 (10 PM to 7 AM)

**Indexes**: None (direct reads by userId)

**Queries**:
- Get preferences: `WHERE c.id = @userId`

---

### 4. `device_tokens`

**Purpose**: Registered device push tokens (3-device cap per user)  
**Partition Key**: `/userId`  
**TTL**: None (managed via `revokedAt`)

**Schema**:
```json
{
  "id": "uuid-v4",
  "userId": "string (partition key)",
  "deviceId": "string (client-generated UUID)",
  "pushToken": "string (FCM/APNS token)",
  "platform": "fcm | apns",
  "label": "string (e.g., 'iPhone 15 Pro')",
  "createdAt": "ISO8601 datetime",
  "lastSeenAt": "ISO8601 datetime",
  "revokedAt": "ISO8601 datetime?"
}
```

**Indexes**:
- `deviceId` (for token refresh lookups)
- `platform` (for batch operations)
- `revokedAt` (for active device filtering)
- `lastSeenAt` (for eviction logic)

**Queries**:
- Active devices: `WHERE c.userId = @userId AND c.revokedAt = null ORDER BY c.lastSeenAt DESC`
- Device cap enforcement: Query active devices, if >= 3, revoke oldest by `lastSeenAt`
- Update token: Find by `deviceId`, update `pushToken` and `lastSeenAt`

---

## Terraform Configuration

If using Terraform to provision Cosmos containers:

```hcl
resource "azurerm_cosmosdb_sql_container" "notification_events" {
  name                = "notification_events"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  database_name       = azurerm_cosmosdb_sql_database.db.name
  partition_key_path  = "/userId"
  throughput          = 400  # Or use autoscale

  default_ttl = 2592000  # 30 days in seconds

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }
}

resource "azurerm_cosmosdb_sql_container" "notifications" {
  name                = "notifications"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  database_name       = azurerm_cosmosdb_sql_database.db.name
  partition_key_path  = "/userId"
  throughput          = 400

  default_ttl = 2592000  # 30 days

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }
}

resource "azurerm_cosmosdb_sql_container" "notification_preferences" {
  name                = "notification_preferences"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  database_name       = azurerm_cosmosdb_sql_database.db.name
  partition_key_path  = "/userId"
  throughput          = 400

  # No TTL - persisted indefinitely

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }
}

resource "azurerm_cosmosdb_sql_container" "device_tokens" {
  name                = "device_tokens"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  database_name       = azurerm_cosmosdb_sql_database.db.name
  partition_key_path  = "/userId"
  throughput          = 400

  # No TTL - managed via revokedAt field

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }
}
```

## Manual Creation (Azure Portal)

If provisioning manually via Azure Portal:

1. Navigate to Cosmos DB account → Data Explorer
2. Select database (`asora` or equivalent)
3. Click "New Container"
4. For each container above:
   - Container ID: (name from schema)
   - Partition key: `/userId`
   - Throughput: 400 RU/s (or autoscale 400-4000)
   - Time to Live: 
     - `notification_events`: On (30 days)
     - `notifications`: On (30 days)
     - `notification_preferences`: Off
     - `device_tokens`: Off
   - Indexing: Default (consistent, all paths)

## RU Capacity Planning

**Estimated RU consumption per operation**:

- **Enqueue event**: ~5 RU (write to `notification_events`)
- **Process event**: ~15 RU (read event, write notification, update event, query preferences)
- **Read notifications (page)**: ~3 RU per page (20 items)
- **Mark read/dismiss**: ~5 RU per item
- **Update preferences**: ~5 RU
- **Register device**: ~10 RU (query existing, possibly revoke, create new)

**Capacity recommendations**:
- **Dev/Staging**: 400 RU/s manual (sufficient for testing)
- **Production**: 
  - Autoscale 1000-10000 RU/s for 10k-100k users
  - Monitor with Application Insights metrics
  - Scale up during peak hours (evenings, weekends)

## Data Retention

- **Events**: Auto-expire after 30 days (TTL)
- **Notifications**: Auto-expire after 30 days (TTL)
- **Preferences**: Persisted indefinitely
- **Device tokens**: Soft-delete via `revokedAt` (manual cleanup job recommended quarterly)

## Privacy & GDPR

On user deletion (DSR):
1. Delete all documents from `notification_events` WHERE userId = @userId
2. Delete all documents from `notifications` WHERE userId = @userId
3. Delete all documents from `notification_preferences` WHERE userId = @userId
4. Delete all documents from `device_tokens` WHERE userId = @userId

Implement via stored procedure or bulk delete operation.

---

**Last Updated**: November 20, 2025  
**Maintained by**: Asora Backend Team
