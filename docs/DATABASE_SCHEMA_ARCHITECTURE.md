# Database Schema Architecture Documentation

## Overview

Asora implements a **dual-store architecture** with PostgreSQL as the canonical source of truth and Azure Cosmos DB as the projection/performance layer.

## Architecture Decisions

### PostgreSQL (Canonical Store)
- **Purpose**: Authoritative data store with ACID guarantees
- **Extensions**: `pgcrypto` for UUID generation, `citext` for case-insensitive emails
- **Primary Keys**: All tables use `UUID` primary keys generated with `gen_random_uuid()`
- **Row Level Security**: Enabled for users, profiles, and admin tables

### Azure Cosmos DB (Projections)
- **Purpose**: High-performance read projections and real-time feeds
- **Consistency**: Session consistency for balance of performance and correctness
- **Partition Strategy**: Single-partition queries optimized with composite indexes
- **TTL Policies**: Automatic cleanup for notifications (30d) and counters (90d)

## Container Design

### 1. posts_v2
- **Partition Key**: `/postId`
- **Purpose**: Post content with engagement metrics
- **Change Feed**: Triggers userFeed fan-out and counter updates
- **Indexes**: Author queries, status filtering, content discovery

### 2. userFeed  
- **Partition Key**: `/recipientId`
- **Purpose**: Personalized feed items for each user
- **Query Pattern**: Single-partition reads with `LIMIT 50`
- **Composite Index**: `recipientId ASC, createdAt DESC` for chronological feeds

### 3. reactions
- **Partition Key**: `/postId` 
- **Purpose**: User reactions (likes, hearts, etc.) grouped by post
- **Change Feed**: Updates reaction counters atomically
- **Composite Index**: `postId ASC, type ASC, createdAt DESC`

### 4. notifications
- **Partition Key**: `/recipientId`
- **Purpose**: User notifications with read/unread state
- **TTL**: 30 days automatic cleanup
- **Composite Index**: `recipientId ASC, read ASC, createdAt DESC`

### 5. counters
- **Partition Key**: `/subjectId`
- **Purpose**: Aggregated counts (likes, follows, etc.)
- **TTL**: 90 days for cache invalidation
- **Idempotent IDs**: `${postId}:likes`, `${userId}:followers`

### 6. publicProfiles
- **Partition Key**: `/userId`
- **Purpose**: Public profile projections for discovery
- **Source**: Synchronized from PostgreSQL profiles table
- **Index Exclusions**: Bio content excluded for performance

## Data Flow Patterns

### 1. Post Creation (Dual-Write)
```
1. Write to PostgreSQL posts table → Outbox event
2. Write to Cosmos posts_v2 container  
3. Change feed triggers userFeed fan-out
4. Outbox consumer mirrors to posts_admin_mirror
```

### 2. User Interactions (Event-Driven)
```
1. User action → PostgreSQL canonical update
2. Outbox event emission
3. Outbox consumer → Cosmos projection update
4. Change feed → Counter/notification updates
```

### 3. Feed Generation (Single-Partition)
```
1. Query userFeed with recipientId partition key
2. ORDER BY createdAt DESC LIMIT 50
3. Return chronological feed items
```

## Idempotency Patterns

### Change Feed Processors
- **Deterministic IDs**: `${recipientId}:${postId}` for userFeed items
- **Upsert Operations**: All writes use `upsert()` to handle replays
- **Counter Updates**: `${postId}:likes` format prevents duplicate counts

### Outbox Processing  
- **Unique Constraints**: Prevent duplicate event emission
- **FOR UPDATE SKIP LOCKED**: Concurrent worker safety
- **Exponential Backoff**: Failed events retry with `60s * 2^retry_count`

## Security & Compliance

### Row Level Security (RLS)
- **User Isolation**: Users can only access their own data
- **Profile Privacy**: Public profiles readable, own profile editable
- **Admin Separation**: Admin mirror tables restricted to admin role

### Data Constraints
- **Provider Validation**: Auth providers restricted to allowed list
- **Content Limits**: Display names (50 chars), bio (500 chars)
- **Relationship Integrity**: Prevent self-follows/blocks/mutes
- **Status Validation**: Moderation and appeal statuses constrained

## Performance Optimizations

### Composite Indexes
```sql
-- Feed queries
(recipientId ASC, createdAt DESC)

-- Post discovery  
(authorId ASC, createdAt DESC)
(status ASC, createdAt DESC)

-- Reaction aggregation
(postId ASC, type ASC, createdAt DESC)

-- Notification filtering
(recipientId ASC, read ASC, createdAt DESC)
```

### TTL Policies
- **Notifications**: 30 days (2,592,000 seconds)
- **Counters**: 90 days (7,776,000 seconds)
- **Benefits**: Automatic cleanup, storage cost reduction

## Migration Strategy

### Phase 1: Schema Creation
```bash
psql -f database/migrate_to_target_schema.sql
```

### Phase 2: Cosmos Provisioning
```bash
./database/create_cosmos_containers.sh
./database/update-cosmos-indexes.sh
```

### Phase 3: Application Updates
- Deploy dual-write post creation
- Start change feed processors
- Enable outbox consumers

## Monitoring & Observability

### Key Metrics
- **Outbox Lag**: Time between event creation and processing
- **Change Feed Delay**: Cosmos change propagation latency  
- **RU Consumption**: Cosmos request units per operation
- **PostgreSQL Connections**: Connection pool utilization

### Health Checks
- Outbox pending/failed event counts
- Change feed processor status
- Cosmos container throughput
- PostgreSQL replication lag

## Operational Runbooks

### Outbox Backlog Recovery
```sql
-- Check pending events
SELECT COUNT(*) FROM outbox WHERE processed_at IS NULL;

-- Reset failed events
UPDATE outbox SET retry_count = 0, next_retry_at = NOW() 
WHERE retry_count >= max_retries;
```

### Cosmos Feed Rebuild
```typescript
// Trigger full userFeed regeneration
await regenerateUserFeed(userId);
```

### Schema Drift Detection
```bash
# Compare live schema with migration
npm run schema:verify
```

## Future Considerations

### Horizontal Scaling
- PostgreSQL read replicas for reporting
- Cosmos multi-region replication
- Change feed processor sharding

### Data Archival
- Cold storage for old posts (>1 year)
- Compressed audit log archival
- User data export compliance

### Performance Tuning
- Cosmos autoscale policies
- PostgreSQL query optimization
- Connection pooling refinement

---

**Last Updated**: September 22, 2025  
**Schema Version**: v2.0 (PostgreSQL canonical + Cosmos projections)  
**Migration Status**: Ready for production deployment