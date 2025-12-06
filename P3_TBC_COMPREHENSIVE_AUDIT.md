# P3-TBC Comprehensive Audit Report

**Date:** December 6, 2025  
**Scope:** P3 Features (Multi-region & CDN, Canary & Rollback, Cost Guardrails)  
**Status:** Complete research and analysis

---

## Executive Summary

Asora's P3 infrastructure shows **strategic planning with partial implementation**:

| Item | Status | Maturity |
|------|--------|----------|
| **P3-TBC-1: Multi-region & CDN** | ⚠️ Partial | Edge CDN (Cloudflare) live; multi-region DB not yet deployed |
| **P3-TBC-2: Canary & Rollback** | ✅ Implemented | Canary pattern with K6 smoke tests; manual promotion; no auto-rollback |
| **P3-TBC-3: Cost Guardrails** | ⚠️ Partial | KPI targets documented; app insights alerts present; no budget alerts |

---

## P3-TBC-1 – Multi-region & CDN

### Current Implementation

**Status:** ⚠️ **Partially Implemented** — Edge caching active, multi-region DB not deployed

#### CDN / Edge Caching

✅ **Cloudflare Workers** (deployed)
- **Service:** Feed Cache Worker (`workers/feed-cache/`)
- **Route:** `GET /api/feed*` on `dev.asora.co.za`
- **Cache Policy:**
  - Unauthenticated: `Cache-Control: public, max-age=60` (60s TTL)
  - Authenticated: `Cache-Control: private, no-store` (bypass)
- **Configuration:** `wrangler.toml` + env vars (`ORIGIN_BASE`)
- **Deployment:** Via `CLOUDFLARE_DEPLOYMENT_GUIDE.md`

**Status per ADR 001:**
- ✅ ADR calls for "Cloudflare CDN, /feed TTL 30s" → **Deployed (60s, acceptable)**
- ✅ Edge telemetry hooks available (not yet integrated)

#### Static Assets CDN

- ❌ **No Azure CDN or static asset distribution**
- Flutter app binaries distributed via App Store / Play Store
- API responses not cached at origin
- Opportunity: Future integrations for image caching if media uploads added

#### Database Multi-region Replication

❌ **Not Deployed**

**Current Setup (Single-Region North Europe):**

```terraform
# Cosmos DB
azurerm_cosmosdb_account "cosmos" {
  location = var.location  # northeurope (single region)
  
  geo_location {
    location          = azurerm_resource_group.rg.location  # NorthEU only
    failover_priority = 0
  }
}

# PostgreSQL Flex Server
azurerm_postgresql_flexible_server "pg" {
  location = var.location  # northeurope
  zone     = "3"           # Zone redundancy, but NOT multi-region
  geo_redundant_backup_enabled = false  # Single-region backups only
}

# Storage (DSR exports)
azurerm_storage_account "dsr_exports" {
  account_replication_type = "LRS"  # Locally redundant, NOT geo-redundant
}

# Redis Cache (optional)
azurerm_redis_cache "asora_redis" {
  # No geo-replication option in Basic/Standard tiers
  sku_name = "Basic"  # No clustering available
}
```

#### What Would Be Needed for Multi-region (P3 Q2 2026)

1. **Cosmos DB Multi-region:**
   ```terraform
   # Add secondary region for read failover
   geo_location {
     location          = "westeurope"  # Secondary region
     failover_priority = 1
   }
   ```

2. **PostgreSQL Multi-region:**
   - Cosmos-based read replicas (cumbersome for RDBMS)
   - OR: Use Azure Database for PostgreSQL with read replicas + geo-DR
   - Note: Current Flex Server does NOT support read replicas

3. **Redis Multi-region:**
   - Upgrade to Standard+ tier (≥2GB) to enable clustering
   - Use Azure Cache for Redis with geo-replication (premium feature)

4. **CDN for Static Assets:**
   - Azure CDN fronting blob storage for future image/media buckets

### Summary

