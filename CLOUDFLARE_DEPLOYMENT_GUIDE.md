# Cloudflare Edge Worker Deployment Guide

## Prerequisites

1. **Cloudflare Account**: Ensure you have a Cloudflare account with the domain configured
2. **Wrangler CLI**: Install Cloudflare Workers CLI
   ```bash
   npm install -g wrangler
   ```
3. **Authentication**: Authenticate with Cloudflare
   ```bash
   wrangler login
   ```

## Deployment Steps

### 1. Navigate to Worker Directory
```bash
cd infra/cloudflare
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Edit `wrangler.toml` to set your environment variables:

```toml
[env.production.vars]
TELEMETRY_ENDPOINT = "https://your-function-app.azurewebsites.net/api/edge/log"
TELEMETRY_SECRET = "your-edge-telemetry-secret"

[env.development.vars]
TELEMETRY_ENDPOINT = "http://localhost:7072/api/edge/log"
TELEMETRY_SECRET = "dev-secret"
```

### 4. Deploy Worker
```bash
# For development
wrangler deploy --env development

# For production
wrangler deploy --env production
```

### 5. Configure DNS and Routes

#### Option A: Subdomain (Recommended for testing)
1. In Cloudflare Dashboard → DNS → Records
2. Add CNAME record:
   - **Name**: `api-cache` (or preferred subdomain)
   - **Target**: Your Azure Function App hostname
   - **Proxy status**: Proxied (orange cloud)

3. In Workers → Triggers → Routes:
   - Add route: `api-cache.yourdomain.com/api/feed/get`
   - Select your deployed worker

#### Option B: Path-based routing (Production)
1. In Workers → Triggers → Routes:
   - Add route: `yourdomain.com/api/feed/get`
   - Select your deployed worker

### 6. Test Edge Caching

#### Anonymous Request (Should cache)
```bash
curl -H "Accept: application/json" \
     "https://api-cache.yourdomain.com/api/feed/get?telemetry=1"
```

Expected response headers:
```
cache-control: public, s-maxage=30, stale-while-revalidate=60
cf-cache-status: MISS (first request) / HIT (subsequent requests)
x-cache-backend: edge
```

#### Authenticated Request (Should bypass cache)
```bash
curl -H "Accept: application/json" \
     -H "Authorization: Bearer your-jwt-token" \
     "https://api-cache.yourdomain.com/api/feed/get"
```

Expected response headers:
```
cache-control: private, no-store, must-revalidate
cf-cache-status: DYNAMIC
x-cache-backend: none
```

## Monitoring and Debugging

### 1. Worker Analytics
- View metrics in Cloudflare Dashboard → Workers & Pages → Your Worker → Metrics
- Monitor requests, errors, CPU time, and cache hit rates

### 2. Telemetry Verification
Check Azure Application Insights for telemetry events:
```kql
traces
| where message contains "Edge cache"
| where timestamp > ago(1h)
| order by timestamp desc
```

### 3. Real-time Logs
```bash
wrangler tail --env production
```

## Environment Configuration

### Development Environment
```toml
[env.development]
name = "asora-edge-cache-dev"
routes = ["dev.yourdomain.com/api/feed/get"]
```

### Production Environment
```toml
[env.production]
name = "asora-edge-cache-prod"
routes = ["yourdomain.com/api/feed/get", "www.yourdomain.com/api/feed/get"]
```

## Security Notes

1. **TELEMETRY_SECRET**: Use a strong, unique secret for production
2. **Origin Verification**: The worker validates requests before forwarding to origin
3. **Authentication Bypass**: Authenticated requests always bypass edge cache
4. **Rate Limiting**: Consider implementing rate limiting in the worker if needed

## Performance Optimization

### Cache Settings
- **TTL**: 30 seconds (configured in worker)
- **Stale-while-revalidate**: 60 seconds
- **Cache Key**: Includes page, limit, type, filter parameters

### Cache Purging
To purge cache for specific feed endpoints:
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
     -H "Authorization: Bearer YOUR_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"files":["https://yourdomain.com/api/feed/get"]}'
```

## Troubleshooting

### Common Issues

1. **Worker not responding**: Check route configuration and DNS settings
2. **Cache not working**: Verify anonymous requests and check CF-Cache-Status header
3. **Authenticated requests cached**: Review authentication detection logic
4. **Telemetry not working**: Verify TELEMETRY_SECRET and endpoint URL

### Debug Headers
Add debug information by including `?telemetry=1` in requests to see:
- Cache status
- Authentication state
- Performance metrics
- Error details

---

## Rollback Strategy

If issues arise, immediately:

1. **Disable Worker**: Remove routes in Cloudflare Dashboard
2. **Fallback to Redis**: Set `FEED_CACHE_BACKEND=redis` in Function App
3. **Disable All Caching**: Set `FEED_CACHE_BACKEND=none` for immediate fallback
4. **Monitor**: Check Application Insights for error patterns

The feature flag system allows instant rollback without code deployment.
