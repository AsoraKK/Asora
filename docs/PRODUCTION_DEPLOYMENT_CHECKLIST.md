# Production Deployment Checklist

## Pre-Deployment Verification

### Database Schema
- [ ] **PostgreSQL Migration**: Run `psql -f database/migrate_to_target_schema.sql`
- [ ] **Schema Verification**: Execute `./database/verify-schema.sh` 
- [ ] **Extensions Check**: Confirm `pgcrypto` and `citext` extensions installed
- [ ] **RLS Validation**: Verify Row Level Security enabled on security tables
- [ ] **Constraints Check**: Validate unique constraints and check constraints applied

### Cosmos DB Setup
- [ ] **Container Provisioning**: Run `./database/create_cosmos_containers.sh`
- [ ] **Indexing Policies**: Execute `./database/update-cosmos-indexes.sh`
- [ ] **TTL Configuration**: Verify 30d/90d TTL on notifications/counters
- [ ] **Throughput Settings**: Configure appropriate RU/s for expected load
- [ ] **Consistency Level**: Confirm Session consistency configured

### Application Configuration
- [ ] **Environment Variables**: Set all required env vars (DATABASE_URL, COSMOS_ENDPOINT, COSMOS_KEY)
- [ ] **Connection Strings**: Validate PostgreSQL and Cosmos DB connectivity
- [ ] **Retry Configuration**: Confirm Cosmos retry policies configured
- [ ] **Function App Settings**: Update Azure Functions with latest config

## Deployment Steps

### 1. Database Migration
```bash
# Backup existing database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration
psql $DATABASE_URL -f database/migrate_to_target_schema.sql

# Verify schema
./database/verify-schema.sh
```

### 2. Cosmos DB Setup
```bash
# Set environment variables
export COSMOS_ACCOUNT_NAME="your-cosmos-account"

# Create containers
./database/create_cosmos_containers.sh

# Apply indexing policies
./database/update-cosmos-indexes.sh
```

### 3. Application Deployment
```bash
# Deploy Azure Functions
npm run deploy

# Verify health endpoints
curl https://your-function-app.azurewebsites.net/api/health
```

### 4. Start Background Processors
- [ ] **Change Feed Processors**: Start posts_v2 and reactions change feeds
- [ ] **Outbox Consumer**: Enable PostgreSQL → Cosmos synchronization
- [ ] **Health Monitoring**: Verify all processors running and healthy

## Post-Deployment Validation

### Functional Testing
- [ ] **User Registration**: Test complete auth flow with new UUID schema
- [ ] **Post Creation**: Verify dual-write to PostgreSQL + Cosmos works
- [ ] **Feed Generation**: Confirm userFeed queries return expected results
- [ ] **Reactions**: Test like/unlike with proper counter updates
- [ ] **Profile Updates**: Verify PostgreSQL → Cosmos projection sync

### Performance Testing
- [ ] **Feed Queries**: Measure userFeed query latency (<100ms target)
- [ ] **Post Creation**: Verify dual-write latency acceptable (<500ms)
- [ ] **Change Feed Lag**: Monitor event propagation delay (<5s target)
- [ ] **Outbox Processing**: Check event processing throughput

### Data Integrity
- [ ] **Idempotency**: Test duplicate event handling
- [ ] **Consistency**: Verify PostgreSQL ↔ Cosmos data alignment
- [ ] **TTL Cleanup**: Confirm automatic cleanup of expired data
- [ ] **Error Handling**: Test failure scenarios and recovery

## Monitoring Setup

### Key Metrics
- [ ] **Outbox Lag**: Alert if unprocessed events > 1000 or age > 5 minutes
- [ ] **Change Feed Delay**: Alert if propagation delay > 30 seconds
- [ ] **RU Consumption**: Monitor Cosmos DB request units and throttling
- [ ] **Database Connections**: Track PostgreSQL connection pool utilization
- [ ] **Error Rates**: Monitor function failures and retry patterns

### Alerts Configuration
```json
{
  "outboxLag": {
    "threshold": 1000,
    "window": "5m"
  },
  "changeFeedDelay": {
    "threshold": "30s",
    "window": "1m"
  },
  "ruThrottling": {
    "threshold": 1,
    "window": "1m"
  }
}
```

### Dashboard Metrics
- [ ] Requests per second by endpoint
- [ ] Average response time trends
- [ ] Database query performance
- [ ] Error rate percentages
- [ ] Background processor health

## Rollback Plan

### Quick Rollback (Application Only)
```bash
# Revert to previous function app deployment
az functionapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $FUNCTION_APP_NAME \
  --src previous-deployment.zip
```

### Database Rollback (If Required)
```bash
# Restore from backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# Clean up new Cosmos containers
az cosmosdb sql container delete --account-name $ACCOUNT --database-name $DB --name posts_v2
# ... repeat for other containers
```

### Rollback Criteria
- [ ] Error rate > 5% for 5+ minutes
- [ ] Response time degradation > 50%
- [ ] Data consistency issues detected
- [ ] Critical functionality broken

## Security Validation

### Access Controls
- [ ] **RLS Policies**: Test user data isolation
- [ ] **API Authentication**: Verify JWT validation working
- [ ] **Admin Endpoints**: Confirm admin-only access enforced
- [ ] **CORS Configuration**: Validate allowed origins

### Data Protection
- [ ] **PII Handling**: Verify proper data masking in logs
- [ ] **Encryption**: Confirm data encrypted at rest and in transit
- [ ] **Audit Logging**: Test audit trail capture
- [ ] **Backup Security**: Verify backup encryption

## Performance Benchmarks

### Target SLAs
- [ ] **Feed Queries**: <100ms p95 latency
- [ ] **Post Creation**: <500ms p95 latency  
- [ ] **User Registration**: <1s p95 latency
- [ ] **Profile Updates**: <200ms p95 latency
- [ ] **API Availability**: >99.9% uptime

### Load Testing Results
- [ ] Concurrent users supported: ___
- [ ] Requests per second capacity: ___
- [ ] Database connection scaling: ___
- [ ] Cosmos RU consumption under load: ___

## Sign-off

### Technical Lead Approval
- [ ] **Architecture Review**: Schema design approved
- [ ] **Code Review**: All changes reviewed and merged
- [ ] **Testing**: Integration tests passing
- [ ] **Documentation**: Architecture docs updated

### Operations Approval  
- [ ] **Monitoring**: Alerts and dashboards configured
- [ ] **Runbooks**: Operational procedures documented
- [ ] **Backup**: Recovery procedures tested
- [ ] **Support**: Team trained on new architecture

### Final Go/No-Go Decision
- [ ] **All critical items completed**
- [ ] **No blocking issues identified**
- [ ] **Rollback plan confirmed**
- [ ] **Support team ready**

---

**Deployment Date**: ___________  
**Deployed By**: ___________  
**Approved By**: ___________  
**Rollback Deadline**: ___________ (typically 24h post-deployment)