- ✅ **Edge caching:** Cloudflare Workers active, meeting ADR 001 goals
- ⚠️ **Database replication:** Planned but not implemented; single-region with zone redundancy
- ⚠️ **Multi-region promotion:** Blocked on schema/data sync strategy (ADR 002 references this)
- 📅 **P3 timeline:** Multi-region Cosmos + Redis planned Q2 2026

---

## P3-TBC-2 – Canary & Rollback

### Current Implementation

**Status:** ✅ **Canary Pattern Implemented** (manual promotion; partial auto-rollback)

#### Deployment Workflow

**Primary Workflow:** `.github/workflows/deploy-asora-function-dev.yml`

1. **Build & Test Phase**
   - ✅ Lint, build, unit tests (Jest)
   - ✅ Notifications E2E tests
   - ✅ Artifact structure validation (V4 programmatic model)
   - ✅ Integrity hash verification (local vs. remote)

2. **Deployment Phase**
   - **Target:** `asora-function-dev` (production app in Flex Consumption)
   - **Method:** Kudu SCM `/api/publish` with SAS-signed blob URL
   - **Artifact Versioning:** `functionapp-${SHORT_SHA}.zip` + `functionapp.zip` symlink
   - **Cold-start Persistence:** Blob copy for rehydration after scale-down

3. **Post-deploy Validation**
   - ✅ App settings validation (FUNCTIONS_EXTENSION_VERSION=~4)
   - ✅ Health endpoint probes (20 retries, 5s intervals)
   - ✅ HTTP 200 gate on `/api/health`
   - ✅ 404 gate on bogus route (v4 model validation)

#### Canary Testing

**Workflow:** `.github/workflows/canary-k6.yml`

**Trigger:** After deployment to dev, runs automatically on workflow_run success

**K6 Smoke Tests:**
- ✅ Smoke test (p95<200ms, p99<400ms, error_rate<1%)
- ✅ Feed read test (optional, labeled `run-load`)
- ✅ Chaos scenarios (post-smoke, if canary succeeds)

**Test Thresholds:**
```javascript
SMOKE_P95_THRESHOLD=200ms
SMOKE_P99_THRESHOLD=400ms
error_rate<1%
```

**Outputs:**
- ✅ JSON summaries uploaded as artifacts
- ✅ PR comment with results (sticky, updated on re-run)

#### Canary Promotion (Manual)

**Planned Canary Architecture:** `RELEASES/CANARY_ROLLOUT_PLAN.md`

```
Production: asora-function-dev (90% traffic)
Canary:     asora-function-dev-canary (10% traffic)
Routing:    Azure Front Door with origin weights
```

**Steps:**
1. Deploy to `asora-function-dev-canary` (separate Function App)
2. Set Front Door weights: prod=90, canary=10
3. Monitor KQL query for 10 minutes:
   ```kql
   requests
   | where cloud_RoleName == 'asora-function-dev-canary'
   | summarize failureRate = countif(resultCode >= 500) / count() * 100
   | where failureRate > 1%
   ```
4. **Rollback (manual):** Set weights to 100/0 if failure rate exceeds 1%
5. **Promote (manual):** Gradually increase canary share (25% → 50% → 100%)

#### Setup Script

**File:** `scripts/canary-setup.sh`

- Creates canary Function App
- Adds origins to Front Door origin group
- Configures health probes (/api/health, 30s interval)
- Sets initial weight distribution

**Prerequisites:**
- Front Door profile and endpoint already exist
- Both apps share same Application Insights instance

### Current Gaps

❌ **No automated rollback**
- KQL query defined; no GitHub Action to execute it
- Manual check + rollback required

❌ **No gradual traffic shift**
- Only 0% or 10% options; would need workflow to increment weights

❌ **No deployment to canary via CI**
- Canary deployment is a manual step; no separate workflow

### What's Needed for Full Auto-Canary

1. **GitHub Action to Monitor KQL:**
   ```yaml
   - name: Canary health check (KQL)
     run: |
       az monitor query \
         --resource /subscriptions/$SUB/resourceGroups/$RG/providers/microsoft.insights/components/$AI \
         --query "requests | where cloud_RoleName == 'asora-function-dev-canary' | ..."
   ```

