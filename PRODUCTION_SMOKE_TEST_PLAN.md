# 🧪 Asora Production Deployment Smoke Test Plan

## Pre-Deployment Checklist
- [ ] All secrets are in Azure Key Vault (not in app settings)
- [ ] Function App has system-assigned managed identity
- [ ] Application Insights is configured and connected
- [ ] HTTPS is enforced on Function App
- [ ] CORS is configured for production domains only
- [ ] Database firewall rules are properly configured

## 🚀 Post-Deployment Smoke Tests

### 1. **Health Check Tests**
```bash
# Test 1: Function App is responding
curl -f https://asora-functions-production.azurewebsites.net/api/health

# Test 2: Application Insights is receiving telemetry
# Check Azure Portal -> Application Insights -> Live Metrics
```

### 2. **Authentication Tests**
```bash
# Test 3: Email authentication endpoint
curl -X POST https://asora-functions-production.azurewebsites.net/api/authEmail \
  -H "Content-Type: application/json" \
  -d '{"email": "test@asora.app", "password": "testpass123"}'

# Expected: 200 OK with JWT token
# Expected: Token should be valid for 24 hours

# Test 4: Protected endpoint with valid token
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  https://asora-functions-production.azurewebsites.net/api/getMe

# Expected: 200 OK with user data
```

### 3. **Database Connectivity Tests**
```bash
# Test 5: PostgreSQL connection (via function)
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  https://asora-functions-production.azurewebsites.net/api/getUserAuth

# Expected: 200 OK with user data from PostgreSQL

# Test 6: Cosmos DB connection (via posts API)
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  https://asora-functions-production.azurewebsites.net/api/feed/getFeedPosts?page=1

# Expected: 200 OK with feed data from Cosmos DB
```

### 4. **Feed & Content Tests**
```bash
# Test 7: Create a new post
curl -X POST https://asora-functions-production.azurewebsites.net/api/post/create \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Smoke Test Post",
    "content": "This is a test post for production deployment",
    "tags": ["test", "deployment"]
  }'

# Expected: 201 Created with post ID

# Test 8: Retrieve the created post
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  https://asora-functions-production.azurewebsites.net/api/post/get/<POST_ID>

# Expected: 200 OK with post data
```

### 5. **Moderation & Safety Tests**
```bash
# Test 9: Content moderation (Hive AI integration)
curl -X POST https://asora-functions-production.azurewebsites.net/api/moderation/flagContent \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "<POST_ID>",
    "reason": "spam",
    "details": "Testing moderation workflow"
  }'

# Expected: 200 OK with flag ID

# Test 10: Appeal submission
curl -X POST https://asora-functions-production.azurewebsites.net/api/moderation/submitAppeal \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "flagId": "<FLAG_ID>",
    "reason": "This was a legitimate test post"
  }'

# Expected: 201 Created with appeal ID
```

### 6. **Voting System Tests**
```bash
# Test 11: Vote on content
curl -X POST https://asora-functions-production.azurewebsites.net/api/vote \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "<POST_ID>",
    "voteType": "upvote"
  }'

# Expected: 200 OK with vote confirmation
```

### 7. **Monitoring & Observability Tests**
```bash
# Test 12: Check Application Insights telemetry
# Navigate to Azure Portal -> Application Insights -> Logs
# Run query:
# requests 
# | where timestamp > ago(5m)
# | summarize count() by name
# | order by count_ desc

# Expected: See recent API calls logged

# Test 13: Check custom OpenTelemetry spans
# traces
# | where timestamp > ago(5m)
# | where customDimensions.SpanKind == "Server"
# | project timestamp, name, duration

# Expected: See detailed operation traces
```

## 🔍 Critical Error Monitoring

### Watch for these issues:
1. **500 errors** - Check Application Insights for exceptions
2. **Key Vault access denied** - Verify managed identity permissions
3. **Database connection timeouts** - Check firewall rules and connection strings
4. **JWT validation failures** - Verify Key Vault secret retrieval
5. **Hive AI API failures** - Check API key configuration and rate limits

## 📊 Performance Baselines

### Expected Response Times (P95):
- `/api/authEmail`: < 2000ms
- `/api/getMe`: < 500ms
- `/api/feed/getFeedPosts`: < 1000ms
- `/api/post/create`: < 1500ms
- `/api/moderation/*`: < 2000ms

### Expected Throughput:
- 100 concurrent requests should complete successfully
- No memory leaks over 1-hour sustained load
- Error rate < 1% under normal load

## 🚨 Rollback Triggers

Initiate rollback if:
- Error rate > 5% for 5 minutes
- Response time P95 > 5 seconds for 5 minutes
- Any authentication endpoints return 500 errors
- Database connectivity issues affecting > 50% of requests
- Key Vault access failures

## 📝 Post-Test Validation

After successful smoke tests:
- [ ] All endpoints respond within acceptable time limits
- [ ] Authentication flow works end-to-end
- [ ] Database operations complete successfully
- [ ] Application Insights shows healthy telemetry
- [ ] No critical errors in logs
- [ ] Security headers are present in responses
- [ ] HTTPS is enforced
- [ ] Rate limiting works as expected