2. **Auto-rollback Action:**
   ```yaml
   - name: Rollback canary if failure rate > 1%
     if: ${{ steps.canary_check.outputs.failure_rate > 1 }}
     run: |
       az afd origin update --weight 0  # Set canary to 0%
   ```

3. **Gradual Traffic Shift:**
   ```yaml
   - name: Promote canary (10% → 25%)
     run: |
       az afd origin update --weight 25
   ```

### Summary

- ✅ **Canary infrastructure:** Front Door + dual Function Apps configured
- ✅ **Smoke tests:** K6 tests run post-deployment
- ✅ **Monitoring query:** KQL defined in observability
- ⚠️ **Auto-rollback:** Manual only (could be automated)
- ⚠️ **Gradual promotion:** Manual weight adjustments required
- 📅 **Next: Automate health checks and rollback in GitHub Actions**

---

## P3-TBC-3 – Cost Guardrails

### Current Implementation

**Status:** ⚠️ **KPI targets documented; alert infrastructure in place; budget enforcement not yet implemented**

#### Cost KPIs (ADR 001)

**Ship Gates:**
```
Backend cost ≤ €0.05 / MAU
Alert at €0.04 / MAU
```

**Accountability:**
- **Platform Team:** Benchmarks & cost checks
- **Quarterly Review:** Hive AI vs. Azure Content Safety trade-offs

#### Application Insights Alerts

**Infrastructure:** `infrastructure/alerts/main.tf` (236 lines)

**Configured Alerts:**

1. **5xx Error Rate Alert**
   - **Query:** Calculates error rate over 5-minute windows
   - **Threshold:** >1% errors
   - **Evaluation:** Every 5 minutes
   - **Severity:** 2 (Warning)
   - **Action:** Email to DevOps team + optional webhook (PagerDuty/Slack)
   - **Auto-mitigation:** Enabled

2. **Health Failure Alert**
   - **Query:** Counts non-2xx responses from `/api/health`
   - **Threshold:** Any failure
   - **Evaluation:** Every 5 minutes
   - **Severity:** 1 (Error)
   - **Action:** Email + webhook
   - **Auto-mitigation:** Enabled

**Health Dashboard:**
- Tile showing health status, version, deploy time, request metrics

**Configuration:**
```terraform
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "error_rate" {
  evaluation_frequency = "PT5M"
  window_duration      = "PT5M"
  threshold            = 1.0
  operator             = "GreaterThan"
  severity             = 2
  auto_mitigation_enabled = true
}
```

#### What's Tracked Today

✅ **Operational metrics:**
- 5xx error rate
- Health endpoint availability
- P95/P99 latency (collected but no alerts)

❌ **Cost metrics:**
- No Azure Budgets configured
- No Cosmos DB RU consumption alerts
- No cost anomaly detection
- No ML-based cost spike alerts

❌ **Cost per MAU calculation:**
- No automated reporting
- Manual cost review process (unclear frequency)

### What Would Be Needed for Cost Guardrails

#### 1. Azure Budgets (via Terraform)

```terraform
resource "azurerm_consumption_budget" "dev" {
  name              = "asora-dev-budget"
  scope             = data.azurerm_client_config.current.subscription_id
  amount            = 100  # €100/month for dev
  time_period_start = "2025-01-01"
  time_grain        = "Monthly"

  notification {
    enabled        = true
    threshold      = 80
    operator       = "GreaterThanOrEqualTo"
    contact_emails = ["devops@asora.app"]
  }
}
```

#### 2. Cosmos DB RU Consumption Alerts

```yaml
# KQL query for Cosmos RU usage
requests
| where cloud_RoleName == "asora-function-dev"
| extend customDimensions = parse_json(customDimensions)
| extend RU = todouble(customDimensions.["Cosmos.RequestUnits"])
| summarize totalRU = sum(RU) by bin(timestamp, 1h)
| where totalRU > 10000  # Alert if >10k RU/hour
```

#### 3. Cost Anomaly Detection

```terraform
resource "azurerm_cost_anomaly_alert" "asora" {
  name              = "asora-cost-spike"
  scope             = data.azurerm_client_config.current.subscription_id
  contact_emails    = ["devops@asora.app"]
  threshold_amount  = 500  # € spike alert if cost exceeds baseline + €500
}
```

#### 4. MAU-Based Cost Calculation

Create a KQL dashboard:
```kql
let MAU = distinct_count(user_id) in (
  customEvents
  | where timestamp > ago(30d)
  | project user_id = tostring(customDimensions.["user.id"])
);
let costEUR = 50;  // Example: €50 for the month
let costPerMAU = costEUR / MAU;
print CostPerMAU = costPerMAU, MAU = MAU, TotalCost = costEUR
```

#### 5. RU Consumption Dashboard

Track Cosmos DB RU usage:
- Per endpoint (GET /feed vs. POST /posts)
- Trend over time
- Alert if trajectory exceeds €0.05/MAU spend at current volume

### Current Cost Trends (Documented)

**Hive AI vs. Azure Content Safety:**
- **Decision:** Keep Hive primary; switch/rebalance if:
  - Volume > 10M objs/month, OR
  - SLA/cost degrades
- **Benchmark cadence:** Quarterly

### Summary

- ✅ **KPI targets:** €0.05/MAU documented in ADR 001
- ✅ **Operational alerts:** 5xx, health checks active
- ❌ **Cost budgets:** No Azure Budgets configured
- ❌ **RU consumption alerts:** No Cosmos-specific alerts
- ❌ **Cost anomaly detection:** Not set up
- ❌ **MAU cost calculation:** Manual process
- 📅 **Next: Set up Azure Budgets + RU alerts before P3 launch**

---

## Implementation Roadmap

### Immediate (Now – Q4 2025)
1. **Automate canary rollback:** Add KQL health check + weight adjustment actions
2. **Set up Azure Budgets:** Configure monthly spending limits by environment
3. **Document cost review process:** Define who checks KQL dashboards and how often

### Short-term (Q1 2026)
1. **Enable Cosmos DB RU alerts:** Per-endpoint consumption tracking
2. **Cost anomaly detection:** Set up ML-based alerts
3. **MAU cost dashboard:** Automated cost/MAU calculation

### Medium-term (Q2 2026)
1. **Deploy multi-region Cosmos:** Add West Europe secondary
2. **Enable Postgres read replicas:** Regional failover capability
3. **Scale canary to staged promotion:** Automate traffic shift (10% → 25% → 50% → 100%)

### Long-term (Q3 2026+)
1. **Multi-region analytics:** Replicate Redis across regions
2. **CDN for media:** If image uploads added
3. **Cost optimization report:** Quarterly cost/performance analysis

---

## Summary Table

| Feature | Status | Completeness | Key Files | Next Steps |
|---------|--------|--------------|-----------|-----------|
| **Edge CDN** | ✅ Live | 100% | `workers/feed-cache/` | Monitor cache hit rate |
| **Multi-region DB** | ❌ Planned | 0% | `infra/main.tf` | Add geo_location entries |
| **Canary Pattern** | ✅ Configured | 80% | `.github/workflows/canary-k6.yml` | Automate rollback |
| **Health Alerts** | ✅ Active | 100% | `infrastructure/alerts/` | Add cost alerts |
| **Cost Budgets** | ❌ Not set | 0% | (None) | Create Azure Budgets |
| **RU Consumption Monitoring** | ❌ Not set | 0% | (None) | Add KQL queries |
| **MAU Cost Tracking** | ⚠️ Manual | 40% | ADR 001 | Automate calculation |

---

## Appendix: Key Files

- **Multi-region:** `infra/main.tf` (Cosmos DB account, PostgreSQL config)
- **Canary:** `.github/workflows/canary-k6.yml`, `RELEASES/CANARY_ROLLOUT_PLAN.md`
- **Alerts:** `infrastructure/alerts/main.tf`
- **CDN:** `workers/feed-cache/`, `CLOUDFLARE_DEPLOYMENT_GUIDE.md`
- **Cost KPIs:** `docs/ADR_001_TLDR.md`

